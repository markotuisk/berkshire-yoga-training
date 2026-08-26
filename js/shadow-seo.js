/**
 * Shadow mode client-side SEO audit — parses current page DOM only.
 */
(function () {
  'use strict';

  const LIVE_CANONICAL_HOST = 'berkshireyogatraining.co.uk';
  const EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge';

  const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'meta', label: 'Meta' },
    { id: 'og', label: 'Open Graph' },
    { id: 'twitter', label: 'Twitter' },
    { id: 'security', label: 'Security' },
    { id: 'headings', label: 'Headings' },
    { id: 'images', label: 'Images' },
    { id: 'links', label: 'Links' },
    { id: 'structured', label: 'Structured data' },
    { id: 'technical', label: 'Technical' }
  ];

  const META_FIELDS = [
    ['Title', 'title', {}],
    ['Meta description', 'description', { emptyLabel: 'Missing' }],
    ['URL', 'url', { mono: true, truncate: 72 }],
    ['Canonical', 'canonical', { mono: true, truncate: 72, emptyLabel: 'Not set' }],
    ['Robots', 'robots', { emptyLabel: 'Not set' }],
    ['Keywords', 'keywords', { emptyLabel: 'Not set' }],
    ['Author', 'author', { emptyLabel: 'Not set' }],
    ['Publisher', 'publisher', { emptyLabel: 'Not set' }],
    ['Language', 'lang', { emptyLabel: 'Not set' }],
    ['Word count', 'wordCount', {}]
  ];

  const OG_FIELDS = [
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:type',
    'og:locale',
    'og:site_name'
  ];

  const TWITTER_FIELDS = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image'
  ];

  let helpers = null;
  let activeSection = 'overview';
  let highlightOn = false;
  let overlayLayer = null;
  let overlayNodes = [];
  let lastAuditData = null;
  let locateHighlightEl = null;
  let locateHighlightTimer = null;

  const META_LOCATE_KEYS = {
    title: 'meta-title',
    description: 'meta-description',
    canonical: 'meta-canonical',
    robots: 'meta-robots',
    keywords: 'meta-keywords',
    author: 'meta-author',
    publisher: 'meta-publisher',
    lang: 'meta-lang'
  };

  const OG_LOCATE_KEYS = {
    'og:title': 'og-title',
    'og:description': 'og-description',
    'og:image': 'og-image',
    'og:type': 'og-type',
    'og:locale': 'og-locale',
    'og:site_name': 'og-site_name'
  };

  const TWITTER_LOCATE_KEYS = {
    'twitter:card': 'twitter-card',
    'twitter:title': 'twitter-title',
    'twitter:description': 'twitter-description',
    'twitter:image': 'twitter-image'
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(str) {
    if (helpers && helpers.escapeHtml) return helpers.escapeHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isExcluded(el) {
    return !!(el && el.closest && el.closest(EXCLUDE_SELECTOR));
  }

  function metaContent(attr, key) {
    const el = document.querySelector('meta[' + attr + '="' + key + '"]');
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  function allMetaByPrefix(attr, prefix) {
    const out = {};
    document.querySelectorAll('meta[' + attr + '^="' + prefix + '"]').forEach((el) => {
      const key = el.getAttribute(attr);
      if (key) out[key] = (el.getAttribute('content') || '').trim();
    });
    return out;
  }

  function truncate(str, max) {
    const s = String(str || '');
    if (s.length <= max) return s;
    return s.slice(0, max) + '…';
  }

  function mainContentRoot() {
    const candidates = [
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('article'),
      document.body
    ];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] && !isExcluded(candidates[i])) return candidates[i];
    }
    return document.body;
  }

  function visibleTextWordCount(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || isExcluded(parent)) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let words = 0;
    while (walker.nextNode()) {
      const parts = walker.currentNode.textContent.trim().split(/\s+/);
      words += parts.length;
    }
    return words;
  }

  function collectHeadings() {
    const list = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      if (isExcluded(el)) return;
      const level = parseInt(el.tagName.charAt(1), 10);
      list.push({
        level,
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200),
        el
      });
    });
    return list;
  }

  function collectImages() {
    const list = [];
    document.querySelectorAll('img').forEach((el) => {
      if (isExcluded(el)) return;
      const alt = el.getAttribute('alt');
      const missingAlt = !alt || !alt.trim();
      const w = el.naturalWidth || el.width || el.getAttribute('width') || '';
      const h = el.naturalHeight || el.height || el.getAttribute('height') || '';
      let dims = '';
      if (w && h) dims = w + '×' + h;
      list.push({
        src: el.currentSrc || el.src || '',
        alt: alt || '',
        missingAlt,
        dims,
        el
      });
    });
    return list;
  }

  function collectLinks() {
    const internal = [];
    const external = [];
    const origin = location.origin;
    document.querySelectorAll('a[href]').forEach((el) => {
      if (isExcluded(el)) return;
      const href = (el.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      let url;
      try {
        url = new URL(href, location.href);
      } catch (e) {
        return;
      }
      const entry = {
        href: url.href,
        text: truncate((el.innerText || '').trim(), 60),
        el
      };
      if (url.origin === origin) internal.push(entry);
      else external.push(entry);
    });
    return { internal, external, total: internal.length + external.length };
  }

  function collectJsonLd() {
    const blocks = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script, index) => {
      if (isExcluded(script)) return;
      const raw = (script.textContent || '').trim();
      if (!raw) return;
      let pretty = raw;
      try {
        pretty = JSON.stringify(JSON.parse(raw), null, 2);
      } catch (e) {
        pretty = raw;
      }
      blocks.push({ index: index + 1, raw, pretty });
    });
    return blocks;
  }

  function auditPage() {
    const title = (document.title || '').trim();
    const description = metaContent('name', 'description');
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? (canonicalEl.getAttribute('href') || '').trim() : '';
    const robots = metaContent('name', 'robots');
    const keywords = metaContent('name', 'keywords');
    const author = metaContent('name', 'author');
    const publisher = metaContent('name', 'publisher') || metaContent('property', 'article:publisher');
    const viewport = metaContent('name', 'viewport');
    const og = allMetaByPrefix('property', 'og:');
    const twitter = allMetaByPrefix('name', 'twitter:');
    const lang = (document.documentElement.getAttribute('lang') || '').trim();

    const headings = collectHeadings();
    const h1Count = headings.filter((h) => h.level === 1).length;
    const images = collectImages();
    const links = collectLinks();
    const jsonLd = collectJsonLd();

    const headScripts = [...document.querySelectorAll('head script[src]')];
    const blockingHeadScripts = headScripts.filter((s) => {
      if (s.hasAttribute('async') || s.hasAttribute('defer')) return false;
      if ((s.getAttribute('type') || '').trim() && s.getAttribute('type') !== 'text/javascript') return false;
      return true;
    });

    const stylesheetCount = document.querySelectorAll('link[rel="stylesheet"], style').length;
    const scriptCount = document.querySelectorAll('script').length;
    const wordCount = visibleTextWordCount(mainContentRoot());

    const warnings = [];
    let score = 100;

    if (!title) {
      warnings.push({ level: 'error', text: 'Page title is missing' });
      score -= 20;
    } else if (title.length > 60) {
      warnings.push({ level: 'warn', text: 'Title is long (' + title.length + ' chars, aim for ≤60)' });
      score -= 5;
    } else if (title.length < 10) {
      warnings.push({ level: 'warn', text: 'Title is short (' + title.length + ' chars)' });
      score -= 5;
    }

    if (!description) {
      warnings.push({ level: 'error', text: 'Meta description is missing' });
      score -= 15;
    } else if (description.length > 160) {
      warnings.push({ level: 'warn', text: 'Meta description is long (' + description.length + ' chars, aim for ≤160)' });
      score -= 5;
    }

    if (h1Count === 0) {
      warnings.push({ level: 'error', text: 'No H1 heading found' });
      score -= 15;
    } else if (h1Count > 1) {
      warnings.push({ level: 'warn', text: 'Multiple H1 headings (' + h1Count + ')' });
      score -= 10;
    }

    if (!canonical) {
      warnings.push({ level: 'warn', text: 'Canonical link is missing' });
      score -= 10;
    } else if (!canonical.includes(LIVE_CANONICAL_HOST)) {
      warnings.push({
        level: 'warn',
        text: 'Canonical does not use ' + LIVE_CANONICAL_HOST + ' (' + truncate(canonical, 80) + ')'
      });
      score -= 5;
    }

    if (/noindex/i.test(robots)) {
      warnings.push({
        level: 'info',
        text: 'robots noindex is set (expected on Shadow — live site should not use this)'
      });
    }

    if (!og['og:image']) {
      warnings.push({ level: 'warn', text: 'og:image is missing' });
      score -= 5;
    }
    if (!twitter['twitter:card']) {
      warnings.push({ level: 'warn', text: 'twitter:card is missing' });
      score -= 5;
    }

    if (!viewport) {
      warnings.push({ level: 'warn', text: 'Viewport meta tag is missing' });
      score -= 5;
    }

    if (location.protocol !== 'https:') {
      warnings.push({ level: 'error', text: 'Page is not served over HTTPS' });
      score -= 10;
    }

    const missingAltCount = images.filter((img) => img.missingAlt).length;
    if (missingAltCount) {
      warnings.push({
        level: 'warn',
        text: missingAltCount + ' image(s) missing alt text'
      });
      score -= Math.min(15, missingAltCount);
    }

    score = Math.max(0, Math.min(100, score));

    const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    headings.forEach((h) => {
      headingCounts['h' + h.level] += 1;
    });

    return {
      title,
      description,
      canonical,
      robots,
      keywords,
      author,
      publisher,
      viewport,
      og,
      twitter,
      lang,
      url: location.href,
      headings,
      headingCounts,
      h1Count,
      images,
      links,
      jsonLd,
      technical: {
        https: location.protocol === 'https:',
        wordCount,
        scriptCount,
        stylesheetCount,
        blockingHeadScripts: blockingHeadScripts.length,
        blockingHeadScriptSrcs: blockingHeadScripts.map((s) => s.src || s.getAttribute('src') || '(inline)')
      },
      score,
      warnings
    };
  }

  function isEmptyValue(val) {
    if (val == null) return true;
    const s = String(val).trim();
    return !s || s === '—' || s === 'Not set' || s === 'Missing';
  }

  function emptyPill(label) {
    return '<span class="shadow-seo-empty-pill">' + escapeHtml(label || 'Not set') + '</span>';
  }

  function renderCellValue(val, opts) {
    opts = opts || {};
    if (isEmptyValue(val)) {
      return (
        '<span class="shadow-seo-value shadow-seo-value--empty">' +
        emptyPill(opts.emptyLabel || 'Not set') +
        '</span>'
      );
    }
    const text = opts.truncate ? truncate(val, opts.truncate) : String(val);
    const classes = ['shadow-seo-value'];
    if (opts.mono) classes.push('shadow-seo-value--mono');
    const title = opts.mono && String(val).length > (opts.truncate || 0) ? ' title="' + escapeHtml(val) + '"' : '';
    return '<span class="' + classes.join(' ') + '"' + title + '>' + escapeHtml(text) + '</span>';
  }

  function scoreClass(score) {
    if (score >= 80) return 'shadow-seo-score--good';
    if (score >= 60) return 'shadow-seo-score--ok';
    return 'shadow-seo-score--poor';
  }

  function scoreRingSvg(score) {
    const r = 15.5;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    return (
      '<svg class="shadow-seo-score-svg" viewBox="0 0 36 36" aria-hidden="true">' +
      '<circle class="shadow-seo-score-track" cx="18" cy="18" r="' +
      r +
      '" fill="none" stroke-width="3"/>' +
      '<circle class="shadow-seo-score-fill" cx="18" cy="18" r="' +
      r +
      '" fill="none" stroke-width="3" stroke-linecap="round" ' +
      'stroke-dasharray="' +
      circ.toFixed(2) +
      '" stroke-dashoffset="' +
      offset.toFixed(2) +
      '" transform="rotate(-90 18 18)"/>' +
      '</svg>'
    );
  }

  function warningIcon(level) {
    if (level === 'error') {
      return (
        '<svg class="shadow-seo-warning-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
        '<circle cx="7" cy="7" r="6.25" fill="none" stroke="currentColor" stroke-width="1.25"/>' +
        '<path d="M7 4.25v3.25M7 9.25h.01" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'
      );
    }
    if (level === 'warn') {
      return (
        '<svg class="shadow-seo-warning-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
        '<path d="M7 1.5L12.5 11.5H1.5L7 1.5z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>' +
        '<path d="M7 5.5v2.75M7 10h.01" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'
      );
    }
    if (level === 'good') {
      return (
        '<svg class="shadow-seo-warning-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
        '<circle cx="7" cy="7" r="6.25" fill="none" stroke="currentColor" stroke-width="1.25"/>' +
        '<path d="M4.5 7.25l1.75 1.75 3.25-3.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      );
    }
    return (
      '<svg class="shadow-seo-warning-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
      '<circle cx="7" cy="7" r="6.25" fill="none" stroke="currentColor" stroke-width="1.25"/>' +
      '<path d="M7 6.25v3.25M7 4.25h.01" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'
    );
  }

  function headingBadgeClass(level) {
    if (level === 1) return 'shadow-seo-heading-badge shadow-seo-heading-badge--h1';
    if (level === 2) return 'shadow-seo-heading-badge shadow-seo-heading-badge--h2';
    return 'shadow-seo-heading-badge shadow-seo-heading-badge--hn';
  }

  function highlightJson(str) {
    const escaped = escapeHtml(str);
    return escaped
      .replace(/(&quot;)([^&]+)(&quot;)(\s*:)/g, '<span class="shadow-seo-json-key">$1$2$3</span>$4')
      .replace(/:\s*(&quot;)([^&]*)(&quot;)/g, ': <span class="shadow-seo-json-str">$1$2$3</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="shadow-seo-json-num">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="shadow-seo-json-bool">$1</span>');
  }

  function renderOverview(data) {
    return (
      '<div class="shadow-seo-overview">' +
      '<div class="shadow-seo-score-ring ' +
      scoreClass(data.score) +
      '" aria-label="SEO score ' +
      data.score +
      ' out of 100">' +
      scoreRingSvg(data.score) +
      '<div class="shadow-seo-score-inner">' +
      '<span class="shadow-seo-score-num">' +
      data.score +
      '</span>' +
      '<span class="shadow-seo-score-label">Score</span>' +
      '</div>' +
      '</div>' +
      '<ul class="shadow-seo-warnings">' +
      (data.warnings.length
        ? data.warnings
            .map(
              (w) =>
                '<li class="shadow-seo-warning shadow-seo-warning--' +
                w.level +
                '"><span class="shadow-seo-warning-icon">' +
                warningIcon(w.level) +
                '</span><span class="shadow-seo-warning-text">' +
                escapeHtml(w.text) +
                '</span></li>'
            )
            .join('')
        : '<li class="shadow-seo-warning shadow-seo-warning--good"><span class="shadow-seo-warning-icon">' +
          warningIcon('good') +
          '</span><span class="shadow-seo-warning-text">No major issues detected</span></li>') +
      '</ul>' +
      '</div>'
    );
  }

  function locateBtnHtml(locateKey) {
    if (!locateKey) return '';
    return (
      '<button type="button" class="shadow-seo-locate-btn" data-locate="' +
      escapeHtml(locateKey) +
      '" aria-label="Locate on page" title="Locate on page">' +
      '<svg class="shadow-seo-locate-icon" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
      '<circle cx="6" cy="6" r="2.25" fill="none" stroke="currentColor" stroke-width="1.1"/>' +
      '<path d="M6 1.25v1.5M6 9.25v1.5M1.25 6h1.5M9.25 6h1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>' +
      '</button>'
    );
  }

  function renderValueCell(val, opts) {
    opts = opts || {};
    const locateKey = opts.locate;
    const valueHtml = renderCellValue(val, opts);
    if (!locateKey) return valueHtml;
    return (
      '<span class="shadow-seo-value-cell">' + valueHtml + locateBtnHtml(locateKey) + '</span>'
    );
  }

  function renderFieldTable(rows, tableClass) {
    return (
      '<table class="shadow-seo-table' +
      (tableClass ? ' ' + tableClass : '') +
      '"><tbody>' +
      rows
        .map(
          (r, i) =>
            '<tr class="shadow-seo-row' +
            (i % 2 ? ' shadow-seo-row--zebra' : '') +
            '"><th scope="row">' +
            escapeHtml(r[0]) +
            '</th><td>' +
            renderValueCell(r[1], r[2] || {}) +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table>'
    );
  }

  function renderMetaTable(data) {
    const rows = META_FIELDS.map(([label, key, opts]) => {
      let value = data[key];
      if (key === 'wordCount') value = String(data.technical.wordCount);
      const rowOpts = Object.assign({}, opts);
      if (META_LOCATE_KEYS[key]) rowOpts.locate = META_LOCATE_KEYS[key];
      return [label, value, rowOpts];
    });
    return renderFieldTable(rows, 'shadow-seo-table--meta');
  }

  function renderOgTable(data) {
    const rows = OG_FIELDS.map((key) => {
      const rowOpts = { mono: true, truncate: 64, emptyLabel: 'Not set' };
      if (OG_LOCATE_KEYS[key]) rowOpts.locate = OG_LOCATE_KEYS[key];
      return [key, data.og[key] || '', rowOpts];
    });
    return renderFieldTable(rows, 'shadow-seo-table--og');
  }

  function renderTwitterTable(data) {
    const rows = TWITTER_FIELDS.map((key) => {
      const rowOpts = { mono: true, truncate: 64, emptyLabel: 'Not set' };
      if (TWITTER_LOCATE_KEYS[key]) rowOpts.locate = TWITTER_LOCATE_KEYS[key];
      return [key, data.twitter[key] || '', rowOpts];
    });
    return renderFieldTable(rows, 'shadow-seo-table--twitter');
  }

  function renderSecurity(data) {
    const t = data.technical;
    const rows = [
      ['HTTPS', t.https ? 'Yes' : 'No', {}],
      [
        'Viewport',
        data.viewport,
        { mono: true, truncate: 72, emptyLabel: 'Not set', locate: 'meta-viewport' }
      ]
    ];
    return renderFieldTable(rows, 'shadow-seo-table--security');
  }

  function renderHeadings(data) {
    const counts = data.headingCounts;
    const summary =
      '<div class="shadow-seo-heading-counts">' +
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        .map(
          (k) =>
            '<span class="' +
            headingBadgeClass(parseInt(k.charAt(1), 10)) +
            '">' +
            k.toUpperCase() +
            ' ' +
            counts[k] +
            '</span>'
        )
        .join('') +
      '</div>';
    const list =
      data.headings.length
        ? '<table class="shadow-seo-table shadow-seo-table--headings"><tbody>' +
          data.headings
            .map(
              (h, i) =>
                '<tr class="shadow-seo-row' +
                (i % 2 ? ' shadow-seo-row--zebra' : '') +
                '"><td class="shadow-seo-cell-badge"><span class="' +
                headingBadgeClass(h.level) +
                '">' +
                escapeHtml(h.tag.toUpperCase()) +
                '</span></td><td>' +
                renderValueCell(h.text, { emptyLabel: 'Empty', locate: 'heading-' + i }) +
                '</td></tr>'
            )
            .join('') +
          '</tbody></table>'
        : '<p class="shadow-seo-empty-state">' + emptyPill('No headings') + '</p>';
    return summary + list;
  }

  function renderImages(data) {
    const total = data.images.length;
    const missingAltCount = data.images.filter((img) => img.missingAlt).length;
    let html =
      '<p class="shadow-seo-counts">Total: ' +
      total +
      ' · Missing alt: ' +
      missingAltCount +
      '</p>';
    if (!total) {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('No images') + '</p>';
      return html;
    }
    html +=
      '<table class="shadow-seo-table shadow-seo-table--images">' +
      '<thead><tr><th>Src</th><th>Alt</th><th>Dims</th><th class="shadow-seo-cell-actions" aria-hidden="true"></th></tr></thead><tbody>' +
      data.images
        .map(
          (img, i) =>
            '<tr class="shadow-seo-row' +
            (img.missingAlt ? ' shadow-seo-row--warn' : '') +
            (i % 2 && !img.missingAlt ? ' shadow-seo-row--zebra' : '') +
            '"><td class="shadow-seo-cell-src">' +
            renderCellValue(img.src, { mono: true, truncate: 48, emptyLabel: 'Not set' }) +
            '</td><td>' +
            (img.missingAlt
              ? '<span class="shadow-seo-badge-missing-alt">Missing alt</span>'
              : renderCellValue(img.alt, { truncate: 40 })) +
            '</td><td>' +
            renderCellValue(img.dims, { emptyLabel: 'Not set' }) +
            '</td><td class="shadow-seo-cell-actions">' +
            locateBtnHtml('image-' + i) +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table>';
    return html;
  }

  function renderLinks(data) {
    const links = data.links;
    let html =
      '<p class="shadow-seo-counts">Total: ' +
      links.total +
      ' · Internal: ' +
      links.internal.length +
      ' · External: ' +
      links.external.length +
      '</p>';
    const slice = links.internal.slice(0, 15);
    html += '<p class="shadow-seo-subhead">Internal' + (slice.length ? ' (first ' + slice.length + ')' : '') + '</p>';
    if (slice.length) {
      html +=
        '<table class="shadow-seo-table shadow-seo-table--links"><tbody>' +
        slice
          .map(
            (l, i) =>
              '<tr class="shadow-seo-row' +
              (i % 2 ? ' shadow-seo-row--zebra' : '') +
              '"><td class="shadow-seo-cell-link">' +
              '<a href="' +
              escapeHtml(l.href) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(truncate(l.href, 56)) +
              '</a>' +
              (l.text ? ' <span class="shadow-seo-link-text">' + escapeHtml(l.text) + '</span>' : '') +
              '</td><td class="shadow-seo-cell-actions">' +
              locateBtnHtml('link-int-' + i) +
              '</td></tr>'
          )
          .join('') +
        '</tbody></table>';
    } else {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>';
    }
    const extSlice = links.external.slice(0, 10);
    html += '<p class="shadow-seo-subhead">External' + (extSlice.length ? ' (first ' + extSlice.length + ')' : '') + '</p>';
    if (extSlice.length) {
      html +=
        '<table class="shadow-seo-table shadow-seo-table--links"><tbody>' +
        extSlice
          .map(
            (l, i) =>
              '<tr class="shadow-seo-row' +
              (i % 2 ? ' shadow-seo-row--zebra' : '') +
              '"><td class="shadow-seo-cell-link">' +
              '<a href="' +
              escapeHtml(l.href) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(truncate(l.href, 56)) +
              '</a></td><td class="shadow-seo-cell-actions">' +
              locateBtnHtml('link-ext-' + i) +
              '</td></tr>'
          )
          .join('') +
        '</tbody></table>';
    } else {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>';
    }
    return html;
  }

  function renderStructured(data) {
    if (!data.jsonLd.length) {
      return '<p class="shadow-seo-empty-state">' + emptyPill('None found') + '</p>';
    }
    return data.jsonLd
      .map((block, i) => {
        const locateKey = findJsonLdLocateKey(block) ? 'jsonld-' + i : '';
        return (
          '<details class="shadow-seo-jsonld"><summary class="shadow-seo-jsonld-summary">' +
          '<span>Block ' +
          block.index +
          ' <span class="shadow-seo-jsonld-meta">(' +
          block.raw.length +
          ' chars)</span></span>' +
          (locateKey ? locateBtnHtml(locateKey) : '') +
          '</summary><pre class="shadow-seo-pre shadow-seo-pre--json">' +
          highlightJson(block.pretty) +
          '</pre></details>'
        );
      })
      .join('');
  }

  function renderTechnical(data) {
    const t = data.technical;
    const stats = [
      { label: 'Stylesheets', value: String(t.stylesheetCount) },
      { label: 'Scripts', value: String(t.scriptCount) },
      {
        label: 'Blocking in head',
        value: String(t.blockingHeadScripts),
        tone: t.blockingHeadScripts ? 'warn' : 'good'
      }
    ];
    let html =
      '<div class="shadow-seo-stat-grid">' +
      stats
        .map(
          (s) =>
            '<div class="shadow-seo-stat-card' +
            (s.tone ? ' shadow-seo-stat-card--' + s.tone : '') +
            '"><span class="shadow-seo-stat-value">' +
            escapeHtml(s.value) +
            '</span><span class="shadow-seo-stat-label">' +
            escapeHtml(s.label) +
            '</span></div>'
        )
        .join('') +
      '</div>';
    html += '<p class="shadow-seo-subhead">Blocking script sources</p>';
    if (t.blockingHeadScripts) {
      html +=
        '<ul class="shadow-seo-script-list">' +
        t.blockingHeadScriptSrcs
          .map(
            (s) =>
              '<li>' + renderCellValue(s, { mono: true, truncate: 64, emptyLabel: 'Not set' }) + '</li>'
          )
          .join('') +
        '</ul>';
    } else {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>';
    }
    return html;
  }

  function renderSection(data, sectionId) {
    switch (sectionId) {
      case 'overview':
        return renderOverview(data);
      case 'meta':
        return renderMetaTable(data);
      case 'og':
        return renderOgTable(data);
      case 'twitter':
        return renderTwitterTable(data);
      case 'security':
        return renderSecurity(data);
      case 'headings':
        return renderHeadings(data);
      case 'images':
        return renderImages(data);
      case 'links':
        return renderLinks(data);
      case 'structured':
        return renderStructured(data);
      case 'technical':
        return renderTechnical(data);
      default:
        return '';
    }
  }

  function renderTabs() {
    const tabsEl = qs('#shadow-seo-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = '';
    tabsEl.setAttribute('role', 'tablist');
    tabsEl.setAttribute('aria-label', 'SEO audit sections');
    SECTIONS.forEach((section) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'shadow-seo-tab' + (activeSection === section.id ? ' shadow-seo-tab--active' : '');
      btn.textContent = section.label;
      btn.dataset.section = section.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', activeSection === section.id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (activeSection === section.id) return;
        activeSection = section.id;
        renderAudit();
      });
      tabsEl.appendChild(btn);
    });
  }

  function normalizeUrlForMatch(url) {
    if (!url) return '';
    try {
      const u = new URL(url, location.href);
      return u.pathname.split('/').pop() || u.href;
    } catch (e) {
      return String(url).split('/').pop() || String(url);
    }
  }

  function findImageByUrl(url) {
    if (!url) return null;
    const target = normalizeUrlForMatch(url);
    let match = null;
    document.querySelectorAll('img').forEach((img) => {
      if (isExcluded(img) || match) return;
      const src = img.currentSrc || img.src || '';
      if (!src) return;
      if (src === url || normalizeUrlForMatch(src) === target || src.includes(target)) {
        match = img;
      }
    });
    return match;
  }

  function findHeadingByText(text) {
    if (!text) return null;
    const needle = String(text).trim().toLowerCase();
    if (!needle) return null;
    let match = null;
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      if (isExcluded(el) || match) return;
      const hay = (el.innerText || '').trim().toLowerCase();
      if (hay === needle || hay.includes(needle) || needle.includes(hay)) match = el;
    });
    return match;
  }

  function firstVisibleH1() {
    const h1 = document.querySelector('h1');
    return h1 && !isExcluded(h1) ? h1 : null;
  }

  function metaElement(attr, key) {
    return document.querySelector('meta[' + attr + '="' + key + '"]');
  }

  function findJsonLdVisibleTarget(block) {
    let parsed;
    try {
      parsed = JSON.parse(block.raw);
    } catch (e) {
      return null;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;
      const image = item.image;
      let imageUrl = '';
      if (typeof image === 'string') imageUrl = image;
      else if (image && typeof image === 'object') imageUrl = image.url || image['@id'] || '';
      else if (Array.isArray(image) && image.length) {
        const first = image[0];
        imageUrl = typeof first === 'string' ? first : first && first.url ? first.url : '';
      }
      if (imageUrl) {
        const imgEl = findImageByUrl(imageUrl);
        if (imgEl) return imgEl;
      }
      const name = item.name || item.headline;
      if (name) {
        const heading = findHeadingByText(name);
        if (heading) return heading;
      }
    }
    return null;
  }

  function findJsonLdLocateKey(block) {
    return findJsonLdVisibleTarget(block) ? 'pending' : '';
  }

  function resolveLocateTarget(key) {
    const data = lastAuditData;
    if (!data || !key) return null;

    if (key === 'meta-title') return firstVisibleH1();
    if (key === 'meta-description') return metaElement('name', 'description');
    if (key === 'meta-canonical') return document.querySelector('link[rel="canonical"]');
    if (key === 'meta-robots') return metaElement('name', 'robots');
    if (key === 'meta-keywords') return metaElement('name', 'keywords');
    if (key === 'meta-author') return metaElement('name', 'author');
    if (key === 'meta-publisher') {
      return metaElement('name', 'publisher') || metaElement('property', 'article:publisher');
    }
    if (key === 'meta-lang') return document.documentElement;
    if (key === 'meta-viewport') return metaElement('name', 'viewport');

    if (key === 'og-title' || key === 'twitter-title') {
      return firstVisibleH1() || metaElement('property', 'og:title') || metaElement('name', 'twitter:title');
    }
    if (key === 'og-description' || key === 'twitter-description') {
      return (
        metaElement('property', 'og:description') || metaElement('name', 'twitter:description')
      );
    }
    if (key === 'og-image') return findImageByUrl(data.og['og:image']) || metaElement('property', 'og:image');
    if (key === 'twitter-image') {
      return findImageByUrl(data.twitter['twitter:image']) || metaElement('name', 'twitter:image');
    }
    if (key === 'og-type') return metaElement('property', 'og:type');
    if (key === 'og-locale') return metaElement('property', 'og:locale');
    if (key === 'og-site_name') return metaElement('property', 'og:site_name');
    if (key === 'twitter-card') return metaElement('name', 'twitter:card');

    const headingMatch = key.match(/^heading-(\d+)$/);
    if (headingMatch) {
      const h = data.headings[parseInt(headingMatch[1], 10)];
      return h ? h.el : null;
    }

    const imageMatch = key.match(/^image-(\d+)$/);
    if (imageMatch) {
      const img = data.images[parseInt(imageMatch[1], 10)];
      return img ? img.el : null;
    }

    const linkIntMatch = key.match(/^link-int-(\d+)$/);
    if (linkIntMatch) {
      const link = data.links.internal[parseInt(linkIntMatch[1], 10)];
      return link ? link.el : null;
    }

    const linkExtMatch = key.match(/^link-ext-(\d+)$/);
    if (linkExtMatch) {
      const link = data.links.external[parseInt(linkExtMatch[1], 10)];
      return link ? link.el : null;
    }

    const jsonLdMatch = key.match(/^jsonld-(\d+)$/);
    if (jsonLdMatch) {
      const block = data.jsonLd[parseInt(jsonLdMatch[1], 10)];
      return block ? findJsonLdVisibleTarget(block) : null;
    }

    return null;
  }

  function clearLocateHighlight() {
    if (locateHighlightTimer) {
      clearTimeout(locateHighlightTimer);
      locateHighlightTimer = null;
    }
    if (locateHighlightEl) {
      locateHighlightEl.classList.remove('shadow-highlight');
      locateHighlightEl = null;
    }
  }

  function locateOnPage(key) {
    const el = resolveLocateTarget(key);
    if (!el || isExcluded(el)) {
      if (helpers && helpers.toast) helpers.toast('Could not locate this on the page');
      return false;
    }
    clearLocateHighlight();
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      el.scrollIntoView();
    }
    locateHighlightEl = el;
    locateHighlightEl.classList.add('shadow-highlight');
    locateHighlightTimer = setTimeout(clearLocateHighlight, 3500);
    return true;
  }

  function onLocateClick(event) {
    const btn = event.target.closest('.shadow-seo-locate-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const key = btn.dataset.locate;
    if (key) locateOnPage(key);
  }

  function bindLocateHandlers() {
    const section = qs('#shadow-seo-section');
    if (!section || section._locateBound) return;
    section._locateBound = true;
    section.addEventListener('click', onLocateClick);
  }

  function renderAudit() {
    const body = qs('#shadow-seo-section');
    if (!body) return;
    const data = auditPage();
    lastAuditData = data;
    renderTabs();
    body.innerHTML = renderSection(data, activeSection);
    if (highlightOn) applyHighlights(data);
  }

  function ensureOverlayLayer() {
    if (overlayLayer && overlayLayer.isConnected) return overlayLayer;
    overlayLayer = document.createElement('div');
    overlayLayer.id = 'shadow-seo-overlay';
    overlayLayer.className = 'shadow-seo-overlay';
    overlayLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlayLayer);
    return overlayLayer;
  }

  function clearHighlights() {
    overlayNodes.forEach((node) => {
      if (node._shadowSeoCleanup) node._shadowSeoCleanup();
      else if (node.remove) node.remove();
    });
    overlayNodes = [];
    if (overlayLayer) overlayLayer.innerHTML = '';
  }

  function positionBadge(badge, el) {
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      badge.hidden = true;
      return;
    }
    badge.hidden = false;
    badge.style.top = Math.max(2, rect.top + 2) + 'px';
    badge.style.left = Math.max(2, rect.left + 2) + 'px';
  }

  function bindOverlayReposition() {
    if (bindOverlayReposition._bound) return;
    bindOverlayReposition._bound = true;
    const reposition = () => {
      overlayNodes.forEach((node) => {
        if (node._shadowSeoTarget) positionBadge(node, node._shadowSeoTarget);
      });
    };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
  }

  function applyHighlights(data) {
    clearHighlights();
    const layer = ensureOverlayLayer();
    bindOverlayReposition();

    data.headings.forEach((h) => {
      const badge = document.createElement('span');
      badge.className = 'shadow-seo-badge shadow-seo-badge--heading';
      badge.textContent = h.tag.toUpperCase();
      badge._shadowSeoTarget = h.el;
      layer.appendChild(badge);
      overlayNodes.push(badge);
      positionBadge(badge, h.el);
    });

    data.images
      .filter((img) => img.missingAlt)
      .forEach((img) => {
        img.el.classList.add('shadow-seo-img-missing');
        overlayNodes.push({
          _shadowSeoCleanup: () => img.el.classList.remove('shadow-seo-img-missing')
        });
      });
  }

  function setHighlight(on) {
    highlightOn = !!on;
    const toggle = qs('#shadow-seo-highlight-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', highlightOn ? 'true' : 'false');
      toggle.classList.toggle('shadow-btn--active', highlightOn);
      toggle.textContent = highlightOn ? 'Hide on-page highlights' : 'Highlight on page';
    }
    if (highlightOn) {
      applyHighlights(auditPage());
    } else {
      clearHighlights();
    }
  }

  function openPanel() {
    if (helpers && helpers.showFloating) helpers.showFloating('seo');
    else {
      const modal = qs('#shadow-seo-modal');
      if (modal) modal.hidden = false;
    }
    activeSection = 'overview';
    renderAudit();
    bindSeoControls();
  }

  function bindSeoControls() {
    bindLocateHandlers();
    const toggle = qs('#shadow-seo-highlight-toggle');
    if (toggle && !toggle._bound) {
      toggle._bound = true;
      toggle.addEventListener('click', () => setHighlight(!highlightOn));
    }
    const refresh = qs('#shadow-seo-refresh');
    if (refresh && !refresh._bound) {
      refresh._bound = true;
      refresh.addEventListener('click', () => renderAudit());
    }
  }

  function closePanel() {
    setHighlight(false);
    const modal = qs('#shadow-seo-modal');
    if (modal) modal.hidden = true;
  }

  function onToolsClosed() {
    setHighlight(false);
  }

  function shutdown() {
    setHighlight(false);
    clearLocateHighlight();
    closePanel();
  }

  function init(h) {
    helpers = h || null;
    const seoBtn = qs('#shadow-tools-seo-btn');
    if (seoBtn && !seoBtn._bound) {
      seoBtn._bound = true;
      seoBtn.addEventListener('click', () => {
        if (!h || !h.getPerson || !h.getPerson()) {
          if (h && h.showExclusive) h.showExclusive('person');
          return;
        }
        openPanel();
      });
    }
  }

  window.TWAShadowSEO = {
    init,
    open: openPanel,
    close: closePanel,
    refresh: renderAudit,
    onToolsClosed,
    shutdown,
    isHighlightOn: () => highlightOn
  };
})();
