import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhangyushao.anispace',
  appName: 'AniSpace',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.file'],
      serverClientId: '991277845771-ufce34uqpao8gagli41chv14d4t1m2jc.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
