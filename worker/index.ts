// Cloudflare Worker 入口：/api/auth/* 由此處理，其餘請求交給靜態資源 (dist)
// 路由分流設定見 wrangler.jsonc 的 assets.run_worker_first
import type { Env } from './googleAuth';
import { json } from './googleAuth';
import { onRequestPost as exchange } from './auth/exchange';
import { onRequestPost as refresh } from './auth/refresh';
import { onRequestPost as logout } from './auth/logout';

const authRoutes: Record<string, typeof exchange> = {
  '/api/auth/exchange': exchange,
  '/api/auth/refresh': refresh,
  '/api/auth/logout': logout,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const handler = authRoutes[pathname];

    if (handler) {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
      try {
        return await handler({ request, env });
      } catch (error) {
        console.error('Auth handler error:', error);
        return json({ error: 'server_error' }, 500);
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
