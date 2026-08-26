import {
  appendSetCookie,
  exchangeOAuthCode,
  getOAuthRedirectUri,
  getRequestOrigin,
  isOAuthConfigured,
  oauthCompleteCookies,
  resolveOAuthIdentity,
  storeOAuthTokensFromExchange,
  verifyOAuthState
} from '../../../lib/google-oauth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const failRedirect = origin + '/?oauth=error';

  if (!isOAuthConfigured(env)) {
    return Response.redirect(failRedirect, 302);
  }

  const error = url.searchParams.get('error');
  if (error) {
    return Response.redirect(origin + '/?oauth=error&reason=' + encodeURIComponent(error), 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !verifyOAuthState(request, state)) {
    return Response.redirect(origin + '/?oauth=error&reason=invalid_state', 302);
  }

  const identity = resolveOAuthIdentity(request);
  const redirectUri = getOAuthRedirectUri(request);
  const exchange = await exchangeOAuthCode(env, code, redirectUri);
  if (!exchange.ok) {
    return Response.redirect(origin + '/?oauth=error&reason=exchange_failed', 302);
  }

  await storeOAuthTokensFromExchange(env, identity.key, exchange);

  const headers = new Headers({
    Location: origin + '/?oauth=success',
    'Cache-Control': 'no-store'
  });
  oauthCompleteCookies(identity).forEach((cookie) => appendSetCookie(headers, cookie));

  return new Response(null, { status: 302, headers });
}
