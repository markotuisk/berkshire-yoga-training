/**
 * Shadow mode site link graph — sitemap crawl, adjacency, expandable link tree panels.
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
  const expandedGroups = new Set();

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
      .then(({ edges, nodePaths, pageCount }) => {
        const adj = buildAdjacency(edges, nodePaths);
        const pathTree = buildPathTree(nodePaths);
        siteGraph = {
          builtAt: Date.now(),
          pageCount,
          edgeCount: edges.length,
          nodePaths,
          pathTree,
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

  function renderSiteMapNode(path, centerPath, depth) {
    const children = getDirectChildren(path);
    const isCurrent = normalizePath(path) === normalizePath(centerPath);
    const label = pathLabel(path);
    const hasKids = children.length > 0;
    const key = expandKeyFor(centerPath, 'sitemap', path);
    const isExpanded = expandedGroups.has(key) || depth === 0;

    if (!hasKids) {
      return (
        '<li class="shadow-link-tree-leaf' +
        (isCurrent ? ' shadow-link-tree-leaf--current' : '') +
        '">' +
        renderLinkTreeLeafInner(path, depth) +
        '</li>'
      );
    }

    let html =
      '<li class="shadow-link-tree-group shadow-link-tree-group--sitemap' +
      (isExpanded ? ' is-expanded' : '') +
      (isCurrent ? ' shadow-link-tree-group--current' : '') +
      '">' +
      '<button type="button" class="shadow-link-tree-row shadow-link-tree-row--group shadow-link-tree-row--sitemap" data-expand-key="' +
      escapeAttr(key) +
      '" aria-expanded="' +
      (isExpanded ? 'true' : 'false') +
      '">' +
      '<span class="shadow-link-tree-chevron" aria-hidden="true">' +
      (isExpanded ? '▼' : '▶') +
      '</span>' +
      '<span class="shadow-link-tree-label">' +
      escapeHtml(label) +
      '</span>' +
      '<span class="shadow-link-tree-path">' +
      escapeHtml(path) +
      '</span>' +
      '</button>' +
      '<ul class="shadow-link-tree shadow-link-tree-children"' +
      (isExpanded ? '' : ' hidden') +
      '>';
    children.forEach((child) => {
      html += renderSiteMapNode(child, centerPath, depth + 1);
    });
    html += '</ul></li>';
    return html;
  }

  function renderSiteMapSection(centerPath) {
    if (!siteGraph || !siteGraph.pathTree) return '';
    const rootChildren = getDirectChildren('/');
    let treeHtml = '';
    if (siteGraph.pathTree.has('/')) {
      treeHtml = renderSiteMapNode('/', centerPath, 0);
    } else {
      treeHtml = '<ul class="shadow-link-tree shadow-link-tree-root">';
      rootChildren.forEach((child) => {
        treeHtml += renderSiteMapNode(child, centerPath, 0);
      });
      treeHtml += '</ul>';
    }
    return (
      '<details class="shadow-link-tree-sitemap">' +
      '<summary class="shadow-link-tree-sitemap-summary">Site map</summary>' +
      '<div class="shadow-link-tree-sitemap-body">' +
      treeHtml +
      '</div></details>'
    );
  }

  function renderLinkTreePanel(graph) {
    const s = graph.stats;
    let html =
      '<div class="shadow-link-tree-panel">' +
      '<header class="shadow-link-tree-header">' +
      '<code class="shadow-link-tree-page" title="Current page">' +
      escapeHtml(graph.center) +
      '</code>' +
      renderGraphStats(graph) +
      renderLinkHealth(s) +
      '</header>' +
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
      renderSiteMapSection(graph.center) +
      '<p class="shadow-link-tree-legend">Grouped by site section · tap to expand</p>' +
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

  function toggleLinkTreeGroup(button) {
    const key = button.getAttribute('data-expand-key');
    if (!key) return;
    const willExpand = !expandedGroups.has(key);
    if (willExpand) expandedGroups.add(key);
    else expandedGroups.delete(key);

    button.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
    const group = button.closest('.shadow-link-tree-group');
    if (group) group.classList.toggle('is-expanded', willExpand);
    const chevron = button.querySelector('.shadow-link-tree-chevron');
    if (chevron) chevron.textContent = willExpand ? '▼' : '▶';
    const children = group ? group.querySelector(':scope > .shadow-link-tree-children') : null;
    if (children) children.hidden = !willExpand;
  }

  function bindLinkTreeInteractions(container, centerPath, options) {
    if (!container) return;
    const opts = options || {};

    if (container._linkTreeBound) {
      container._graphInteractCenter = centerPath;
      container._graphInteractOpts = opts;
      return;
    }
    container._linkTreeBound = true;
    container._graphInteractCenter = centerPath;
    container._graphInteractOpts = opts;

    container.addEventListener('click', (event) => {
      const groupBtn = event.target.closest('.shadow-link-tree-row--group');
      if (groupBtn) {
        event.preventDefault();
        toggleLinkTreeGroup(groupBtn);
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
      const groupBtn = event.target.closest('.shadow-link-tree-row--group');
      if (groupBtn) {
        event.preventDefault();
        toggleLinkTreeGroup(groupBtn);
      }
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

    let html;
    if (opts.compact) {
      html = renderCompactLinkPreview(graph);
    } else {
      html = renderLinkTreePanel(graph);
    }
    container.innerHTML = html;
    bindLinkTreeInteractions(container, centerPath, opts);

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
    getSectionTree,
    normalizePath,
    hasChildren,
    getDirectChildren,
    isGraphReady,
    isGraphBuilding
  };
})();
