/**
 * Google Search Console searchAnalytics.query helper.
 */

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function last28DaysRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function encodeSiteUrl(siteUrl) {
  return encodeURIComponent(siteUrl);
}

function rowsToMetrics(rows) {
  if (!rows || !rows.length) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }
  const row = rows[0];
  return {
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0
  };
}

function pageFilter(pageUrl) {
  return {
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: 'page',
            operator: 'equals',
            expression: pageUrl
          }
        ]
      }
    ]
  };
}

async function queryAnalytics(accessToken, siteUrl, body) {
  const url =
    'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeSiteUrl(siteUrl) +
    '/searchAnalytics/query';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text.slice(0, 500) };
  }

  const data = await res.json();
  return { ok: true, data };
}

function normalizeGscPageUrl(page) {
  if (!page) return '';
  try {
    const u = new URL(page);
    let path = u.pathname.replace(/\/index\.html$/i, '/');
    if (path !== '/') path = path.replace(/\.html$/i, '').replace(/\/+$/, '') || '/';
    return path || '/';
  } catch (e) {
    return page;
  }
}

function pathToLivePageUrl(path, siteUrl) {
  const normalized = path.startsWith('/') ? path : '/' + path;
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.replace(/^sc-domain:/, '');
    const suffix = normalized === '/' ? '/' : normalized.endsWith('/') ? normalized : normalized + '/';
    return 'https://' + domain + suffix;
  }
  try {
    const base = new URL(siteUrl.endsWith('/') ? siteUrl : siteUrl + '/');
    if (normalized === '/') return base.origin + '/';
    return base.origin + (normalized.startsWith('/') ? normalized : '/' + normalized) + '/';
  } catch (e) {
    return 'https://berkshireyogatraining.co.uk' + (normalized === '/' ? '/' : normalized + '/');
  }
}

export function isGscConfigured(env) {
  return !!(env.GSC_SITE_URL && env.GSC_SITE_URL.trim());
}

export async function fetchGscInsights(accessToken, env, pagePath, siteUrlOverride) {
  const siteUrl = String(siteUrlOverride || env.GSC_SITE_URL || '').trim();
  if (!siteUrl) {
    return { ok: false, error: 'GSC site URL not configured' };
  }
  const pageUrl = pathToLivePageUrl(pagePath, siteUrl);
  const dateRange = last28DaysRange();

  const pageBody = Object.assign({}, dateRange, pageFilter(pageUrl));
  const pageResult = await queryAnalytics(accessToken, siteUrl, pageBody);
  if (!pageResult.ok) return pageResult;

  const queriesBody = Object.assign({}, dateRange, pageFilter(pageUrl), {
    dimensions: ['query'],
    rowLimit: 15
  });
  const queriesResult = await queryAnalytics(accessToken, siteUrl, queriesBody);

  const allPagesBody = Object.assign({}, dateRange, {
    dimensions: ['page'],
    rowLimit: 25000
  });
  const allPagesResult = await queryAnalytics(accessToken, siteUrl, allPagesBody);
  if (!allPagesResult.ok) return allPagesResult;

  const pageMetrics = rowsToMetrics(pageResult.data.rows);
  const topQueries = (queriesResult.ok && queriesResult.data.rows ? queriesResult.data.rows : [])
    .slice(0, 15)
    .map((row) => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      position: row.position || 0
    }));

  const sitePages = (allPagesResult.data.rows || []).map((row) => ({
    path: normalizeGscPageUrl(row.keys[0]),
    pageUrl: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0
  }));

  const targetPath = normalizeGscPageUrl(pageUrl);
  const sorted = [...sitePages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
  let pageRank = null;
  sorted.forEach((entry, index) => {
    if (entry.path === targetPath) pageRank = index + 1;
  });

  return {
    ok: true,
    page: pageMetrics,
    queries: topQueries,
    sitePages: sorted,
    pageRank,
    pageUrl,
    periodDays: 28
  };
}

export { GSC_SCOPE, pathToLivePageUrl, normalizeGscPageUrl };
