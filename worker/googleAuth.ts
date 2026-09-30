// Worker 共用工具：Google OAuth refresh token 的交換 / 加密 / Cookie 處理

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // 32 bytes 的 base64 字串，用來以 AES-GCM 加密 Cookie 中的 refresh token
  TOKEN_ENC_KEY: string;
  // wrangler.jsonc 中 assets.binding 綁定的靜態資源 (dist)
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export interface AuthContext {
  request: Request;
  env: Env;
}

export const COOKIE_NAME = 'g_rt';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 天；每次 refresh 會重新簽發，達到滑動延長效果

export interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

export const requestGoogleToken = async (params: Record<string, string>): Promise<GoogleTokenResponse> => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return res.json();
};

export const revokeGoogleToken = (token: string) =>
  fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);

// 只接受同源請求，避免其他網站利用使用者的 Cookie 呼叫這些端點
export const isSameOrigin = (request: Request) => {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
};

// ---- AES-GCM 加解密 ----
const b64encode = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64decode = (str: string) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};

const importKey = (env: Env) =>
  crypto.subtle.importKey('raw', b64decode(env.TOKEN_ENC_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']);

export const encrypt = async (env: Env, plain: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(env), new TextEncoder().encode(plain));
  return `${b64encode(iv)}.${b64encode(new Uint8Array(cipher))}`;
};

export const decrypt = async (env: Env, value: string): Promise<string | null> => {
  try {
    const [iv, data] = value.split('.');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(iv) }, await importKey(env), b64decode(data));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
};

// ---- Cookie ----
export const readRefreshCookie = async (request: Request, env: Env) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decrypt(env, match[1]) : null;
};

export const buildRefreshCookie = async (env: Env, refreshToken: string) =>
  `${COOKIE_NAME}=${await encrypt(env, refreshToken)}; Path=/api/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;

export const clearRefreshCookie = () =>
  `${COOKIE_NAME}=; Path=/api/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
