import {
  appendSetCookie,
  disconnectOAuth,
  resolveOAuthIdentity
} from '../../../lib/google-oauth.js';

function json(data, status = 200, extraHeaders) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  if (extraHeaders) {
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const identity = resolveOAuthIdentity(request);
  await disconnectOAuth(env, identity.key);

  let headers = null;
  if (identity.setCookie) {
    headers = new Headers();
    appendSetCookie(headers, identity.setCookie);
  }

  return json({ ok: true, connected: false }, 200, headers);
}
