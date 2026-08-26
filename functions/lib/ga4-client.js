/**
 * Google Analytics 4 Data API runReport helper.
 */

const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

function normalizePath(path) {
  let p = String(path || '/').trim();
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/index\.html$/i, '/');
  if (p !== '/') {
    p = p.replace(/\.html$/i, '');
    p = p.replace(/\/+$/, '') || '/';
  }
  return p || '/';
}

async function runReport(accessToken, propertyId, body) {
  const url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport';
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

function metricValue(row, index) {
  const values = row && row.metricValues;
  if (!values || values[index] == null) return 0;
  return parseFloat(values[index].value || '0') || 0;
}

function extractMetrics(row) {
  return {
    sessions: metricValue(row, 0),
    users: metricValue(row, 1),
    engagementRate: metricValue(row, 2),
    avgEngagementTime: metricValue(row, 3)
  };
}

function averageMetrics(pages) {
  if (!pages.length) {
    return { sessions: 0, users: 0, engagementRate: 0, avgEngagementTime: 0 };
  }
  const totals = pages.reduce(
    (acc, page) => ({
      sessions: acc.sessions + page.sessions,
      users: acc.users + page.users,
      engagementRate: acc.engagementRate + page.engagementRate,
      avgEngagementTime: acc.avgEngagementTime + page.avgEngagementTime
    }),
    { sessions: 0, users: 0, engagementRate: 0, avgEngagementTime: 0 }
  );
  const n = pages.length;
  return {
    sessions: totals.sessions / n,
    users: totals.users / n,
    engagementRate: totals.engagementRate / n,
    avgEngagementTime: totals.avgEngagementTime / n
  };
}

export function isGa4Configured(env) {
  return !!(env.GA4_PROPERTY_ID && String(env.GA4_PROPERTY_ID).trim());
}

export async function fetchGa4Insights(accessToken, env, pagePath) {
  const propertyId = String(env.GA4_PROPERTY_ID).trim();
  const targetPath = normalizePath(pagePath);
  const dateRange = [{ startDate: '28daysAgo', endDate: 'today' }];
  const metrics = [
    { name: 'sessions' },
    { name: 'activeUsers' },
    { name: 'engagementRate' },
    { name: 'averageSessionDuration' }
  ];

  const allPagesBody = {
    dateRanges: dateRange,
    dimensions: [{ name: 'pagePath' }],
    metrics,
    limit: 10000
  };

  const allResult = await runReport(accessToken, propertyId, allPagesBody);
  if (!allResult.ok) return allResult;

  const rows = allResult.data.rows || [];
  const pages = rows.map((row) => {
    const path = normalizePath(row.dimensionValues[0].value);
    return Object.assign({ path }, extractMetrics(row));
  });

  const pageMetrics =
    pages.find((p) => p.path === targetPath) ||
    { sessions: 0, users: 0, engagementRate: 0, avgEngagementTime: 0 };

  const withData = pages.filter((p) => p.sessions > 0);
  const sorted = [...withData].sort((a, b) => b.sessions - a.sessions);
  let pageRank = null;
  sorted.forEach((entry, index) => {
    if (entry.path === targetPath) pageRank = index + 1;
  });

  return {
    ok: true,
    page: {
      sessions: pageMetrics.sessions,
      users: pageMetrics.users,
      engagementRate: pageMetrics.engagementRate,
      avgEngagementTime: pageMetrics.avgEngagementTime
    },
    siteAverage: averageMetrics(withData.length ? withData : pages),
    pageRank,
    pagesWithData: withData.length,
    periodDays: 28
  };
}

export { GA4_SCOPE, normalizePath };
