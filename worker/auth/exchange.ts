// POST /api/auth/exchange
// 將前端 GIS auth-code 流程拿到的 code 換成 access token，並把 refresh token 加密存入 HttpOnly Cookie
import {
  AuthContext, json, requestGoogleToken, revokeGoogleToken, isSameOrigin,
  readRefreshCookie, buildRefreshCookie,
} from '../googleAuth';

export const onRequestPost = async ({ request, env }: AuthContext) => {
  if (!isSameOrigin(request)) return json({ error: 'forbidden' }, 403);

  const { code } = await request.json().catch(() => ({})) as { code?: string };
  if (!code) return json({ error: 'missing_code' }, 400);

  const token = await requestGoogleToken({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: 'postmessage', // GIS popup 模式固定使用 postmessage
    grant_type: 'authorization_code',
  });

  if (!token.access_token) {
    return json({ error: token.error || 'exchange_failed', error_description: token.error_description }, 400);
  }

  let refreshToken = token.refresh_token;
  if (!refreshToken) {
    // Google 只在「首次同意」時發 refresh token。若使用者以前用舊版(implicit)授權過，這裡會拿不到。
    // 先沿用既有 Cookie；真的沒有，就撤銷這次授權，讓使用者下次登入時重新同意以取得 refresh token。
    const existing = await readRefreshCookie(request, env);
    if (existing) {
      refreshToken = existing;
    } else {
      await revokeGoogleToken(token.access_token);
      return json({ error: 'no_refresh_token' }, 409);
    }
  }

  return json(
    { access_token: token.access_token, expires_in: token.expires_in, scope: token.scope },
    200,
    { 'Set-Cookie': await buildRefreshCookie(env, refreshToken) },
  );
};
