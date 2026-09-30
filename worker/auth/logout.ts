// POST /api/auth/logout
// 撤銷 refresh token 並清除 Cookie
import {
  AuthContext, json, revokeGoogleToken, isSameOrigin,
  readRefreshCookie, clearRefreshCookie,
} from '../googleAuth';

export const onRequestPost = async ({ request, env }: AuthContext) => {
  if (!isSameOrigin(request)) return json({ error: 'forbidden' }, 403);

  const refreshToken = await readRefreshCookie(request, env);
  if (refreshToken) await revokeGoogleToken(refreshToken);

  return json({ ok: true }, 200, { 'Set-Cookie': clearRefreshCookie() });
};
