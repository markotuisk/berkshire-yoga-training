import {
  appendSetCookie,
  buildGoogleAuthUrl,
  buildOAuthStartState,
  getOAuthRedirectUri,
  isOAuthConfigured,
  oauthStartCookies,
  resolveOAuthIdentity
} from '../../../lib/google-oauth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!isOAuthConfigured(env)) {
    return new Response('Google OAuth is not configured on this environment.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const identity = resolveOAuthIdentity(request);
  const state = buildOAuthStartState();
  const redirectUri = getOAuthRedirectUri(request);
  const authUrl = buildGoogleAuthUrl(env, redirectUri, state);

  const headers = new Headers({
    Location: authUrl,
    'Cache-Control': 'no-store'
  });
  appendSetCookie(headers, oauthStartCookies(state));
  if (identity.setCookie) appendSetCookie(headers, identity.setCookie);

  return new Response(null, { status: 302, headers });
}
