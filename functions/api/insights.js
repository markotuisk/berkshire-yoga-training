import { getGoogleAccessToken, isGoogleConfigured } from '../lib/google-auth.js';
import { fetchGscInsights, isGscConfigured, GSC_SCOPE } from '../lib/gsc-client.js';
import { fetchGa4Insights, isGa4Configured, GA4_SCOPE } from '../lib/ga4-client.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
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

function buildHints(env) {
  const hints = [];
  if (!isGoogleConfigured(env)) {
    hints.push(
      'Set GOOGLE_SERVICE_ACCOUNT_JSON (full service account JSON) on the Pages project.'
    );
  }
  if (!isGscConfigured(env)) {
    hints.push(
      'Set GSC_SITE_URL (e.g. sc-domain:berkshireyogatraining.co.uk or https://berkshireyogatraining.co.uk/) and grant the service account Search Console access.'
    );
  }
  if (!isGa4Configured(env)) {
    hints.push(
      'Set GA4_PROPERTY_ID (numeric property ID) and add the service account email as Viewer on the GA4 property.'
    );
  }
  return hints;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pagePath = normalizePath(url.searchParams.get('path') || '/');

  const configured = {
    google: isGoogleConfigured(env),
    gsc: isGoogleConfigured(env) && isGscConfigured(env),
    ga4: isGoogleConfigured(env) && isGa4Configured(env)
  };

  const response = {
    ok: true,
    path: pagePath,
    configured: { gsc: configured.gsc, ga4: configured.ga4 },
    periodDays: 28,
    gsc: null,
    ga4: null,
    graph: null
  };

  if (!configured.gsc && !configured.ga4) {
    response.hints = buildHints(env);
    return json(response);
  }

  const tokenResult = await getGoogleAccessToken(env, [GSC_SCOPE, GA4_SCOPE]);
  if (!tokenResult.ok) {
    response.hints = buildHints(env).concat(tokenResult.error || 'Google authentication failed.');
    return json(response);
  }

  const { accessToken } = tokenResult;

  if (configured.gsc) {
    const gsc = await fetchGscInsights(accessToken, env, pagePath);
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

  if (configured.ga4) {
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

  if (!configured.gsc || !configured.ga4) {
    response.hints = buildHints(env);
  }

  return json(response);
}
