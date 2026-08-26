/**
 * Shadow mode site link graph — sitemap crawl, adjacency, radial SVG with grouped sections.
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

  function buildDisplayItems(side, grouped, center, compact) {
    const items = [];
    const { leaves, groups } = grouped;

    groups.forEach((g) => {
      const key = expandKeyFor(center, side, g.id);
      const isExpanded = expandedGroups.has(key);
      if (isExpanded) {
        items.push({
          type: 'anchor',
          groupId: g.id,
          label: g.label,
          expandKey: key,
          expanded: true
        });
        g.paths.forEach((p) => {
          items.push({
            type: 'leaf',
            path: p,
            label: pathLabel(p),
            isChild: true,
            parentGroupId: g.id
          });
        });
      } else {
        items.push({
          type: 'group',
          groupId: g.id,
          label: g.label,
          paths: g.paths,
          childCount: g.childCount,
          expandable: g.expandable,
          expandKey: key,
          expanded: false
        });
      }
    });

    leaves.forEach((leaf) => {
      const children = getDirectChildren(leaf.path);
      const key = expandKeyFor(center, side, 'path:' + leaf.path);
      const isExpanded = expandedGroups.has(key);

      if (children.length > 0 && isExpanded) {
        items.push({
          type: 'anchor',
          path: leaf.path,
          label: leaf.label,
          expandKey: key,
          expanded: true
        });
        children.forEach((childPath) => {
          items.push({
            type: 'leaf',
            path: childPath,
            label: pathLabel(childPath),
            isChild: true,
            parentPath: leaf.path
          });
        });
      } else {
        items.push({
          type: 'leaf',
          path: leaf.path,
          label: leaf.label,
          expandable: children.length > 0,
          expandKey: children.length > 0 ? key : null,
          expanded: isExpanded,
          isChild: false
        });
      }
    });

    if (compact) {
      const groupItems = items.filter((i) => i.type === 'group');
      const leafItems = items.filter((i) => i.type === 'leaf' && !i.isChild);
      const anchorItems = items.filter((i) => i.type === 'anchor');
      const childItems = items.filter((i) => i.isChild);
      const shownGroups = groupItems.slice(0, 2);
      const shownLeaves = leafItems.slice(0, 2);
      const hiddenSections =
        groupItems.length - shownGroups.length + (leafItems.length - shownLeaves.length);
      return {
        items: [...shownGroups, ...shownLeaves, ...anchorItems, ...childItems],
        hiddenSections: hiddenSections > 0 ? hiddenSections : 0
      };
    }

    return { items, hiddenSections: 0 };
  }

  function renderExpandBadge(x, y, expandKey, expanded, ariaLabel) {
    const badgeR = 8;
    const bx = x + 10;
    const by = y + 10;
    const symbol = expanded ? '−' : '+';
    const action = expanded ? 'Collapse' : 'Expand';
    return (
      '<g class="shadow-graph-expand" data-expand-key="' +
      escapeAttr(expandKey) +
      '" tabindex="0" role="button" aria-label="' +
      escapeAttr(action + ' ' + ariaLabel) +
      '">' +
      '<circle class="shadow-graph-expand-bg" cx="' +
      bx +
      '" cy="' +
      by +
      '" r="' +
      badgeR +
      '"/>' +
      '<text class="shadow-graph-expand-icon" x="' +
      bx +
      '" y="' +
      by +
      '" text-anchor="middle" dominant-baseline="central">' +
      symbol +
      '</text>' +
      '</g>'
    );
  }

  function renderRadialSvg(graph, options) {
    const opts = options || {};
    const compact = !!opts.compact;
    const width = compact ? 220 : 360;
    const height = compact ? 160 : 320;
    const cx = width / 2;
    const cy = height / 2;
    const rCenter = compact ? 16 : 22;
    const rNode = compact ? 10 : 14;
    const rGroup = compact ? 12 : 17;
    const orbit = compact ? 58 : 110;
    const childOrbit = compact ? 22 : 32;

    const inDisplay = buildDisplayItems('in', graph.inbound, graph.center, compact);
    const outDisplay = buildDisplayItems('out', graph.outbound, graph.center, compact);

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

    function hasEdgeTo(path) {
      if (!siteGraph) return false;
      const out = siteGraph.outbound.get(graph.center);
      const inn = siteGraph.inbound.get(graph.center);
      return (out && out.has(path)) || (inn && inn.has(path));
    }

    function placeItems(items, startAngle, endAngle, side) {
      if (!items.length) return '';
      let html = '';
      const primary = items.filter((i) => !i.isChild);
      const children = items.filter((i) => i.isChild);
      const allowExpand = !compact;

      const parentAngles = new Map();
      const parentCollapseKeys = new Map();

      primary.forEach((item, i) => {
        const angle =
          primary.length === 1
            ? (startAngle + endAngle) / 2
            : startAngle + ((endAngle - startAngle) * i) / (primary.length - 1);
        const pos = polar(angle, orbit);
        const isGroup = item.type === 'group';
        const isAnchor = item.type === 'anchor';
        const r = isGroup ? rGroup : rNode;
        const nodeClass =
          'shadow-graph-node' +
          (isGroup ? ' shadow-graph-node--group' : isAnchor ? ' shadow-graph-node--anchor' : ' shadow-graph-node--link') +
          (item.isChild ? ' shadow-graph-node--child shadow-graph-node--enter' : '');

        if (isGroup) {
          parentAngles.set(item.groupId, angle);
          parentCollapseKeys.set(item.groupId, item.expandKey);
        }
        if (isAnchor) {
          const anchorKey = item.groupId || item.path;
          parentAngles.set(anchorKey, angle);
          parentCollapseKeys.set(anchorKey, item.expandKey);
        }

        if (isAnchor) {
          if (allowExpand) {
            html += renderExpandBadge(pos.x, pos.y, item.expandKey, true, item.label);
          }
        } else {
          html +=
            '<line class="shadow-graph-edge' +
            (item.isChild ? ' shadow-graph-edge--child' : '') +
            '" x1="' +
            cx +
            '" y1="' +
            cy +
            '" x2="' +
            pos.x +
            '" y2="' +
            pos.y +
            '"/>';

          if (isGroup) {
            html +=
              '<g class="' +
              nodeClass +
              '" data-expand-key="' +
              escapeAttr(item.expandKey) +
              '" tabindex="0" role="button" aria-label="' +
              escapeAttr(item.label) +
              '">' +
              '<circle cx="' +
              pos.x +
              '" cy="' +
              pos.y +
              '" r="' +
              r +
              '"/>' +
              '<title>' +
              escapeAttr(item.paths.join(', ')) +
              '</title>' +
              '</g>';
            if (allowExpand && item.expandable) {
              html += renderExpandBadge(pos.x, pos.y, item.expandKey, false, item.label);
            }
          } else {
            html +=
              '<g class="' +
              nodeClass +
              '" data-graph-path="' +
              escapeAttr(item.path) +
              '" tabindex="0" role="link" aria-label="' +
              escapeAttr(item.label) +
              '">' +
              '<circle cx="' +
              pos.x +
              '" cy="' +
              pos.y +
              '" r="' +
              r +
              '"/>' +
              '<title>' +
              escapeAttr(item.path) +
              '</title>' +
              '</g>';
            if (allowExpand && item.expandable && item.expandKey) {
              html += renderExpandBadge(pos.x, pos.y, item.expandKey, item.expanded, item.label);
            }
          }
        }
      });

      if (!allowExpand) return html;

      const childBuckets = new Map();
      children.forEach((child) => {
        const bucketKey = child.parentGroupId || child.parentPath || 'misc';
        if (!childBuckets.has(bucketKey)) childBuckets.set(bucketKey, []);
        childBuckets.get(bucketKey).push(child);
      });

      childBuckets.forEach((bucket, bucketKey) => {
        const parentAngle = parentAngles.get(bucketKey);
        const baseAngle = parentAngle != null ? parentAngle : (startAngle + endAngle) / 2;
        const spread = Math.min(0.5, bucket.length * 0.12);

        bucket.forEach((child, ci) => {
          const angle =
            bucket.length === 1
              ? baseAngle
              : baseAngle - spread / 2 + (spread * ci) / (bucket.length - 1);
          const pos = polar(angle, orbit + childOrbit);

          if (hasEdgeTo(child.path)) {
            html +=
              '<line class="shadow-graph-edge shadow-graph-edge--child" x1="' +
              cx +
              '" y1="' +
              cy +
              '" x2="' +
              pos.x +
              '" y2="' +
              pos.y +
              '"/>';
          }

          html +=
            '<g class="shadow-graph-node shadow-graph-node--link shadow-graph-node--child shadow-graph-node--enter" data-graph-path="' +
            escapeAttr(child.path) +
            '" tabindex="0" role="link" aria-label="' +
            escapeAttr(child.label) +
            '">' +
            '<circle cx="' +
            pos.x +
            '" cy="' +
            pos.y +
            '" r="' +
            (rNode - 2) +
            '"/>' +
            '<title>' +
            escapeAttr(child.path) +
            '</title>' +
            '</g>';

          const subChildren = getDirectChildren(child.path);
          if (subChildren.length > 0) {
            const childKey = expandKeyFor(graph.center, side, 'path:' + child.path);
            const childExpanded = expandedGroups.has(childKey);
            html += renderExpandBadge(pos.x, pos.y, childKey, childExpanded, child.label);
          }
        });
      });

      return html;
    }

    svg += placeItems(inDisplay.items, Math.PI * 0.55, Math.PI * 1.45, 'in');
    svg += placeItems(outDisplay.items, -Math.PI * 0.45, Math.PI * 0.45, 'out');

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

    const hiddenTotal = inDisplay.hiddenSections + outDisplay.hiddenSections;
    if (compact && hiddenTotal > 0) {
      svg +=
        '<text class="shadow-graph-more" x="' +
        cx +
        '" y="' +
        (height - 8) +
        '" text-anchor="middle">+' +
        hiddenTotal +
        ' sections</text>';
    } else if (!compact) {
      const totalIn =
        graph.inbound.leaves.length +
        graph.inbound.groups.reduce((n, g) => n + g.childCount, 0);
      const totalOut =
        graph.outbound.leaves.length +
        graph.outbound.groups.reduce((n, g) => n + g.childCount, 0);
      const shownIn = inDisplay.items.filter((i) => !i.isChild).length;
      const shownOut = outDisplay.items.filter((i) => !i.isChild).length;
      if (totalIn > shownIn || totalOut > shownOut) {
        svg +=
          '<text class="shadow-graph-more" x="' +
          cx +
          '" y="' +
          (height - 12) +
          '" text-anchor="middle">Expand groups to see all links</text>';
      }
    }

    svg += '</svg>';
    return svg;
  }

  function bindGraphInteractions(container, centerPath, options) {
    if (!container) return;
    const opts = options || {};

    if (container._graphInteractBound) {
      container._graphInteractCenter = centerPath;
      container._graphInteractOpts = opts;
      return;
    }
    container._graphInteractBound = true;
    container._graphInteractCenter = centerPath;
    container._graphInteractOpts = opts;

    container.addEventListener('click', (event) => {
      const expandBtn = event.target.closest('.shadow-graph-expand');
      if (expandBtn) {
        event.preventDefault();
        event.stopPropagation();
        const key = expandBtn.getAttribute('data-expand-key');
        if (!key) return;
        if (expandedGroups.has(key)) expandedGroups.delete(key);
        else expandedGroups.add(key);
        renderGraphPanel(container, container._graphInteractCenter, container._graphInteractOpts);
        return;
      }

      const groupNode = event.target.closest('.shadow-graph-node--group');
      if (groupNode) {
        event.preventDefault();
        event.stopPropagation();
        const key = groupNode.getAttribute('data-expand-key');
        if (!key) return;
        if (expandedGroups.has(key)) expandedGroups.delete(key);
        else expandedGroups.add(key);
        renderGraphPanel(container, container._graphInteractCenter, container._graphInteractOpts);
        return;
      }

      const linkNode = event.target.closest('.shadow-graph-node--link');
      if (!linkNode || linkNode.classList.contains('shadow-graph-node--center')) return;
      const path = linkNode.getAttribute('data-graph-path');
      if (!path) return;
      location.href = pathToUrl(path);
    });

    container.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const expandBtn = event.target.closest('.shadow-graph-expand');
      if (expandBtn) {
        event.preventDefault();
        expandBtn.click();
        return;
      }

      const groupNode = event.target.closest('.shadow-graph-node--group');
      if (groupNode) {
        event.preventDefault();
        groupNode.click();
        return;
      }

      const linkNode = event.target.closest('.shadow-graph-node--link');
      if (!linkNode || linkNode.classList.contains('shadow-graph-node--center')) return;
      event.preventDefault();
      const path = linkNode.getAttribute('data-graph-path');
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
        '<p class="shadow-graph-legend">Grouped by section · tap + to expand subpages</p>' +
        '<div class="shadow-graph-actions">' +
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-graph-rebuild">Rebuild graph</button>' +
        '</div>';
    }
    container.innerHTML = html;
    bindGraphInteractions(container, centerPath, opts);

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
    hasChildren,
    getDirectChildren,
    isGraphReady,
    isGraphBuilding
  };
})();
