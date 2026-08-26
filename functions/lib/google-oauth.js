/**
 * Google OAuth 2.0 for Shadow partners (Search Console + GA4 read scopes).
 */

import { clearOAuthTokens, getOAuthTokens, saveOAuthTokens } from './google-oauth-store.js';
import { isGoogleConfigured } from './google-auth.js';
import { isGscConfigured } from './gsc-client.js';
import { isGa4Configured } from './ga4-client.js';

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid',
  'email'
];

const SID_COOKIE = 'shadow_oauth_sid';
const STATE_COOKIE = 'shadow_oauth_state';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isOAuthConfigured(env) {
  return !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 1) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[name] = decodeURIComponent(value);
  });
  return out;
}

function randomId() {
  return crypto.randomUUID();
}

function cookieHeader(name, value, maxAge, { httpOnly = true } = {}) {
  const parts = [
    name + '=' + encodeURIComponent(value),
    'Path=/',
    'Max-Age=' + maxAge,
    'SameSite=Lax'
  ];
  if (httpOnly) parts.push('HttpOnly');
  parts.push('Secure');
  return parts.join('; ');
}

function clearCookieHeader(name) {
  return name + '=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure';
}

export function getRequestOrigin(request) {
  const url = new URL(request.url);
  return url.origin;
}

export function getOAuthRedirectUri(request) {
  return getRequestOrigin(request) + '/api/auth/google/callback';
}

export function resolveOAuthIdentity(request) {
  const accessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (accessEmail) {
    const email = accessEmail.trim().toLowerCase();
    return { key: 'email:' + email, email: accessEmail.trim(), viaAccess: true };
  }
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  let sid = cookies[SID_COOKIE];
  let setCookie = null;
  if (!sid) {
    sid = randomId();
    setCookie = cookieHeader(SID_COOKIE, sid, COOKIE_MAX_AGE);
  }
  return { key: 'sid:' + sid, email: '', viaAccess: false, setCookie };
}

export function appendSetCookie(headers, cookie) {
  if (!cookie) return headers;
  const next = new Headers(headers);
  next.append('Set-Cookie', cookie);
  return next;
}

export function buildOAuthStartState() {
  return randomId();
}

export function oauthStartCookies(state) {
  return cookieHeader(STATE_COOKIE, state, 600);
}

export function verifyOAuthState(request, state) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return cookies[STATE_COOKIE] && cookies[STATE_COOKIE] === state;
}

export function oauthCompleteCookies(identity) {
  const headers = [clearCookieHeader(STATE_COOKIE)];
  if (identity.setCookie) headers.push(identity.setCookie);
  return headers;
}

export function buildGoogleAuthUrl(env, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

export async function exchangeOAuthCode(env, code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: 'Token exchange failed (' + res.status + ')', detail: text.slice(0, 400) };
  }

  const data = await res.json();
  if (!data.access_token) {
    return { ok: false, error: 'No access_token in OAuth response' };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in || 3600
  };
}

export async function refreshOAuthAccessToken(env, refreshToken) {
  if (!refreshToken) {
    return { ok: false, error: 'No refresh token stored' };
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: 'Refresh failed (' + res.status + ')', detail: text.slice(0, 400) };
  }

  const data = await res.json();
  if (!data.access_token) {
    return { ok: false, error: 'No access_token in refresh response' };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
    refreshToken: data.refresh_token || refreshToken
  };
}

export async function fetchGoogleUserEmail(accessToken) {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.email || '';
}

export async function listGscSiteUrls(accessToken) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return { ok: false, sites: [] };
  const data = await res.json();
  const entries = data.siteEntry || [];
  const sites = entries
    .filter((entry) => entry.permissionLevel && entry.permissionLevel !== 'siteUnverifiedUser')
    .map((entry) => entry.siteUrl);
  return { ok: true, sites };
}

async function loadStoredTokens(env, identityKey) {
  return getOAuthTokens(env, identityKey);
}

export async function getValidOAuthAccessToken(env, identityKey) {
  const stored = await loadStoredTokens(env, identityKey);
  if (!stored || !stored.accessToken) {
    return { ok: false, connected: false };
  }

  const now = Math.floor(Date.now() / 1000);
  if (stored.expiresAt && stored.expiresAt > now + 60) {
    return {
      ok: true,
      connected: true,
      accessToken: stored.accessToken,
      email: stored.email || '',
      source: 'oauth'
    };
  }

  if (!stored.refreshToken) {
    return { ok: false, connected: true, error: 'OAuth session expired — reconnect Google' };
  }

  const refreshed = await refreshOAuthAccessToken(env, stored.refreshToken);
  if (!refreshed.ok) {
    return { ok: false, connected: true, error: refreshed.error || 'Could not refresh OAuth token' };
  }

  const expiresAt = now + (refreshed.expiresIn || 3600);
  const email = stored.email || (await fetchGoogleUserEmail(refreshed.accessToken));
  await saveOAuthTokens(env, identityKey, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || stored.refreshToken,
    expiresAt,
    email,
    connectedAt: stored.connectedAt
  });

  return {
    ok: true,
    connected: true,
    accessToken: refreshed.accessToken,
    email,
    source: 'oauth'
  };
}

export async function storeOAuthTokensFromExchange(env, identityKey, exchange) {
  const email = await fetchGoogleUserEmail(exchange.accessToken);
  const expiresAt = Math.floor(Date.now() / 1000) + (exchange.expiresIn || 3600);
  await saveOAuthTokens(env, identityKey, {
    accessToken: exchange.accessToken,
    refreshToken: exchange.refreshToken,
    expiresAt,
    email,
    connectedAt: new Date().toISOString()
  });
  return email;
}

export async function disconnectOAuth(env, identityKey) {
  await clearOAuthTokens(env, identityKey);
}

function gscStatusForEnv(env, oauthConnected, oauthHasSite) {
  if (oauthConnected && oauthHasSite) return 'connected_via_google';
  if (isGscConfigured(env) && isGoogleConfigured(env)) return 'service_account_only';
  if (oauthConnected) return 'oauth_no_site';
  return 'not_available';
}

function ga4StatusForEnv(env, oauthConnected) {
  if (oauthConnected && isGa4Configured(env)) return 'connected_via_google';
  if (isGa4Configured(env) && isGoogleConfigured(env)) return 'service_account_only';
  if (oauthConnected) return 'oauth_no_property';
  return 'not_available';
}

export async function buildOAuthStatus(env, request) {
  const identity = resolveOAuthIdentity(request);
  const oauthAvailable = isOAuthConfigured(env);
  const stored = await loadStoredTokens(env, identity.key);
  const connected = !!(stored && (stored.accessToken || stored.refreshToken));
  let email = stored && stored.email ? stored.email : identity.email || '';

  let oauthAccess = null;
  if (connected) {
    oauthAccess = await getValidOAuthAccessToken(env, identity.key);
    if (oauthAccess.ok && oauthAccess.email) email = oauthAccess.email;
  }

  let gscSites = [];
  if (oauthAccess && oauthAccess.ok) {
    const listed = await listGscSiteUrls(oauthAccess.accessToken);
    if (listed.ok) gscSites = listed.sites;
  }

  const configuredSite = isGscConfigured(env) ? env.GSC_SITE_URL.trim() : '';
  const oauthHasSite =
    configuredSite && gscSites.length
      ? gscSites.some((site) => site === configuredSite)
      : gscSites.length > 0;

  const gscStatus = gscStatusForEnv(env, connected && oauthAccess && oauthAccess.ok, oauthHasSite);
  const ga4Status = ga4StatusForEnv(env, connected && oauthAccess && oauthAccess.ok);

  const serviceAccountFallback = isGoogleConfigured(env);

  return {
    identity,
    oauthAvailable,
    connected: connected && !!(oauthAccess && oauthAccess.ok),
    email: email || null,
    gsc: {
      status: gscStatus,
      siteUrl: configuredSite || (gscSites[0] || null),
      sites: gscSites,
      configured: isGscConfigured(env),
      serviceAccount: isGoogleConfigured(env) && isGscConfigured(env)
    },
    ga4: {
      status: ga4Status,
      propertyId: isGa4Configured(env) ? String(env.GA4_PROPERTY_ID).trim() : null,
      configured: isGa4Configured(env),
      serviceAccount: isGoogleConfigured(env) && isGa4Configured(env)
    },
    serviceAccountFallback,
    insights: {
      gsc: (connected && oauthAccess && oauthAccess.ok && oauthHasSite) || (serviceAccountFallback && isGscConfigured(env)),
      ga4: (connected && oauthAccess && oauthAccess.ok && isGa4Configured(env)) || (serviceAccountFallback && isGa4Configured(env))
    }
  };
}

export async function resolveInsightsAuth(env, request) {
  const identity = resolveOAuthIdentity(request);
  let setCookie = identity.setCookie || null;

  if (isOAuthConfigured(env)) {
    const oauth = await getValidOAuthAccessToken(env, identity.key);
    if (oauth.ok) {
      return {
        ok: true,
        accessToken: oauth.accessToken,
        source: 'oauth',
        email: oauth.email || '',
        identity,
        setCookie
      };
    }
  }

  if (isGoogleConfigured(env)) {
    const { getGoogleAccessToken } = await import('./google-auth.js');
    const { GSC_SCOPE } = await import('./gsc-client.js');
    const { GA4_SCOPE } = await import('./ga4-client.js');
    const tokenResult = await getGoogleAccessToken(env, [GSC_SCOPE, GA4_SCOPE]);
    if (tokenResult.ok) {
      return {
        ok: true,
        accessToken: tokenResult.accessToken,
        source: 'service_account',
        email: tokenResult.email || '',
        identity,
        setCookie
      };
    }
    return { ok: false, error: tokenResult.error, identity, setCookie };
  }

  return { ok: false, error: 'Google not configured', identity, setCookie, source: null };
}

export { SID_COOKIE, STATE_COOKIE };
