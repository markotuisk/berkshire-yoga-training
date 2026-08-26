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
  let openRowMenu = null;

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

  function resolveFieldValue(fieldName, locateKey) {
    const data = lastAuditData;
    if (!data) return '';

    if (locateKey) {
      if (locateKey === 'meta-title') return data.title;
      if (locateKey === 'meta-description') return data.description;
      if (locateKey === 'meta-canonical') return data.canonical;
      if (locateKey === 'meta-robots') return data.robots;
      if (locateKey === 'meta-keywords') return data.keywords;
      if (locateKey === 'meta-author') return data.author;
      if (locateKey === 'meta-publisher') return data.publisher;
      if (locateKey === 'meta-lang') return data.lang;
      if (locateKey === 'meta-viewport') return data.viewport;
      if (locateKey === 'og-title') return data.og['og:title'] || '';
      if (locateKey === 'og-description') return data.og['og:description'] || '';
      if (locateKey === 'og-image') return data.og['og:image'] || '';
      if (locateKey === 'og-type') return data.og['og:type'] || '';
      if (locateKey === 'og-locale') return data.og['og:locale'] || '';
      if (locateKey === 'og-site_name') return data.og['og:site_name'] || '';
      if (locateKey === 'twitter-card') return data.twitter['twitter:card'] || '';
      if (locateKey === 'twitter-title') return data.twitter['twitter:title'] || '';
      if (locateKey === 'twitter-description') return data.twitter['twitter:description'] || '';
      if (locateKey === 'twitter-image') return data.twitter['twitter:image'] || '';

      const headingMatch = locateKey.match(/^heading-(\d+)$/);
      if (headingMatch) {
        const h = data.headings[parseInt(headingMatch[1], 10)];
        return h ? h.text : '';
      }

      const imageMatch = locateKey.match(/^image-(\d+)$/);
      if (imageMatch) {
        const img = data.images[parseInt(imageMatch[1], 10)];
        return img ? (img.missingAlt ? 'Missing alt' : img.alt || img.src) : '';
      }

      const linkIntMatch = locateKey.match(/^link-int-(\d+)$/);
      if (linkIntMatch) {
        const link = data.links.internal[parseInt(linkIntMatch[1], 10)];
        return link ? link.href : '';
      }

      const linkExtMatch = locateKey.match(/^link-ext-(\d+)$/);
      if (linkExtMatch) {
        const link = data.links.external[parseInt(linkExtMatch[1], 10)];
        return link ? link.href : '';
      }

      const jsonLdMatch = locateKey.match(/^jsonld-(\d+)$/);
      if (jsonLdMatch) {
        const block = data.jsonLd[parseInt(jsonLdMatch[1], 10)];
        return block ? truncate(block.raw, 120) : '';
      }
    }

    const staticMap = {
      Title: data.title,
      'Meta description': data.description,
      URL: data.url,
      Canonical: data.canonical,
      Robots: data.robots,
      Keywords: data.keywords,
      Author: data.author,
      Publisher: data.publisher,
      Language: data.lang,
      'Word count': String(data.technical.wordCount),
      HTTPS: data.technical.https ? 'Yes' : 'No',
      Viewport: data.viewport
    };
    if (staticMap[fieldName] != null) return staticMap[fieldName];
    if (fieldName.indexOf('og:') === 0) return data.og[fieldName] || '';
    if (fieldName.indexOf('twitter:') === 0) return data.twitter[fieldName] || '';
    return '';
  }

  function canLocateField(locateKey) {
    if (!locateKey) return false;
    return !!resolveLocateTarget(locateKey);
  }

  function rowMenuHtml(fieldName, locateKey) {
    const canLocate = canLocateField(locateKey);
    return (
      '<span class="shadow-seo-row-menu">' +
      '<button type="button" class="shadow-seo-row-menu-btn" aria-haspopup="menu" aria-expanded="false" ' +
      'aria-label="Actions for ' +
      escapeHtml(fieldName) +
      '" data-field-name="' +
      escapeHtml(fieldName) +
      '" data-locate="' +
      escapeHtml(locateKey || '') +
      '">' +
      '<span class="shadow-seo-row-menu-dots" aria-hidden="true">⋯</span>' +
      '</button>' +
      '<div class="shadow-seo-row-menu-popover" role="menu" hidden>' +
      (canLocate
        ? '<button type="button" class="shadow-seo-row-menu-item" role="menuitem" data-action="locate">Locate on page</button>'
        : '') +
      '<button type="button" class="shadow-seo-row-menu-item" role="menuitem" data-action="change">Request change</button>' +
      '</div></span>'
    );
  }

  function renderValueCell(val, opts) {
    opts = opts || {};
    const fieldName = opts.fieldName || '';
    const locateKey = opts.locate || '';
    const valueHtml = renderCellValue(val, opts);
    return (
      '<span class="shadow-seo-value-cell">' +
      valueHtml +
      rowMenuHtml(fieldName, locateKey) +
      '</span>'
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
            renderValueCell(r[1], Object.assign({}, r[2] || {}, { fieldName: r[0] })) +
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
                renderValueCell(h.text, {
                  emptyLabel: 'Empty',
                  locate: 'heading-' + i,
                  fieldName: h.tag.toUpperCase() + ' heading'
                }) +
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
            rowMenuHtml(img.missingAlt ? 'Image alt' : 'Image', 'image-' + i) +
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
              rowMenuHtml('Internal link', 'link-int-' + i) +
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
              rowMenuHtml('External link', 'link-ext-' + i) +
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
          rowMenuHtml('Structured data block ' + block.index, locateKey) +
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

  function closeRowMenu(menu) {
    if (!menu) return;
    const btn = menu.querySelector('.shadow-seo-row-menu-btn');
    const popover = menu.querySelector('.shadow-seo-row-menu-popover');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (popover) popover.hidden = true;
    if (openRowMenu === menu) openRowMenu = null;
  }

  function closeAllRowMenus() {
    document.querySelectorAll('.shadow-seo-row-menu').forEach((menu) => closeRowMenu(menu));
  }

  function openRowMenuPopover(menu) {
    if (!menu) return;
    closeAllRowMenus();
    const btn = menu.querySelector('.shadow-seo-row-menu-btn');
    const popover = menu.querySelector('.shadow-seo-row-menu-popover');
    if (!btn || !popover) return;
    btn.setAttribute('aria-expanded', 'true');
    popover.hidden = false;
    openRowMenu = menu;
    const firstItem = popover.querySelector('.shadow-seo-row-menu-item');
    if (firstItem) firstItem.focus();
  }

  function requestSeoChange(fieldName, locateKey) {
    if (!helpers || !helpers.getPerson || !helpers.getPerson()) {
      if (helpers && helpers.showExclusive) helpers.showExclusive('person');
      return;
    }
    if (!helpers.openChangeTicket) {
      if (helpers && helpers.toast) helpers.toast('Ticket form unavailable');
      return;
    }
    const fieldValue = resolveFieldValue(fieldName, locateKey);
    const element = locateKey ? resolveLocateTarget(locateKey) : null;
    helpers.openChangeTicket({
      fieldName,
      fieldValue,
      element,
      locateKey
    });
  }

  function onRowMenuClick(event) {
    const menuBtn = event.target.closest('.shadow-seo-row-menu-btn');
    if (menuBtn) {
      event.preventDefault();
      event.stopPropagation();
      const menu = menuBtn.closest('.shadow-seo-row-menu');
      const popover = menu && menu.querySelector('.shadow-seo-row-menu-popover');
      if (popover && popover.hidden) openRowMenuPopover(menu);
      else closeRowMenu(menu);
      return;
    }

    const item = event.target.closest('.shadow-seo-row-menu-item');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    const menu = item.closest('.shadow-seo-row-menu');
    const menuBtnEl = menu && menu.querySelector('.shadow-seo-row-menu-btn');
    const fieldName = menuBtnEl ? menuBtnEl.dataset.fieldName : '';
    const locateKey = menuBtnEl ? menuBtnEl.dataset.locate : '';
    const action = item.dataset.action;
    closeRowMenu(menu);

    if (action === 'locate' && locateKey) locateOnPage(locateKey);
    else if (action === 'change') requestSeoChange(fieldName, locateKey);
  }

  function onRowMenuKeydown(event) {
    const menu = event.target.closest('.shadow-seo-row-menu');
    if (!menu) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeRowMenu(menu);
      const btn = menu.querySelector('.shadow-seo-row-menu-btn');
      if (btn) btn.focus();
      return;
    }

    const item = event.target.closest('.shadow-seo-row-menu-item');
    if (!item || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const items = [...menu.querySelectorAll('.shadow-seo-row-menu-item')];
    const idx = items.indexOf(item);
    if (idx < 0) return;
    const next = event.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1];
    if (next) next.focus();
  }

  function onDocumentPointerDown(event) {
    if (!openRowMenu) return;
    if (event.target.closest('.shadow-seo-row-menu') === openRowMenu) return;
    closeAllRowMenus();
  }

  function bindRowMenuHandlers() {
    const section = qs('#shadow-seo-section');
    if (!section || section._rowMenuBound) return;
    section._rowMenuBound = true;
    section.addEventListener('click', onRowMenuClick);
    section.addEventListener('keydown', onRowMenuKeydown);
    if (!bindRowMenuHandlers._docBound) {
      bindRowMenuHandlers._docBound = true;
      document.addEventListener('pointerdown', onDocumentPointerDown, true);
    }
  }

  function renderAudit() {
    const body = qs('#shadow-seo-section');
    if (!body) return;
    const data = auditPage();
    lastAuditData = data;
    renderTabs();
    body.innerHTML = renderSection(data, activeSection);
    if (highlightOn) applyHighlights(data);
    closeAllRowMenus();
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
    bindRowMenuHandlers();
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
    closeAllRowMenus();
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
