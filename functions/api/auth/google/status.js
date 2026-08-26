import { appendSetCookie, buildOAuthStatus } from '../../../lib/google-oauth.js';

function json(data, status = 200, extraHeaders) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  if (extraHeaders) {
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const status = await buildOAuthStatus(env, request);
  const body = {
    oauthAvailable: status.oauthAvailable,
    connected: status.connected,
    email: status.email,
    gsc: status.gsc,
    ga4: status.ga4,
    serviceAccountFallback: status.serviceAccountFallback,
    insights: status.insights
  };

  let headers = null;
  if (status.identity.setCookie) {
    headers = new Headers();
    appendSetCookie(headers, status.identity.setCookie);
  }

  return json(body, 200, headers);
}
