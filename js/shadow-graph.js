/**
 * Shadow mode site link graph — sitemap crawl, adjacency, reviewer-focused graph views.
 */
(function () {
  'use strict';

  const EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge, #shadow-design-overlay, .shadow-design-badge';
  const LIVE_HOST = 'berkshireyogatraining.co.uk';
  const CRAWL_CONCURRENCY = 5;
  const SHADOW_ROBOTS_PATTERN = /noindex.*noarchive|noarchive.*noindex/;
  const GRAPH_VIEWS = [
    { id: 'this-page', label: 'This page' },
    { id: 'url-structure', label: 'URL structure' },
    { id: 'crawl-map', label: 'Crawl map' },
    { id: 'incoming-links', label: 'Incoming links' }
  ];
  const MAX_CRAWL_COLUMN_NODES = 30;

  let siteGraph = null;
  let graphBuilding = false;
  let graphBuildPromise = null;
  const expandedGroups = new Set();
  let activeGraphView = 'this-page';
  let pendingGraphView = null;
  let incomingHighlight = false;
  let legendPopoverOpen = false;

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

  function sectionLabel(sectionKey) {
    if (sectionKey === '/') return 'Home';
    const parts = sectionKey.split('/').filter(Boolean);
    const name = parts[parts.length - 1] || 'Home';
    return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function isExcluded(el) {
    return !!(el && el.closest && el.closest(EXCLUDE_SELECTOR));
  }

  function isShadowOverlayRobots(content) {
    const c = String(content || '').toLowerCase();
    if (!c.includes('noindex')) return false;
    return SHADOW_ROBOTS_PATTERN.test(c) || (c.includes('nofollow') && c.includes('noarchive'));
  }

  function parsePageMeta(doc) {
    let indexable = true;
    doc.querySelectorAll('meta[name="robots"], meta[name="googlebot"]').forEach((meta) => {
      const content = (meta.getAttribute('content') || '').toLowerCase();
      if (!content.includes('noindex')) return;
      if (!isShadowOverlayRobots(content)) indexable = false;
    });
    let title = '';
    const titleEl = doc.querySelector('title');
    if (titleEl) title = (titleEl.textContent || '').trim();
    if (/shadow mode/i.test(title) || /shadow access/i.test(title)) title = '';
    return { indexable, title };
  }

  function getNodeMeta(path) {
    if (!siteGraph || !siteGraph.nodeMeta) return { indexable: true, title: '' };
    const p = normalizePath(path);
    return siteGraph.nodeMeta[p] || { indexable: true, title: '' };
  }

  function isPathIndexable(path) {
    return getNodeMeta(path).indexable;
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
    const nodeMeta = {};
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
            const meta = parsePageMeta(doc);
            nodeMeta[fromPath] = meta;
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

    nodePaths.forEach((p) => {
      if (!nodeMeta[p]) nodeMeta[p] = { indexable: true, title: '' };
    });

    return { edges, nodePaths: [...nodePaths], pageCount: pageUrls.length, nodeMeta };
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

  function buildDirectoryTree(nodePaths) {
    const pathSet = new Set(nodePaths);
    const protocolNode = {
      id: 'dir-protocol',
      type: 'protocol',
      label: location.protocol.replace(':', ''),
      segment: '',
      path: null,
      children: []
    };
    const hostNode = {
      id: 'dir-host',
      type: 'host',
      label: location.hostname,
      segment: '',
      path: null,
      children: []
    };
    protocolNode.children.push(hostNode);

    const sorted = [...nodePaths].sort((a, b) => a.localeCompare(b));

    sorted.forEach((pagePath) => {
      const segments = pagePath === '/' ? [] : pagePath.split('/').filter(Boolean);
      let current = hostNode;

      if (pagePath === '/') {
        const homeNode = {
          id: 'dir-page-/',
          type: 'page',
          label: 'Home',
          segment: '',
          path: '/',
          children: []
        };
        if (!current.children.some((c) => c.path === '/')) current.children.push(homeNode);
        return;
      }

      segments.forEach((seg, i) => {
        const partial = '/' + segments.slice(0, i + 1).join('/');
        const isPage = pathSet.has(partial) && i === segments.length - 1;
        let child = current.children.find((c) => c.segment === seg);
        if (!child) {
          child = {
            id: 'dir-' + partial,
            type: isPage ? 'page' : 'folder',
            label: isPage ? pathLabel(partial) : seg,
            segment: seg,
            path: isPage ? partial : pathSet.has(partial) ? partial : null,
            children: []
          };
          current.children.push(child);
        } else if (isPage && child.type !== 'page') {
          child.type = 'page';
          child.path = partial;
          child.label = pathLabel(partial);
        }
        current = child;
      });
    });

    hostNode.children.sort((a, b) => {
      const aKey = a.path || a.segment;
      const bKey = b.path || b.segment;
      return String(aKey).localeCompare(String(bKey));
    });

    return protocolNode;
  }

  function buildCrawlTree() {
    if (!siteGraph) return { depths: new Map(), columns: [], unreachable: [], maxDepth: 0 };

    const depths = new Map();
    const start = siteGraph.outbound.has('/') || siteGraph.nodePaths.includes('/') ? '/' : null;

    if (start) {
      const queue = [start];
      depths.set(start, 0);
      while (queue.length) {
        const current = queue.shift();
        const depth = depths.get(current);
        const outs = siteGraph.outbound.get(current) || new Set();
        [...outs].sort().forEach((to) => {
          if (!depths.has(to)) {
            depths.set(to, depth + 1);
            queue.push(to);
          }
        });
      }
    }

    const maxDepth = depths.size ? Math.max(...depths.values()) : 0;
    const columns = [];
    for (let d = 0; d <= maxDepth; d++) {
      const paths = [];
      depths.forEach((depth, path) => {
        if (depth === d) paths.push(path);
      });
      columns.push({ depth: d, paths: paths.sort((a, b) => a.localeCompare(b)) });
    }

    const unreachable = siteGraph.nodePaths
      .filter((p) => !depths.has(p))
      .sort((a, b) => a.localeCompare(b));

    return { depths, columns, unreachable, maxDepth };
  }

  function getIncomingLinkSources(targetPath) {
    if (!siteGraph) return [];
    const target = normalizePath(targetPath);
    const inbound = siteGraph.inbound.get(target) || new Set();
    return [...inbound].sort((a, b) => a.localeCompare(b));
  }

  function getSiteGraphSummary() {
    if (!siteGraph) {
      return { ready: false, pageCount: 0, noindexCount: 0, indexableCount: 0 };
    }
    const pageCount = siteGraph.pageCount || siteGraph.nodePaths.length;
    let noindexCount = 0;
    siteGraph.nodePaths.forEach((p) => {
      if (!isPathIndexable(p)) noindexCount += 1;
    });
    return {
      ready: true,
      pageCount,
      noindexCount,
      indexableCount: pageCount - noindexCount
    };
  }

  function setActiveView(viewId) {
    if (GRAPH_VIEWS.some((v) => v.id === viewId)) {
      activeGraphView = viewId;
      incomingHighlight = viewId === 'incoming-links';
    }
  }

  function setPendingView(viewId) {
    pendingGraphView = viewId;
  }

  function applyPendingView() {
    if (pendingGraphView) {
      setActiveView(pendingGraphView);
      pendingGraphView = null;
    }
  }

  function buildPathTree(nodePaths) {
    const pathSet = new Set(nodePaths);
    const children = new Map();

    nodePaths.forEach((p) => children.set(p, []));

    nodePaths.forEach((child) => {
      if (child === '/') return;
      const parts = child.split('/').filter(Boolean);
      for (let i = parts.length - 1; i >= 1; i--) {
        const parent = '/' + parts.slice(0, i).join('/');
        if (pathSet.has(parent)) {
          const list = children.get(parent);
          if (list && !list.includes(child)) list.push(child);
          break;
        }
      }
      if (parts.length === 1 && pathSet.has('/')) {
        const homeKids = children.get('/');
        if (homeKids && !homeKids.includes(child)) homeKids.push(child);
      }
    });

    children.forEach((list, key) => {
      children.set(
        key,
        list.sort((a, b) => a.localeCompare(b))
      );
    });

    return children;
  }

  function hasChildren(path, pathTree) {
    const tree = pathTree || (siteGraph && siteGraph.pathTree);
    if (!tree) return false;
    const kids = tree.get(normalizePath(path));
    return !!(kids && kids.length > 0);
  }

  function getDirectChildren(path, pathTree) {
    const tree = pathTree || (siteGraph && siteGraph.pathTree);
    if (!tree) return [];
    return tree.get(normalizePath(path)) || [];
  }

  function getSectionKey(path) {
    const p = normalizePath(path);
    if (p === '/') return '/';
    const parts = p.split('/').filter(Boolean);
    return '/' + parts[0];
  }

  function expandKeyFor(centerPath, side, groupId) {
    return normalizePath(centerPath) + ':' + side + ':' + groupId;
  }

  function nodeEntry(path) {
    return { path, label: pathLabel(path), url: pathToUrl(path) };
  }

  function groupNeighborPaths(paths) {
    const bySection = new Map();
    paths.forEach((p) => {
      const key = getSectionKey(p);
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(p);
    });

    const leaves = [];
    const groups = [];

    bySection.forEach((sectionPaths, sectionKey) => {
      const sorted = sectionPaths.sort((a, b) => a.localeCompare(b));
      if (sorted.length === 1) {
        leaves.push(nodeEntry(sorted[0]));
      } else {
        groups.push({
          id: sectionKey,
          label: sectionLabel(sectionKey) + ' (' + sorted.length + ')',
          sectionKey,
          paths: sorted,
          childCount: sorted.length,
          expandable: true
        });
      }
    });

    leaves.sort((a, b) => a.path.localeCompare(b.path));
    groups.sort((a, b) => a.sectionKey.localeCompare(b.sectionKey));

    return { leaves, groups };
  }

  async function buildSiteGraph(onProgress) {
    if (siteGraph) return siteGraph;
    if (graphBuildPromise) return graphBuildPromise;

    graphBuilding = true;
    graphBuildPromise = crawlSiteEdges(onProgress)
      .then(({ edges, nodePaths, pageCount, nodeMeta }) => {
        const adj = buildAdjacency(edges, nodePaths);
        const pathTree = buildPathTree(nodePaths);
        const directoryTree = buildDirectoryTree(nodePaths);
        siteGraph = {
          builtAt: Date.now(),
          pageCount,
          edgeCount: edges.length,
          nodePaths,
          nodeMeta,
          pathTree,
          directoryTree,
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
    expandedGroups.clear();
    return buildSiteGraph(onProgress);
  }

  function getPageGraph(centerPath, options) {
    const center = normalizePath(centerPath);
    const opts = options || {};

    if (!siteGraph) {
      return {
        center,
        ready: false,
        inbound: { leaves: [], groups: [] },
        outbound: { leaves: [], groups: [] },
        expanded: expandedGroups,
        stats: { inboundCount: 0, outboundCount: 0, isOrphan: false, totalPages: 0 }
      };
    }

    const inboundSet = siteGraph.inbound.get(center) || new Set();
    const outboundSet = siteGraph.outbound.get(center) || new Set();

    const inboundPaths = [...inboundSet].sort();
    const outboundPaths = [...outboundSet].sort();

    const inbound = groupNeighborPaths(inboundPaths);
    const outbound = groupNeighborPaths(outboundPaths);

    const inboundCount = inboundPaths.length;
    const outboundCount = outboundPaths.length;
    const isOrphan = center !== '/' && inboundCount === 0;

    return {
      center,
      ready: true,
      inbound,
      outbound,
      expanded: opts.expanded || expandedGroups,
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

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function countGroupedPaths(grouped) {
    return (
      grouped.leaves.length + grouped.groups.reduce((n, g) => n + g.childCount, 0)
    );
  }

  function getLinkHealth(stats) {
    const { inboundCount, outboundCount, isOrphan } = stats;
    const signals = [];
    if (isOrphan) {
      signals.push({
        type: 'warn',
        label: 'Orphan page',
        hint: 'No internal pages link here yet'
      });
    }
    const total = inboundCount + outboundCount;
    if (total >= 8 && inboundCount >= 3 && outboundCount >= 3) {
      signals.push({
        type: 'info',
        label: 'Hub page',
        hint: 'Well connected across the site link structure'
      });
    } else if (outboundCount <= 1 && inboundCount > 0 && !isOrphan) {
      signals.push({
        type: 'muted',
        label: 'Leaf page',
        hint: 'Mostly a destination with few outbound links'
      });
    }
    if (inboundCount > 0 && outboundCount > 0) {
      const diff = Math.abs(inboundCount - outboundCount);
      if (diff <= 2) {
        signals.push({
          type: 'muted',
          label: 'Balanced links',
          hint: 'Similar inbound and outbound counts'
        });
      } else if (inboundCount > outboundCount * 1.5) {
        signals.push({
          type: 'info',
          label: 'Popular destination',
          hint: 'More pages link here than this page links out'
        });
      } else if (outboundCount > inboundCount * 1.5) {
        signals.push({
          type: 'info',
          label: 'Navigation hub',
          hint: 'This page links out more than it receives links'
        });
      }
    }
    return signals;
  }

  function renderLinkHealth(stats) {
    const signals = getLinkHealth(stats);
    if (!signals.length) return '';
    let html = '<div class="shadow-link-tree-health">';
    signals.forEach((sig) => {
      html +=
        '<span class="shadow-link-tree-health-chip shadow-link-tree-health-chip--' +
        escapeAttr(sig.type) +
        '" title="' +
        escapeAttr(sig.hint) +
        '">' +
        escapeHtml(sig.label) +
        '</span>';
    });
    html += '</div>';
    return html;
  }

  function renderLinkTreeLeafInner(path, depth) {
    const label = pathLabel(path);
    const depthClass = depth > 0 ? ' shadow-link-tree-row--nested' : '';
    return (
      '<a class="shadow-link-tree-row shadow-link-tree-row--leaf' +
      depthClass +
      '" href="' +
      escapeAttr(pathToUrl(path)) +
      '" data-graph-path="' +
      escapeAttr(path) +
      '" title="' +
      escapeAttr(path) +
      '">' +
      '<span class="shadow-link-tree-label">' +
      escapeHtml(label) +
      '</span>' +
      '<span class="shadow-link-tree-open" aria-hidden="true">' +
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.5 2.5L8.5 6L3.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>' +
      '</a>'
    );
  }

  function renderLinkTreeLeaf(path, depth) {
    return '<li class="shadow-link-tree-leaf">' + renderLinkTreeLeafInner(path, depth) + '</li>';
  }

  function renderLinkTreeGroup(group, centerPath, side, depth) {
    const key = expandKeyFor(centerPath, side, group.id);
    const isExpanded = expandedGroups.has(key);
    const sectionName = sectionLabel(group.sectionKey);
    let html =
      '<li class="shadow-link-tree-group' +
      (isExpanded ? ' is-expanded' : '') +
      '">' +
      '<button type="button" class="shadow-link-tree-row shadow-link-tree-row--group" data-expand-key="' +
      escapeAttr(key) +
      '" aria-expanded="' +
      (isExpanded ? 'true' : 'false') +
      '">' +
      '<span class="shadow-link-tree-chevron" aria-hidden="true">' +
      (isExpanded ? '▼' : '▶') +
      '</span>' +
      '<span class="shadow-link-tree-label">' +
      escapeHtml(sectionName) +
      '</span>' +
      '<span class="shadow-link-tree-badge">' +
      group.childCount +
      '</span>' +
      '</button>' +
      '<ul class="shadow-link-tree shadow-link-tree-children"' +
      (isExpanded ? '' : ' hidden') +
      '>';
    group.paths.forEach((p) => {
      html += renderLinkTreeLeaf(p, depth + 1);
    });
    html += '</ul></li>';
    return html;
  }

  function getSectionTree(side, grouped, centerPath) {
    const { leaves, groups } = grouped;
    let html = '';
    groups.forEach((g) => {
      html += renderLinkTreeGroup(g, centerPath, side, 0);
    });
    leaves.forEach((leaf) => {
      html += renderLinkTreeLeaf(leaf.path, 0);
    });
    return html;
  }

  function renderLinkTreeSide(title, side, grouped, centerPath, emptyMessage) {
    const total = countGroupedPaths(grouped);
    let body = getSectionTree(side, grouped, centerPath);
    if (!body) {
      body =
        '<li class="shadow-link-tree-empty">' +
        '<p class="shadow-link-tree-empty-text">' +
        escapeHtml(emptyMessage) +
        '</p></li>';
    }
    return (
      '<section class="shadow-link-tree-column" aria-label="' +
      escapeAttr(title) +
      '">' +
      '<h3 class="shadow-link-tree-column-title">' +
      escapeHtml(title) +
      ' <span class="shadow-link-tree-column-count">(' +
      total +
      ')</span></h3>' +
      '<ul class="shadow-link-tree shadow-link-tree-root">' +
      body +
      '</ul></section>'
    );
  }

  function graphNodeIndexClass(path) {
    return isPathIndexable(path)
      ? 'shadow-graph-node--indexable'
      : 'shadow-graph-node--noindex';
  }

  function graphNodeHighlightClass(path, centerPath, inboundSet, highlightInbound) {
    if (!highlightInbound || !inboundSet) return '';
    const p = normalizePath(path);
    const center = normalizePath(centerPath);
    if (p === center) return ' shadow-graph-node--current';
    if (inboundSet.has(p)) return ' shadow-graph-node--highlight-inbound';
    return ' shadow-graph-node--faded';
  }

  function renderGraphLegendButton() {
    return (
      '<button type="button" class="shadow-graph-legend-btn" aria-label="Colour legend" title="Colour legend">' +
      '<span aria-hidden="true">i</span></button>' +
      '<div class="shadow-graph-legend-popover' +
      (legendPopoverOpen ? ' is-open' : '') +
      '" role="dialog" aria-label="Link graph legend">' +
      '<p><span class="shadow-graph-legend-swatch shadow-graph-legend-swatch--indexable"></span> Indexable page</p>' +
      '<p><span class="shadow-graph-legend-swatch shadow-graph-legend-swatch--noindex"></span> Noindex (not for search)</p>' +
      '<p><span class="shadow-graph-legend-swatch shadow-graph-legend-swatch--folder"></span> Folder (not a page)</p>' +
      '<p><span class="shadow-graph-legend-swatch shadow-graph-legend-swatch--inbound"></span> Links to this page</p>' +
      '<p class="shadow-graph-legend-note">Crawl map: larger nodes are closer to home.</p>' +
      '</div>'
    );
  }

  function renderGraphViewSwitcher() {
    let html =
      '<div class="shadow-graph-view-switch" role="tablist" aria-label="Link graph views">';
    GRAPH_VIEWS.forEach((view) => {
      const isActive = activeGraphView === view.id;
      html +=
        '<button type="button" class="shadow-graph-view-switch-btn' +
        (isActive ? ' is-active' : '') +
        '" role="tab" aria-selected="' +
        (isActive ? 'true' : 'false') +
        '" data-graph-view="' +
        escapeAttr(view.id) +
        '">' +
        escapeHtml(view.label) +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderIncomingToggle(centerPath, inboundCount, visible) {
    if (!visible) return '';
    return (
      '<label class="shadow-graph-incoming-toggle">' +
      '<input type="checkbox" class="shadow-graph-incoming-checkbox"' +
      (incomingHighlight ? ' checked' : '') +
      '>' +
      '<span>Show incoming to this page</span>' +
      (inboundCount > 0
        ? ' <span class="shadow-graph-incoming-count">(' + inboundCount + ')</span>'
        : '') +
      '</label>'
    );
  }

  function renderGraphPageNode(path, centerPath, inboundSet, highlightInbound, extraClass) {
    const p = normalizePath(path);
    const isCurrent = p === normalizePath(centerPath);
    const meta = getNodeMeta(p);
    const label = meta.title || pathLabel(p);
    const classes =
      'shadow-graph-page-node ' +
      graphNodeIndexClass(p) +
      graphNodeHighlightClass(p, centerPath, inboundSet, highlightInbound) +
      (isCurrent ? ' shadow-graph-node--current' : '') +
      (extraClass ? ' ' + extraClass : '');

    return (
      '<a class="' +
      classes +
      '" href="' +
      escapeAttr(pathToUrl(p)) +
      '" data-graph-path="' +
      escapeAttr(p) +
      '" title="' +
      escapeAttr(p) +
      '">' +
      '<span class="shadow-graph-page-node__label">' +
      escapeHtml(label) +
      '</span>' +
      '<span class="shadow-graph-page-node__path">' +
      escapeHtml(p) +
      '</span>' +
      '</a>'
    );
  }

  function renderDirectoryTreeNode(node, centerPath, depth, inboundSet, highlightInbound) {
    const hasKids = node.children && node.children.length > 0;
    const isFolder = node.type !== 'page';
    const expandKey = 'dir:' + node.id;
    const isExpanded = expandedGroups.has(expandKey) || depth < 2;

    if (node.type === 'page' && node.path) {
      return (
        '<li class="shadow-graph-dir-leaf">' +
        renderGraphPageNode(node.path, centerPath, inboundSet, highlightInbound) +
        '</li>'
      );
    }

    let html =
      '<li class="shadow-graph-dir-group shadow-graph-node--folder' +
      (isExpanded ? ' is-expanded' : '') +
      '">';
    if (hasKids) {
      html +=
        '<button type="button" class="shadow-graph-dir-row" data-expand-key="' +
        escapeAttr(expandKey) +
        '" aria-expanded="' +
        (isExpanded ? 'true' : 'false') +
        '">' +
        '<span class="shadow-link-tree-chevron" aria-hidden="true">' +
        (isExpanded ? '▼' : '▶') +
        '</span>' +
        '<span class="shadow-graph-dir-label">' +
        escapeHtml(node.label) +
        '</span>' +
        '</button>' +
        '<ul class="shadow-graph-dir-children shadow-link-tree-children"' +
        (isExpanded ? '' : ' hidden') +
        '>';
      node.children.forEach((child) => {
        html += renderDirectoryTreeNode(child, centerPath, depth + 1, inboundSet, highlightInbound);
      });
      html += '</ul>';
    } else {
      html +=
        '<span class="shadow-graph-dir-row shadow-graph-dir-row--muted">' +
        '<span class="shadow-graph-dir-label">' +
        escapeHtml(node.label) +
        '</span></span>';
    }
    html += '</li>';
    return html;
  }

  function renderDirectoryTreeView(centerPath, highlightInbound) {
    if (!siteGraph || !siteGraph.directoryTree) {
      return '<p class="shadow-hint">Directory tree not available yet.</p>';
    }
    const inboundSet = new Set(getIncomingLinkSources(centerPath));
    const inboundCount = inboundSet.size;
    let html =
      '<div class="shadow-graph-dir-panel">' +
      '<div class="shadow-graph-dir-toolbar">' +
      renderIncomingToggle(centerPath, inboundCount, activeGraphView !== 'incoming-links') +
      '</div>' +
      '<ul class="shadow-graph-dir-tree shadow-link-tree-root">';
    html += renderDirectoryTreeNode(
      siteGraph.directoryTree,
      centerPath,
      0,
      inboundSet,
      highlightInbound
    );
    html += '</ul></div>';
    return html;
  }

  function renderCrawlMapView(centerPath, highlightInbound) {
    const crawl = buildCrawlTree();
    const inboundSet = new Set(getIncomingLinkSources(centerPath));
    const inboundCount = inboundSet.size;
    let html =
      '<div class="shadow-graph-crawl-panel">' +
      '<div class="shadow-graph-dir-toolbar">' +
      renderIncomingToggle(centerPath, inboundCount, activeGraphView !== 'incoming-links') +
      '</div>' +
      '<div class="shadow-graph-crawl-map">';

    crawl.columns.forEach((col) => {
      const depthClass = 'shadow-crawl-depth-' + col.depth;
      const paths = col.paths;
      const overflow = paths.length > MAX_CRAWL_COLUMN_NODES;
      const shown = overflow ? paths.slice(0, MAX_CRAWL_COLUMN_NODES) : paths;
      html +=
        '<section class="shadow-graph-crawl-column ' +
        depthClass +
        '" aria-label="Depth ' +
        col.depth +
        '">' +
        '<h4 class="shadow-graph-crawl-column-title">Depth ' +
        col.depth +
        '</h4>' +
        '<div class="shadow-graph-crawl-column-body">';
      shown.forEach((path) => {
        html +=
          '<div class="shadow-graph-crawl-node-wrap">' +
          renderGraphPageNode(
            path,
            centerPath,
            inboundSet,
            highlightInbound,
            'shadow-graph-crawl-node shadow-crawl-depth-' + col.depth
          ) +
          '</div>';
      });
      if (overflow) {
        html +=
          '<p class="shadow-graph-crawl-more">+' +
          (paths.length - MAX_CRAWL_COLUMN_NODES) +
          ' more in this column</p>';
      }
      html += '</div></section>';
    });

    if (crawl.unreachable.length) {
      html +=
        '<section class="shadow-graph-crawl-column shadow-graph-crawl-column--orphan" aria-label="Not reached from home">' +
        '<h4 class="shadow-graph-crawl-column-title">Not from home</h4>' +
        '<div class="shadow-graph-crawl-column-body">';
      crawl.unreachable.forEach((path) => {
        html +=
          '<div class="shadow-graph-crawl-node-wrap">' +
          renderGraphPageNode(path, centerPath, inboundSet, highlightInbound, 'shadow-graph-crawl-node') +
          '</div>';
      });
      html += '</div></section>';
    }

    html += '</div></div>';
    return html;
  }

  function renderThisPageView(graph) {
    return (
      '<div class="shadow-link-tree-split">' +
      renderLinkTreeSide(
        'Links TO this page',
        'in',
        graph.inbound,
        graph.center,
        'No internal pages link here yet'
      ) +
      renderLinkTreeSide(
        'Links FROM this page',
        'out',
        graph.outbound,
        graph.center,
        'This page has no internal outbound links'
      ) +
      '</div>' +
      '<p class="shadow-link-tree-legend">Grouped by site section · tap to expand</p>'
    );
  }

  function renderActiveGraphBody(graph) {
    const center = graph.center;
    const highlightInbound =
      incomingHighlight || activeGraphView === 'incoming-links';
    if (activeGraphView === 'this-page') return renderThisPageView(graph);
    if (activeGraphView === 'url-structure' || activeGraphView === 'incoming-links') {
      return renderDirectoryTreeView(center, highlightInbound);
    }
    if (activeGraphView === 'crawl-map') {
      return renderCrawlMapView(center, highlightInbound);
    }
    return renderThisPageView(graph);
  }

  function renderGraphViewHeader(graph) {
    const inboundCount = graph.stats.inboundCount;
    let titleExtra = '';
    if (
      (incomingHighlight || activeGraphView === 'incoming-links') &&
      inboundCount > 0
    ) {
      titleExtra =
        ' <span class="shadow-graph-inbound-header-count">' +
        inboundCount +
        ' linking here</span>';
    }
    return (
      '<header class="shadow-link-tree-header">' +
      '<div class="shadow-graph-header-row">' +
      renderGraphViewSwitcher() +
      '<div class="shadow-graph-header-actions">' +
      titleExtra +
      renderGraphLegendButton() +
      '</div></div>' +
      '<code class="shadow-link-tree-page" title="Current page">' +
      escapeHtml(graph.center) +
      '</code>' +
      renderGraphStats(graph) +
      renderLinkHealth(graph.stats) +
      '</header>'
    );
  }

  function renderGraphSummaryLine() {
    const summary = getSiteGraphSummary();
    if (!summary.ready) {
      return '<p class="shadow-graph-summary-line shadow-graph-summary-line--loading">Building site graph…</p>';
    }
    const noindexPart =
      summary.noindexCount > 0
        ? ' · ' + summary.noindexCount + ' noindex'
        : '';
    return (
      '<p class="shadow-graph-summary-line">' +
      '<span>' +
      summary.pageCount +
      ' pages' +
      escapeHtml(noindexPart) +
      '</span>' +
      '<button type="button" class="shadow-btn-text shadow-graph-open-structure">Open URL structure</button>' +
      '</p>'
    );
  }

  function renderLinkTreePanel(graph) {
    let html =
      '<div class="shadow-link-tree-panel">' +
      renderGraphViewHeader(graph) +
      '<div class="shadow-graph-view-body" data-graph-view="' +
      escapeAttr(activeGraphView) +
      '">' +
      renderActiveGraphBody(graph) +
      '</div>' +
      '<div class="shadow-graph-actions">' +
      '<button type="button" class="shadow-btn shadow-btn-secondary shadow-graph-rebuild">Rebuild graph</button>' +
      '</div></div>';
    return html;
  }

  function previewSectionNames(grouped, limit) {
    const names = [];
    grouped.groups.forEach((g) => {
      names.push(sectionLabel(g.sectionKey) + ' (' + g.childCount + ')');
    });
    grouped.leaves.forEach((leaf) => {
      names.push(leaf.label);
    });
    const shown = names.slice(0, limit);
    const extra = names.length - shown.length;
    if (extra > 0) shown.push('+' + extra + ' more');
    return shown.join(', ') || 'None';
  }

  function renderCompactLinkPreview(graph) {
    const inPreview = previewSectionNames(graph.inbound, 2);
    const outPreview = previewSectionNames(graph.outbound, 2);
    return (
      '<div class="shadow-link-tree-mini">' +
      '<p class="shadow-link-tree-mini-line"><span class="shadow-link-tree-mini-label">Inbound</span> ' +
      escapeHtml(inPreview) +
      '</p>' +
      '<p class="shadow-link-tree-mini-line"><span class="shadow-link-tree-mini-label">Outbound</span> ' +
      escapeHtml(outPreview) +
      '</p>' +
      renderLinkHealth(graph.stats) +
      '</div>'
    );
  }

  function toggleDirectoryGroup(button) {
    toggleLinkTreeGroup(button);
  }

  function bindGraphPanelControls(container, centerPath, options) {
    if (!container) return;
    const opts = options || {};

    container.querySelectorAll('.shadow-graph-view-switch-btn').forEach((btn) => {
      if (btn._graphViewBound) return;
      btn._graphViewBound = true;
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-graph-view');
        if (!view) return;
        setActiveView(view);
        renderGraphPanel(container, centerPath, opts);
      });
    });

    const legendBtn = container.querySelector('.shadow-graph-legend-btn');
    if (legendBtn && !legendBtn._bound) {
      legendBtn._bound = true;
      legendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        legendPopoverOpen = !legendPopoverOpen;
        const pop = container.querySelector('.shadow-graph-legend-popover');
        if (pop) pop.classList.toggle('is-open', legendPopoverOpen);
      });
    }

    const incomingCheck = container.querySelector('.shadow-graph-incoming-checkbox');
    if (incomingCheck && !incomingCheck._bound) {
      incomingCheck._bound = true;
      incomingCheck.addEventListener('change', () => {
        incomingHighlight = incomingCheck.checked;
        if (activeGraphView === 'incoming-links' && !incomingHighlight) {
          setActiveView('url-structure');
        }
        renderGraphPanel(container, centerPath, opts);
      });
    }

    const openStructure = container.querySelector('.shadow-graph-open-structure');
    if (openStructure && !openStructure._bound) {
      openStructure._bound = true;
      openStructure.addEventListener('click', () => {
        setActiveView('url-structure');
        if (opts.onOpenStructure) opts.onOpenStructure();
        else if (container.closest('.shadow-activity-graph')) {
          renderGraphPanel(container.closest('.shadow-activity-graph') || container, centerPath, opts);
        } else {
          renderGraphPanel(container, centerPath, opts);
        }
      });
    }
  }

  function bindLinkTreeInteractions(container, centerPath, options) {
    if (!container) return;
    const opts = options || {};

    bindGraphPanelControls(container, centerPath, opts);

    if (container._linkTreeBound) {
      container._graphInteractCenter = centerPath;
      container._graphInteractOpts = opts;
      return;
    }
    container._linkTreeBound = true;
    container._graphInteractCenter = centerPath;
    container._graphInteractOpts = opts;

    container.addEventListener('click', (event) => {
      const viewBtn = event.target.closest('.shadow-graph-view-switch-btn');
      if (viewBtn) return;

      const legendBtn = event.target.closest('.shadow-graph-legend-btn');
      if (legendBtn) return;

      const dirBtn = event.target.closest('.shadow-graph-dir-row[data-expand-key]');
      if (dirBtn) {
        event.preventDefault();
        toggleDirectoryGroup(dirBtn);
        return;
      }

      const groupBtn = event.target.closest('.shadow-link-tree-row--group');
      if (groupBtn) {
        event.preventDefault();
        toggleLinkTreeGroup(groupBtn);
        return;
      }

      const pageNode = event.target.closest('.shadow-graph-page-node');
      if (pageNode && pageNode.tagName === 'A') {
        event.preventDefault();
        const path = pageNode.getAttribute('data-graph-path');
        if (path) location.href = pathToUrl(path);
        return;
      }

      const leafLink = event.target.closest('.shadow-link-tree-row--leaf');
      if (leafLink && leafLink.tagName === 'A') {
        event.preventDefault();
        const path = leafLink.getAttribute('data-graph-path');
        if (path) location.href = pathToUrl(path);
      }
    });

    container.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const dirBtn = event.target.closest('.shadow-graph-dir-row[data-expand-key]');
      if (dirBtn) {
        event.preventDefault();
        toggleDirectoryGroup(dirBtn);
        return;
      }
      const groupBtn = event.target.closest('.shadow-link-tree-row--group');
      if (groupBtn) {
        event.preventDefault();
        toggleLinkTreeGroup(groupBtn);
      }
    });

    document.addEventListener('click', (event) => {
      if (!legendPopoverOpen) return;
      if (event.target.closest('.shadow-graph-legend-btn')) return;
      if (event.target.closest('.shadow-graph-legend-popover')) return;
      legendPopoverOpen = false;
      const pop = container.querySelector('.shadow-graph-legend-popover');
      if (pop) pop.classList.remove('is-open');
    });
  }

  function toggleLinkTreeGroup(button) {
    const key = button.getAttribute('data-expand-key');
    if (!key) return;
    const willExpand = !expandedGroups.has(key);
    if (willExpand) expandedGroups.add(key);
    else expandedGroups.delete(key);

    button.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
    const group =
      button.closest('.shadow-link-tree-group') ||
      button.closest('.shadow-graph-dir-group');
    if (group) group.classList.toggle('is-expanded', willExpand);
    const chevron = button.querySelector('.shadow-link-tree-chevron');
    if (chevron) chevron.textContent = willExpand ? '▼' : '▶';
    const children =
      group
        ? group.querySelector(
            ':scope > .shadow-link-tree-children, :scope > .shadow-graph-dir-children'
          )
        : null;
    if (children) children.hidden = !willExpand;
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

    applyPendingView();

    let html;
    if (opts.compact) {
      html = renderCompactLinkPreview(graph);
    } else {
      html = renderLinkTreePanel(graph);
    }
    container.innerHTML = html;
    bindLinkTreeInteractions(container, centerPath, opts);

    if (opts.compact && container.parentElement) {
      const existingLine = container.parentElement.querySelector('.shadow-graph-summary-line');
      if (existingLine) {
        const wrap = document.createElement('div');
        wrap.innerHTML = renderGraphSummaryLine();
        const newLine = wrap.firstElementChild;
        if (newLine) existingLine.replaceWith(newLine);
      }
    }

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
    renderLinkTreePanel,
    renderGraphStats,
    renderGraphSummaryLine,
    getSiteGraphSummary,
    getIncomingLinkSources,
    buildDirectoryTree,
    buildCrawlTree,
    setActiveView,
    setPendingView,
    getSectionTree,
    normalizePath,
    hasChildren,
    getDirectChildren,
    isGraphReady,
    isGraphBuilding
  };
})();
