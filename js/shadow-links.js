/**
 * Shadow mode link checker — page-level and sitemap crawl.
 * Used by TWAShadowSEO Links tab.
 */
(function () {
  'use strict';

  const EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge, #shadow-design-overlay, .shadow-design-badge';

  const LINK_TIMEOUT_MS = 8000;
  const CRAWL_CONCURRENCY = 5;
  const LIVE_HOST = 'berkshireyogatraining.co.uk';

  let crawlAbort = null;

  function isExcluded(el) {
    return !!(el && el.closest && el.closest(EXCLUDE_SELECTOR));
  }

  function mapToCurrentOrigin(url) {
    try {
      const u = new URL(url, location.href);
      if (u.hostname === LIVE_HOST || u.hostname.endsWith('.' + LIVE_HOST)) {
        u.hostname = location.hostname;
        u.protocol = location.protocol;
      }
      return u.href;
    } catch (e) {
      return url;
    }
  }

  function collectAnchorsFromDocument(doc, pageUrl) {
    const origin = new URL(pageUrl).origin;
    const internal = [];
    const external = [];
    doc.querySelectorAll('a[href]').forEach((el) => {
      const href = (el.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      let url;
      try {
        url = new URL(href, pageUrl);
      } catch (e) {
        return;
      }
      const entry = {
        href: url.href,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        pageUrl,
        el: el.ownerDocument === document ? el : null
      };
      if (url.origin === origin) internal.push(entry);
      else external.push(entry);
    });
    return { internal, external };
  }

  function collectPageAnchors() {
    return collectAnchorsFromDocument(document, location.href);
  }

  function classifyStatus(status, error, redirected) {
    if (error === 'timeout') return { kind: 'timeout', label: 'Timeout', tone: 'error' };
    if (error === 'network') return { kind: 'failed', label: 'Failed', tone: 'error' };
    if (error === 'cors') return { kind: 'unverified', label: 'Unverified', tone: 'warn' };
    if (status >= 200 && status < 300) return { kind: 'ok', label: String(status), tone: 'good' };
    if (status >= 300 && status < 400) {
      return { kind: 'redirect', label: String(status), tone: redirected ? 'warn' : 'info' };
    }
    if (status === 404) return { kind: 'broken', label: '404', tone: 'error' };
    if (status >= 400) return { kind: 'broken', label: String(status), tone: 'error' };
    if (status === 0) return { kind: 'unverified', label: 'Unverified', tone: 'warn' };
    return { kind: 'unknown', label: status ? String(status) : 'Unknown', tone: 'warn' };
  }

  async function fetchLinkStatus(url, isInternal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
    try {
      let res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual',
        credentials: 'same-origin'
      });
      if (res.status === 405 || res.status === 501 || res.type === 'opaqueredirect') {
        res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual',
          credentials: 'same-origin'
        });
      }
      clearTimeout(timer);
      const status = res.status;
      const finalUrl = res.headers.get('Location') || '';
      return {
        url,
        status,
        finalUrl,
        isInternal,
        error: null,
        cls: classifyStatus(status, null, status >= 300 && status < 400)
      };
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        return {
          url,
          status: 0,
          finalUrl: '',
          isInternal,
          error: 'timeout',
          cls: classifyStatus(0, 'timeout')
        };
      }
      if (!isInternal) {
        return {
          url,
          status: 0,
          finalUrl: '',
          isInternal,
          error: 'cors',
          cls: classifyStatus(0, 'cors')
        };
      }
      try {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), LINK_TIMEOUT_MS);
        const res2 = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          credentials: 'same-origin'
        });
        clearTimeout(timer2);
        return {
          url,
          status: res2.status,
          finalUrl: res2.url !== url ? res2.url : '',
          isInternal,
          error: null,
          cls: classifyStatus(res2.status, null, res2.url !== url)
        };
      } catch (err2) {
        return {
          url,
          status: 0,
          finalUrl: '',
          isInternal,
          error: err2 && err2.name === 'AbortError' ? 'timeout' : 'network',
          cls: classifyStatus(0, err2 && err2.name === 'AbortError' ? 'timeout' : 'network')
        };
      }
    }
  }

  async function checkLinksBatch(links, onProgress) {
    const unique = new Map();
    links.forEach((link) => {
      if (!unique.has(link.href)) unique.set(link.href, link);
    });
    const entries = [...unique.values()];
    const results = [];
    let done = 0;
    const queue = [...entries];

    async function worker() {
      while (queue.length) {
        const link = queue.shift();
        if (!link) break;
        const isInternal = new URL(link.href).origin === location.origin;
        const result = await fetchLinkStatus(link.href, isInternal);
        results.push(
          Object.assign({}, link, result, {
            locateIndex: link.locateIndex,
            locateKey: link.locateKey
          })
        );
        done += 1;
        if (onProgress) onProgress({ done, total: entries.length, current: link.href });
      }
    }

    const workers = Math.min(CRAWL_CONCURRENCY, entries.length || 1);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return results;
  }

  function summariseResults(results) {
    let brokenInternal = 0;
    let brokenExternal = 0;
    let redirects = 0;
    let timeouts = 0;
    results.forEach((r) => {
      if (r.cls.kind === 'broken') {
        if (r.isInternal) brokenInternal += 1;
        else brokenExternal += 1;
      } else if (r.cls.kind === 'redirect') {
        redirects += 1;
      } else if (r.cls.kind === 'timeout') {
        timeouts += 1;
        if (r.isInternal) brokenInternal += 1;
        else brokenExternal += 1;
      }
    });
    return { brokenInternal, brokenExternal, redirects, timeouts, total: results.length };
  }

  async function checkCurrentPageLinks(onProgress) {
    const anchors = collectPageAnchors();
    const all = [];
    anchors.internal.forEach((l, i) => {
      all.push(Object.assign({}, l, { locateKey: 'link-int-' + i, locateIndex: i, isInternal: true }));
    });
    anchors.external.forEach((l, i) => {
      all.push(Object.assign({}, l, { locateKey: 'link-ext-' + i, locateIndex: i, isInternal: false }));
    });
    const results = await checkLinksBatch(all, onProgress);
    return { results, summary: summariseResults(results), pageUrl: location.href };
  }

  async function parseSitemapUrls() {
    const res = await fetch('/sitemap.xml', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not load sitemap.xml (' + res.status + ')');
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const locs = [...doc.querySelectorAll('url > loc, loc')];
    const urls = locs
      .map((el) => mapToCurrentOrigin((el.textContent || '').trim()))
      .filter(Boolean);
    return [...new Set(urls)];
  }

  async function crawlSiteFromSitemap(onProgress) {
    if (crawlAbort) crawlAbort.abort();
    crawlAbort = new AbortController();
    const signal = crawlAbort.signal;

    const pageUrls = await parseSitemapUrls();
    const allLinks = [];
    let pagesDone = 0;

    for (let i = 0; i < pageUrls.length; i += CRAWL_CONCURRENCY) {
      if (signal.aborted) throw new Error('Crawl cancelled');
      const batch = pageUrls.slice(i, i + CRAWL_CONCURRENCY);
      await Promise.all(
        batch.map(async (pageUrl) => {
          if (signal.aborted) return;
          try {
            const res = await fetch(pageUrl, { credentials: 'same-origin', signal });
            if (!res.ok) return;
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const { internal, external } = collectAnchorsFromDocument(doc, pageUrl);
            internal.forEach((l) => allLinks.push(Object.assign({}, l, { isInternal: true, sourcePage: pageUrl })));
            external.forEach((l) => allLinks.push(Object.assign({}, l, { isInternal: false, sourcePage: pageUrl })));
          } catch (e) {
            /* skip unreachable page */
          } finally {
            pagesDone += 1;
            if (onProgress) {
              onProgress({
                phase: 'pages',
                done: pagesDone,
                total: pageUrls.length,
                current: pageUrl
              });
            }
          }
        })
      );
    }

    const results = await checkLinksBatch(allLinks, (p) => {
      if (onProgress) onProgress(Object.assign({ phase: 'links' }, p));
    });

    return {
      results: results.filter((r) => r.cls.kind === 'broken' || r.cls.kind === 'redirect' || r.cls.kind === 'timeout'),
      summary: summariseResults(results),
      pagesCrawled: pageUrls.length
    };
  }

  function cancelCrawl() {
    if (crawlAbort) {
      crawlAbort.abort();
      crawlAbort = null;
    }
  }

  window.TWAShadowLinks = {
    checkCurrentPageLinks,
    crawlSiteFromSitemap,
    cancelCrawl,
    summariseResults,
    LINK_TIMEOUT_MS,
    CRAWL_CONCURRENCY
  };
})();
