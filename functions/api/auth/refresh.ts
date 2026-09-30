// POST /api/auth/refresh
// 讀取 Cookie 中的 refresh token，向 Google 換一組新的 access token
import {
  PagesContext, json, requestGoogleToken, isSameOrigin,
  readRefreshCookie, buildRefreshCookie, clearRefreshCookie,
} from '../../_shared/googleAuth';

export const onRequestPost = async ({ request, env }: PagesContext) => {
  if (!isSameOrigin(request)) return json({ error: 'forbidden' }, 403);

  const refreshToken = await readRefreshCookie(request, env);
  if (!refreshToken) return json({ error: 'not_logged_in' }, 401, { 'Set-Cookie': clearRefreshCookie() });

  const token = await requestGoogleToken({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  if (!token.access_token) {
    // invalid_grant = 使用者撤銷授權 / 改密碼 / 過久未使用，必須重新登入
    if (token.error === 'invalid_grant') {
      return json({ error: 'invalid_grant' }, 401, { 'Set-Cookie': clearRefreshCookie() });
    }
    return json({ error: token.error || 'refresh_failed' }, 502);
  }

  return json(
    { access_token: token.access_token, expires_in: token.expires_in, scope: token.scope },
    200,
    // 重新簽發 Cookie 以延長效期（Google 偶爾也會輪替 refresh token）
    { 'Set-Cookie': await buildRefreshCookie(env, token.refresh_token || refreshToken) },
  );
};
