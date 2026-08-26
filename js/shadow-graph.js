/**
 * Shadow mode site link graph — sitemap crawl, adjacency, radial SVG.
 */
(function () {
  'use strict';

  const EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge, #shadow-design-overlay, .shadow-design-badge';
  const LIVE_HOST = 'berkshireyogatraining.co.uk';
  const CRAWL_CONCURRENCY = 5;

  let siteGraph = null;
  let graphBuilding = false;
  let graphBuildPromise = null;

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

  function normalizePath(pathOrUrl) {
    let p = String(pathOrUrl || '/').trim();
    if (p.includes('://')) {
      try {
        p = new URL(p).pathname;
      } catch (e) {
        p = '/';
      }
    }
    if (!p.startsWith('/')) p = '/' + p;
    p = p.replace(/\/index\.html$/i, '/');
    if (p !== '/') {
      p = p.replace(/\.html$/i, '');
      p = p.replace(/\/+$/, '') || '/';
    }
    return p || '/';
  }

  function pathToUrl(path) {
    const p = normalizePath(path);
    return p === '/' ? location.origin + '/' : location.origin + p + '/';
  }

  function pathLabel(path) {
    if (path === '/') return 'Home';
    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || 'Home';
    return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function isExcluded(el) {
    return !!(el && el.closest && el.closest(EXCLUDE_SELECTOR));
  }

  function collectAnchorsFromDocument(doc, pageUrl) {
    const origin = new URL(pageUrl).origin;
    const outbound = [];
    doc.querySelectorAll('a[href]').forEach((el) => {
      if (doc === document && isExcluded(el)) return;
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
      if (url.origin !== origin) return;
      if (url.pathname.startsWith('/cdn-cgi/')) return;
      outbound.push(normalizePath(url.pathname));
    });
    return [...new Set(outbound)];
  }

  async function parseSitemapUrls() {
    if (window.TWAShadowLinks && window.TWAShadowLinks.parseSitemapUrls) {
      return window.TWAShadowLinks.parseSitemapUrls();
    }
    const res = await fetch('/sitemap.xml', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not load sitemap.xml (' + res.status + ')');
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const locs = [...doc.querySelectorAll('url > loc, loc')];
    const urls = locs.map((el) => mapToCurrentOrigin((el.textContent || '').trim())).filter(Boolean);
    return [...new Set(urls)];
  }

  async function crawlSiteEdges(onProgress) {
    const pageUrls = await parseSitemapUrls();
    const edges = [];
    const nodePaths = new Set();
    let done = 0;

    pageUrls.forEach((url) => nodePaths.add(normalizePath(url)));

    for (let i = 0; i < pageUrls.length; i += CRAWL_CONCURRENCY) {
      const batch = pageUrls.slice(i, i + CRAWL_CONCURRENCY);
      await Promise.all(
        batch.map(async (pageUrl) => {
          const fromPath = normalizePath(pageUrl);
          try {
            const res = await fetch(pageUrl, { credentials: 'same-origin' });
            if (!res.ok) return;
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const targets = collectAnchorsFromDocument(doc, pageUrl);
            targets.forEach((toPath) => {
              nodePaths.add(toPath);
              edges.push({ from: fromPath, to: toPath });
            });
          } catch (e) {
            /* skip unreachable page */
          } finally {
            done += 1;
            if (onProgress) onProgress({ done, total: pageUrls.length, current: pageUrl });
          }
        })
      );
    }

    return { edges, nodePaths: [...nodePaths], pageCount: pageUrls.length };
  }

  function buildAdjacency(edges, nodePaths) {
    const outbound = new Map();
    const inbound = new Map();

    nodePaths.forEach((p) => {
      outbound.set(p, new Set());
      inbound.set(p, new Set());
    });

    edges.forEach(({ from, to }) => {
      if (!outbound.has(from)) outbound.set(from, new Set());
      if (!inbound.has(to)) inbound.set(to, new Set());
      outbound.get(from).add(to);
      inbound.get(to).add(from);
    });

    return { outbound, inbound, pageCount: nodePaths.length };
  }

  async function buildSiteGraph(onProgress) {
    if (siteGraph) return siteGraph;
    if (graphBuildPromise) return graphBuildPromise;

    graphBuilding = true;
    graphBuildPromise = crawlSiteEdges(onProgress)
      .then(({ edges, nodePaths, pageCount }) => {
        const adj = buildAdjacency(edges, nodePaths);
        siteGraph = {
          builtAt: Date.now(),
          pageCount,
          edgeCount: edges.length,
          nodePaths,
          outbound: adj.outbound,
          inbound: adj.inbound
        };
        graphBuilding = false;
        return siteGraph;
      })
      .catch((err) => {
        graphBuilding = false;
        graphBuildPromise = null;
        throw err;
      });

    return graphBuildPromise;
  }

  function rebuildSiteGraph(onProgress) {
    siteGraph = null;
    graphBuildPromise = null;
    return buildSiteGraph(onProgress);
  }

  function getPageGraph(centerPath) {
    const center = normalizePath(centerPath);
    if (!siteGraph) {
      return {
        center,
        ready: false,
        inbound: [],
        outbound: [],
        stats: { inboundCount: 0, outboundCount: 0, isOrphan: false, totalPages: 0 }
      };
    }

    const inboundSet = siteGraph.inbound.get(center) || new Set();
    const outboundSet = siteGraph.outbound.get(center) || new Set();

    function nodeEntry(path) {
      return { path, label: pathLabel(path), url: pathToUrl(path) };
    }

    const inbound = [...inboundSet].sort().map(nodeEntry);
    const outbound = [...outboundSet].sort().map(nodeEntry);
    const inboundCount = inbound.length;
    const outboundCount = outbound.length;
    const isOrphan = center !== '/' && inboundCount === 0;

    return {
      center,
      ready: true,
      inbound,
      outbound,
      stats: {
        inboundCount,
        outboundCount,
        isOrphan,
        totalPages: siteGraph.pageCount
      }
    };
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function renderRadialSvg(graph, options) {
    const opts = options || {};
    const compact = !!opts.compact;
    const width = compact ? 220 : 360;
    const height = compact ? 160 : 320;
    const cx = width / 2;
    const cy = height / 2;
    const maxNodes = compact ? 6 : 24;
    const inNodes = graph.inbound.slice(0, Math.ceil(maxNodes / 2));
    const outNodes = graph.outbound.slice(0, Math.floor(maxNodes / 2));
    const rCenter = compact ? 16 : 22;
    const rNode = compact ? 10 : 14;
    const orbit = compact ? 58 : 110;

    let svg =
      '<svg class="shadow-graph-svg' +
      (compact ? ' shadow-graph-svg--compact' : '') +
      '" viewBox="0 0 ' +
      width +
      ' ' +
      height +
      '" role="img" aria-label="Link graph for ' +
      escapeAttr(graph.center) +
      '">';

    function polar(angle, radius) {
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    }

    function placeNodes(nodes, startAngle, endAngle) {
      if (!nodes.length) return '';
      let html = '';
      nodes.forEach((node, i) => {
        const angle =
          nodes.length === 1
            ? (startAngle + endAngle) / 2
            : startAngle + ((endAngle - startAngle) * i) / (nodes.length - 1);
        const pos = polar(angle, orbit);
        html +=
          '<line class="shadow-graph-edge" x1="' +
          cx +
          '" y1="' +
          cy +
          '" x2="' +
          pos.x +
          '" y2="' +
          pos.y +
          '"/>';
        html +=
          '<g class="shadow-graph-node shadow-graph-node--link" data-graph-path="' +
          escapeAttr(node.path) +
          '" tabindex="0" role="link" aria-label="' +
          escapeAttr(node.label) +
          '">' +
          '<circle cx="' +
          pos.x +
          '" cy="' +
          pos.y +
          '" r="' +
          rNode +
          '"/>' +
          '<title>' +
          escapeAttr(node.path) +
          '</title>' +
          '</g>';
      });
      return html;
    }

    svg += placeNodes(inNodes, Math.PI * 0.55, Math.PI * 1.45);
    svg += placeNodes(outNodes, -Math.PI * 0.45, Math.PI * 0.45);

    svg +=
      '<g class="shadow-graph-node shadow-graph-node--center" data-graph-path="' +
      escapeAttr(graph.center) +
      '" aria-label="Current page">' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      rCenter +
      '"/>' +
      '<title>' +
      escapeAttr(graph.center) +
      '</title>' +
      '</g>';

    if (!compact && (graph.inbound.length > inNodes.length || graph.outbound.length > outNodes.length)) {
      svg +=
        '<text class="shadow-graph-more" x="' +
        cx +
        '" y="' +
        (height - 12) +
        '" text-anchor="middle">Showing subset — open full graph for all links</text>';
    }

    svg += '</svg>';
    return svg;
  }

  function bindGraphNavigation(container) {
    if (!container || container._graphBound) return;
    container._graphBound = true;
    container.addEventListener('click', (event) => {
      const node = event.target.closest('[data-graph-path]');
      if (!node || node.classList.contains('shadow-graph-node--center')) return;
      const path = node.getAttribute('data-graph-path');
      if (!path) return;
      location.href = pathToUrl(path);
    });
    container.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const node = event.target.closest('[data-graph-path]');
      if (!node || node.classList.contains('shadow-graph-node--center')) return;
      event.preventDefault();
      const path = node.getAttribute('data-graph-path');
      if (path) location.href = pathToUrl(path);
    });
  }

  function renderGraphStats(graph) {
    const s = graph.stats;
    let html =
      '<div class="shadow-metric-chips">' +
      '<span class="shadow-metric-chip"><strong>' +
      s.inboundCount +
      '</strong> inbound</span>' +
      '<span class="shadow-metric-chip"><strong>' +
      s.outboundCount +
      '</strong> outbound</span>';
    if (s.isOrphan) {
      html +=
        '<span class="shadow-metric-chip shadow-metric-chip--warn">Orphan page</span>';
    }
    html += '</div>';
    return html;
  }

  function renderGraphPanel(container, centerPath, options) {
    if (!container) return;
    const opts = options || {};
    const graph = getPageGraph(centerPath);

    if (!graph.ready) {
      container.innerHTML =
        '<div class="shadow-graph-loading">' +
        '<p class="shadow-hint">Building link graph from sitemap…</p>' +
        '<div class="shadow-seo-link-progress-bar" role="progressbar"><span class="shadow-seo-link-progress-fill shadow-seo-link-progress-fill--indeterminate"></span></div>' +
        '</div>';
      buildSiteGraph((p) => {
        const el = container.querySelector('.shadow-hint');
        if (el && p.total) {
          el.textContent = 'Scanning page ' + p.done + ' of ' + p.total + '…';
        }
      })
        .then(() => renderGraphPanel(container, centerPath, options))
        .catch(() => {
          container.innerHTML =
            '<p class="shadow-seo-empty-state">Could not build link graph. Check sitemap.xml is reachable.</p>';
        });
      return;
    }

    let html = renderGraphStats(graph);
    html += renderRadialSvg(graph, opts);
    if (!opts.compact) {
      html +=
        '<div class="shadow-graph-actions">' +
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-graph-rebuild">Rebuild graph</button>' +
        '</div>';
    }
    container.innerHTML = html;
    bindGraphNavigation(container);

    const rebuildBtn = container.querySelector('.shadow-graph-rebuild');
    if (rebuildBtn && !rebuildBtn._bound) {
      rebuildBtn._bound = true;
      rebuildBtn.addEventListener('click', () => {
        rebuildBtn.disabled = true;
        rebuildBtn.textContent = 'Rebuilding…';
        rebuildSiteGraph((p) => {
          rebuildBtn.textContent = 'Scanning ' + p.done + '/' + p.total + '…';
        })
          .then(() => renderGraphPanel(container, centerPath, options))
          .catch(() => {
            container.innerHTML =
              '<p class="shadow-seo-empty-state">Rebuild failed. Try again in a moment.</p>';
          });
      });
    }
  }

  function renderMiniPreview(container, centerPath) {
    renderGraphPanel(container, centerPath, { compact: true });
  }

  function isGraphReady() {
    return !!siteGraph;
  }

  function isGraphBuilding() {
    return graphBuilding;
  }

  window.TWAShadowGraph = {
    buildSiteGraph,
    rebuildSiteGraph,
    getPageGraph,
    renderGraphPanel,
    renderMiniPreview,
    renderRadialSvg,
    renderGraphStats,
    normalizePath,
    isGraphReady,
    isGraphBuilding
  };
})();
