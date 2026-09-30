import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { useAnime } from './AnimeContext';
import { useAlert } from './AlertContext';
import { useLanguage } from './LanguageContext';

interface GoogleSyncContextType {
  isLoggedIn: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  login: () => void;
  logout: () => void;
  syncToDrive: () => Promise<void>;
  restoreFromDrive: () => Promise<void>;
  accessToken: string | null;
  // 取得有效的 access token，過期時會自動在背景續期
  getAccessToken: () => Promise<string>;
  isAutoSyncEnabled: boolean;
  toggleAutoSync: () => void;
  hasDrivePermission: boolean;
}

const GoogleSyncContext = createContext<GoogleSyncContextType | undefined>(undefined);

const TOKEN_KEY = 'google_access_token';
const EXPIRES_KEY = 'google_token_expires_at';
// access token 只有 1 小時，但只要 refresh token 有效就視為登入中
const SIGNED_IN_KEY = 'google_signed_in';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
// 提前 1 分鐘視為過期，避免請求途中失效
const EXPIRY_MARGIN_MS = 60 * 1000;

// 代表登入授權已確定失效 (需要重新登入)，與網路錯誤等暫時性失敗區分
class AuthError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

const readValidToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = parseInt(localStorage.getItem(EXPIRES_KEY) || '0', 10);
  return token && Date.now() < expiresAt - EXPIRY_MARGIN_MS ? token : null;
};

export const GoogleSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(readValidToken);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    () => localStorage.getItem(SIGNED_IN_KEY) === 'true' || !!readValidToken()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('google_last_sync'));
  const [hasDrivePermission, setHasDrivePermission] = useState<boolean>(() => {
    return localStorage.getItem('google_drive_permission_denied') !== 'true';
  });

  const {
    watchedList,
    planToWatchList,
    customAnimeList,
    corrections,
    handleImport,
    handleImportPlan,
    handleImportCustomAnime,
    handleImportCorrections
  } = useAnime();

  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('google_auto_sync_enabled');
    return saved !== 'false';
  });

  const toggleAutoSync = () => {
    setIsAutoSyncEnabled(prev => {
      const next = !prev;
      localStorage.setItem('google_auto_sync_enabled', next.toString());
      return next;
    });
  };

  const nativeInitRef = useRef<Promise<void> | null>(null);
  const ensureNativeInit = () => {
    if (!nativeInitRef.current) {
      nativeInitRef.current = GoogleAuth.initialize({
        clientId: '991277845771-ufce34uqpao8gagli41chv14d4t1m2jc.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.file'],
        grantOfflineAccess: true,
      });
    }
    return nativeInitRef.current;
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) ensureNativeInit();
  }, []);

  const storeToken = (token: string, expiresInSec = 3600) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRES_KEY, (Date.now() + expiresInSec * 1000).toString());
    localStorage.setItem(SIGNED_IN_KEY, 'true');
    setAccessToken(token);
    setIsLoggedIn(true);
  };

  // 只清除本機登入狀態 (不呼叫 Google)
  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(SIGNED_IN_KEY);
    localStorage.removeItem('google_drive_permission_denied');
    setAccessToken(null);
    setIsLoggedIn(false);
    setHasDrivePermission(true);
  };

  const applyGrantedScope = (scope: string | undefined) => {
    if (!scope || !scope.includes('drive')) {
      setHasDrivePermission(false);
      localStorage.setItem('google_drive_permission_denied', 'true');
      showAlert(t('permissionWarningMsg'), t('permissionWarningTitle'));
    } else {
      setHasDrivePermission(true);
      localStorage.removeItem('google_drive_permission_denied');
    }
  };

  // 背景續期：App 端透過系統 Google 帳號，Web 端透過 Cloudflare Function 以 refresh token 換新
  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const refreshAccessToken = () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        if (Capacitor.isNativePlatform()) {
          await ensureNativeInit();
          try {
            const auth = await GoogleAuth.refresh();
            if (!auth.accessToken) throw new AuthError();
            storeToken(auth.accessToken);
            return auth.accessToken;
          } catch (error) {
            if (error instanceof AuthError) throw error;
            const message = error instanceof Error ? error.message : String(error);
            if (message.toLowerCase().includes('not logged in')) throw new AuthError();
            throw error;
          }
        }

        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
        if (res.status === 401) throw new AuthError();
        if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
        const data = await res.json();
        storeToken(data.access_token, data.expires_in);
        return data.access_token as string;
      })().finally(() => {
        refreshPromiseRef.current = null;
      });
    }
    return refreshPromiseRef.current;
  };

  const getAccessToken = async (forceRefresh = false): Promise<string> => {
    const cached = forceRefresh ? null : readValidToken();
    if (cached) return cached;
    try {
      return await refreshAccessToken();
    } catch (error) {
      // 授權確定失效才登出；網路錯誤等暫時性問題保留登入狀態，下次再試
      if (error instanceof AuthError) clearSession();
      throw error;
    }
  };

  // 呼叫 Google API：遇到 401 先強制續期重試一次，仍失敗才視為登入失效
  const authorizedFetch = async (url: string, init: RequestInit = {}) => {
    const withAuth = (token: string) => ({
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    });
    let res = await fetch(url, withAuth(await getAccessToken()));
    if (res.status === 401) {
      res = await fetch(url, withAuth(await getAccessToken(true)));
      if (res.status === 401) {
        clearSession();
        throw new AuthError();
      }
    }
    return res;
  };

  const webLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: DRIVE_SCOPES,
    onSuccess: async ({ code }) => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/auth/exchange', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (res.status === 409) {
          // 舊版授權拿不到 refresh token，伺服器已重設授權，請使用者再登入一次
          showAlert(t('loginRetryAlert'), t('warning'));
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) {
          throw new Error(data.error_description || data.error || `HTTP ${res.status}`);
        }
        applyGrantedScope(data.scope);
        storeToken(data.access_token, data.expires_in);
        setTimeout(() => restoreFlow(), 500);
      } catch (error) {
        console.error('Token exchange failed:', error);
        showAlert(`網頁登入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 'warning');
      } finally {
        setIsSyncing(false);
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      showAlert(`網頁登入失敗: ${error?.error_description || error?.error || '未知錯誤'}`, 'warning');
    }
  });

  const login = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await ensureNativeInit();
        const user = await GoogleAuth.signIn();
        const token = user.authentication.accessToken;

        if (token) {
          try {
            const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
            if (infoRes.ok) {
              const info = await infoRes.json();
              applyGrantedScope(info.scope);
            }
          } catch (e) {
             console.error('Failed to check token scopes', e);
          }
        }

        // Google access token 效期為 1 小時，過期後由 GoogleAuth.refresh() 自動續期
        storeToken(token);
        setTimeout(() => restoreFlow(), 500);
      } catch (error: any) {
        console.error('Native Google Login Failed:', error);
        const errMsg = String(error.message || error.error || error).toLowerCase();
        if (errMsg.includes('cancel') || errMsg.includes('12501')) {
           return; // 使用者取消登入，不跳出警告
        }
        showAlert(`登入失敗，請確認您已在 Google Play Console 註冊您的憑證指紋 (SHA-1)。詳細錯誤: ${error.message || JSON.stringify(error)}`, 'warning');
      }
    } else {
      webLogin();
    }
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut().catch(console.error);
    } else {
      googleLogout();
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(console.error);
    }
    clearSession();
  };

  const updateSyncTime = () => {
    const now = new Date();
    const time = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setLastSyncTime(time);
    localStorage.setItem('google_last_sync', time);
  };

  // 尋找備份檔案
  const findBackupFile = async () => {
    const res = await authorizedFetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="backup.json"');
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  };

  const syncToDrive = async (isAutoSync = false) => {
    if (!isLoggedIn) return;
    setIsSyncing(true);
    try {
      let fileId = await findBackupFile();

      // 準備要上傳的資料
      const backupData = JSON.stringify({
        watchedList,
        planToWatchList,
        customAnimeList,
        corrections,
        admobMeta: {
          isNotNewUser: localStorage.getItem('admob_is_not_new_user') === 'true',
          reviewCount: parseInt(localStorage.getItem('admob_review_count') || '0', 10),
          exportCount: parseInt(localStorage.getItem('admob_export_count') || '0', 10)
        }
      });

      if (!fileId) {
        // 檔案不存在，先建立 Metadata
        const metaRes = await authorizedFetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'backup.json', parents: ['appDataFolder'] })
        });
        const metaData = await metaRes.json();
        fileId = metaData.id;
      }

      // 更新檔案內容 (PATCH media)
      const uploadRes = await authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: backupData
      });

      if (uploadRes.ok) {
        updateSyncTime();
        if (!isAutoSync) showAlert(t('syncSuccessAlert'));
      } else {
        throw new Error('Upload failed');
      }

    } catch (error: any) {
      console.error('Sync Error:', error);
      if (!(error instanceof AuthError)) {
        if (!isAutoSync) showAlert(t('syncFailedAlert'), t('warning'));
      } else {
        if (!isAutoSync) showAlert(t('loginExpiredAlert'), t('warning'));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 保持 syncToDrive 最新版本的參照，避免自動備份的防抖 effect 需要把它列為依賴 (那會導致每次 render 都重設計時器)
  const syncToDriveRef = useRef(syncToDrive);
  useEffect(() => {
    syncToDriveRef.current = syncToDrive;
  });

  // 開啟 App 時若 access token 已過期但仍在登入狀態，先在背景續期
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  });
  useEffect(() => {
    if (isLoggedIn && !readValidToken()) {
      getAccessTokenRef.current().catch(err => console.warn('Background token refresh failed:', err));
    }
  }, [isLoggedIn]);

  // 自動備份機制
  useEffect(() => {
    if (!isLoggedIn || !isAutoSyncEnabled) return;

    // 使用 setTimeout 進行防抖 (debounce)，避免頻繁變動時連續觸發 API
    const timer = setTimeout(() => {
      // 偷偷進行備份 (傳入 isAutoSync = true)
      syncToDriveRef.current(true).catch(err => console.error('Auto sync failed:', err));
    }, 5000);

    return () => clearTimeout(timer);
  }, [watchedList, planToWatchList, customAnimeList, corrections, isLoggedIn, isAutoSyncEnabled]);

  const restoreFlow = async () => {
    setIsSyncing(true);
    try {
      const fileId = await findBackupFile();
      if (!fileId) {
        console.log("No backup found on drive.");
        return;
      }

      const res = await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);

      if (res.ok) {
        const data = await res.json();
        if (data.admobMeta) {
          if (data.admobMeta.isNotNewUser) localStorage.setItem('admob_is_not_new_user', 'true');
          if (data.admobMeta.reviewCount) localStorage.setItem('admob_review_count', data.admobMeta.reviewCount.toString());
          if (data.admobMeta.exportCount) localStorage.setItem('admob_export_count', data.admobMeta.exportCount.toString());
        } else if (data.watchedList && data.watchedList.filter((a: any) => a.userComment || (a.userRating && a.userRating > 0)).length > 2) {
          localStorage.setItem('admob_is_not_new_user', 'true');
        }

        if (data.watchedList || data.planToWatchList || data.customAnimeList || data.corrections) {
           if (data.watchedList) handleImport(data.watchedList);
           if (data.planToWatchList) handleImportPlan(data.planToWatchList);
           if (data.customAnimeList) handleImportCustomAnime(data.customAnimeList);
           if (data.corrections) handleImportCorrections(data.corrections);
           updateSyncTime();

           let confirmMsg = t('foundCloudBackup');
           confirmMsg += `- ${data.watchedList ? data.watchedList.length : 0}${t('itemsWatched')}`;
           confirmMsg += `- ${data.planToWatchList ? data.planToWatchList.length : 0}${t('itemsPlanToWatch')}`;
           confirmMsg += `- ${data.customAnimeList ? data.customAnimeList.length : 0}${t('itemsCustom')}`;
           confirmMsg += `- ${data.corrections ? Object.keys(data.corrections).length : 0}${t('itemsCorrection')}`;
           confirmMsg += t('mergedWithLocal');

           showAlert(confirmMsg);
         }
      }
    } catch (error: any) {
      console.error('Restore Error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const restoreFromDrive = async () => {
    if (isLoggedIn) await restoreFlow();
  };

  const getAccessTokenPublic = useCallback(() => getAccessTokenRef.current(), []);

  return (
    <GoogleSyncContext.Provider value={{
      isLoggedIn,
      isSyncing,
      lastSyncTime,
      login,
      logout,
      syncToDrive: () => syncToDrive(false),
      restoreFromDrive,
      accessToken,
      getAccessToken: getAccessTokenPublic,
      isAutoSyncEnabled,
      toggleAutoSync,
      hasDrivePermission
    }}>
      {children}
    </GoogleSyncContext.Provider>
  );
};

export const useGoogleSync = () => {
  const context = useContext(GoogleSyncContext);
  if (context === undefined) {
    throw new Error('useGoogleSync must be used within a GoogleSyncProvider');
  }
  return context;
};
