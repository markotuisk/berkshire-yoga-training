import { isGoogleConfigured } from '../lib/google-auth.js';
import { fetchGscInsights, isGscConfigured } from '../lib/gsc-client.js';
import { fetchGa4Insights, isGa4Configured } from '../lib/ga4-client.js';
import { appendSetCookie, buildOAuthStatus, isOAuthConfigured, resolveInsightsAuth } from '../lib/google-oauth.js';

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

function normalizePath(path) {
  let p = String(path || '/').trim();
  if (!p.startsWith('/')) {
    try {
      p = new URL(p).pathname;
    } catch (e) {
      p = '/';
    }
  }
  p = p.replace(/\/index\.html$/i, '/');
  if (p !== '/') {
    p = p.replace(/\.html$/i, '');
    p = p.replace(/\/+$/, '') || '/';
  }
  return p || '/';
}

function buildHints(env, oauthAvailable) {
  const hints = [];
  if (oauthAvailable) {
    hints.push('Open Settings in the toolbar and connect your Google account for Search Console and Analytics insights.');
  }
  if (!isGoogleConfigured(env)) {
    hints.push(
      'Or set GOOGLE_SERVICE_ACCOUNT_JSON (full service account JSON) on the Pages project.'
    );
  }
  if (!isGscConfigured(env)) {
    hints.push(
      'Set GSC_SITE_URL (e.g. sc-domain:berkshireyogatraining.co.uk or https://berkshireyogatraining.co.uk/) and grant access in Search Console.'
    );
  }
  if (!isGa4Configured(env)) {
    hints.push(
      'Set GA4_PROPERTY_ID (numeric property ID) and grant Analytics read access on the GA4 property.'
    );
  }
  return hints;
}

function resolveGscSiteUrl(env, oauthStatus) {
  if (isGscConfigured(env)) return env.GSC_SITE_URL.trim();
  if (oauthStatus && oauthStatus.gsc && oauthStatus.gsc.sites && oauthStatus.gsc.sites.length) {
    return oauthStatus.gsc.sites[0];
  }
  return '';
}

function canUseGsc(env, auth, oauthStatus) {
  if (!auth.ok) return false;
  return !!resolveGscSiteUrl(env, oauthStatus);
}

function canUseGa4(env, auth, oauthStatus) {
  if (auth.source === 'oauth') {
    return isGa4Configured(env);
  }
  return isGoogleConfigured(env) && isGa4Configured(env);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pagePath = normalizePath(url.searchParams.get('path') || '/');
  const oauthAvailable = isOAuthConfigured(env);
  const oauthStatus = await buildOAuthStatus(env, request);

  const oauthMeta = {
    connected: oauthStatus.connected,
    email: oauthStatus.email
  };

  const response = {
    ok: true,
    path: pagePath,
    configured: {
      oauth: oauthMeta,
      gsc: false,
      ga4: false,
      source: null
    },
    periodDays: 28,
    gsc: null,
    ga4: null,
    graph: null
  };

  let setCookieHeaders = null;
  if (oauthStatus.identity.setCookie) {
    setCookieHeaders = new Headers();
    appendSetCookie(setCookieHeaders, oauthStatus.identity.setCookie);
  }

  const auth = await resolveInsightsAuth(env, request);
  if (auth.setCookie) {
    if (!setCookieHeaders) setCookieHeaders = new Headers();
    appendSetCookie(setCookieHeaders, auth.setCookie);
  }

  const gscReady = canUseGsc(env, auth, oauthStatus);
  const ga4Ready = canUseGa4(env, auth, oauthStatus);

  response.configured.gsc = gscReady;
  response.configured.ga4 = ga4Ready;

  if (!auth.ok) {
    response.hints = buildHints(env, oauthAvailable);
    return json(response, 200, setCookieHeaders);
  }

  response.configured.source = auth.source;
  if (auth.source === 'oauth') {
    oauthMeta.connected = true;
    oauthMeta.email = auth.email || oauthMeta.email;
  }

  if (!gscReady && !ga4Ready) {
    response.hints = buildHints(env, oauthAvailable);
    return json(response, 200, setCookieHeaders);
  }

  const { accessToken } = auth;

  if (gscReady) {
    const gscSiteUrl = resolveGscSiteUrl(env, oauthStatus);
    const gsc = await fetchGscInsights(accessToken, env, pagePath, gscSiteUrl);
    if (gsc.ok) {
      response.gsc = {
        page: gsc.page,
        queries: gsc.queries,
        sitePages: gsc.sitePages,
        pageRank: gsc.pageRank,
        pageUrl: gsc.pageUrl,
        totalPagesWithData: gsc.sitePages.length
      };
    } else {
      response.gsc = { error: gsc.error || 'GSC query failed', status: gsc.status || null };
    }
  }

  if (ga4Ready) {
    const ga4 = await fetchGa4Insights(accessToken, env, pagePath);
    if (ga4.ok) {
      response.ga4 = {
        page: ga4.page,
        siteAverage: ga4.siteAverage,
        pageRank: ga4.pageRank,
        pagesWithData: ga4.pagesWithData
      };
    } else {
      response.ga4 = { error: ga4.error || 'GA4 query failed', status: ga4.status || null };
    }
  }

  if (!gscReady || !ga4Ready) {
    response.hints = buildHints(env, oauthAvailable);
  }

  return json(response, 200, setCookieHeaders);
}
