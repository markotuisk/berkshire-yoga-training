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
    { id: 'international', label: 'International' },
    { id: 'social', label: 'Social' },
    { id: 'security', label: 'Crawl & security' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'headings', label: 'Headings' },
    { id: 'images', label: 'Images' },
    { id: 'links', label: 'Links' },
    { id: 'structured', label: 'Structured data' },
    { id: 'technical', label: 'Technical' }
  ];

  const META_FIELDS = [
    ['Title', 'title', { emptyLabel: 'Missing' }],
    ['Meta description', 'description', { emptyLabel: 'Missing' }],
    ['Canonical URL', 'canonical', { mono: true, truncate: 72, emptyLabel: 'Not set' }],
    ['Robots', 'robots', { emptyLabel: 'Not set' }],
    ['Googlebot', 'googlebot', { emptyLabel: 'Not set' }],
    ['Keywords', 'keywords', { emptyLabel: 'Not set' }],
    ['Author', 'author', { emptyLabel: 'Not set' }],
    ['Publisher', 'publisher', { emptyLabel: 'Not set' }],
    ['Language', 'lang', { emptyLabel: 'Not set' }],
    ['Charset', 'charset', { emptyLabel: 'Not set' }],
    ['Viewport', 'viewport', { mono: true, truncate: 72, emptyLabel: 'Not set' }],
    ['Word count', 'wordCount', {}],
    ['Page URL', 'url', { mono: true, truncate: 72 }]
  ];

  const OG_FIELDS = [
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:type',
    'og:locale',
    'og:site_name',
    'og:image:width',
    'og:image:height',
    'og:image:alt'
  ];

  const TWITTER_FIELDS = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:site',
    'twitter:creator'
  ];

  const STRUCTURED_TYPES = [
    { id: 'organization', label: 'Organization', types: ['Organization'] },
    {
      id: 'local-edu',
      label: 'LocalBusiness / EducationalOrganization',
      types: ['LocalBusiness', 'EducationalOrganization']
    },
    { id: 'course', label: 'Course', types: ['Course'] },
    { id: 'faq', label: 'FAQPage', types: ['FAQPage'] },
    { id: 'breadcrumb', label: 'BreadcrumbList', types: ['BreadcrumbList'] },
    { id: 'website', label: 'WebSite (with SearchAction)', types: ['WebSite'], needsSearchAction: true },
    { id: 'article', label: 'Article / BlogPosting', types: ['Article', 'BlogPosting'] },
    { id: 'review', label: 'Review / AggregateRating', types: ['Review', 'AggregateRating'] },
    { id: 'event', label: 'Event', types: ['Event'] },
    { id: 'person', label: 'Person', types: ['Person'] },
    { id: 'video', label: 'VideoObject', types: ['VideoObject'] }
  ];

  /** Google rich-results guidance per audit field (id keys match structured type ids where applicable). */
  const GOOGLE_FIELD_HINTS = {
    title: {
      id: 'title',
      label: 'Title',
      googleLooksFor: 'Google uses the title tag as the main blue link in search results.',
      relevance: 'all',
      section: 'meta'
    },
    'meta-description': {
      id: 'meta-description',
      label: 'Meta description',
      googleLooksFor:
        'Google often shows the meta description as the snippet text under the title in search results.',
      relevance: 'all',
      section: 'meta'
    },
    canonical: {
      id: 'canonical',
      label: 'Canonical URL',
      googleLooksFor: 'Google uses canonical URLs to choose one preferred URL when duplicates exist.',
      relevance: 'all',
      section: 'meta'
    },
    hreflang: {
      id: 'hreflang',
      label: 'hreflang',
      googleLooksFor: 'Google uses hreflang to serve the correct language or regional version in search.',
      relevance: 'optional',
      section: 'international'
    },
    h1: {
      id: 'h1',
      label: 'H1 heading',
      googleLooksFor: 'Google uses the main heading to understand page topic and content structure.',
      relevance: 'all',
      section: 'headings'
    },
    'image-alt': {
      id: 'image-alt',
      label: 'Image alt text',
      googleLooksFor: 'Google uses alt text to understand images in Image Search and page context.',
      relevance: 'all',
      section: 'images'
    },
    'breadcrumb-list': {
      id: 'breadcrumb-list',
      label: 'BreadcrumbList (JSON-LD)',
      googleLooksFor: 'Google may show breadcrumb trails in search results for site hierarchy.',
      relevance: 'inner',
      section: 'structured'
    },
    'visible-breadcrumbs': {
      id: 'visible-breadcrumbs',
      label: 'Visible breadcrumbs',
      googleLooksFor: 'Google may show breadcrumb trails in search results for site hierarchy.',
      relevance: 'inner',
      section: 'structured'
    },
    organization: {
      id: 'organization',
      label: 'Organization',
      googleLooksFor: 'Google uses Organization schema for brand knowledge panels and entity understanding.',
      relevance: 'all',
      section: 'structured'
    },
    'local-edu': {
      id: 'local-edu',
      label: 'LocalBusiness / EducationalOrganization',
      googleLooksFor:
        'Google uses local and educational org schema for local packs, maps, and training provider results.',
      relevance: 'all',
      section: 'structured'
    },
    course: {
      id: 'course',
      label: 'Course',
      googleLooksFor: 'Google uses Course schema for rich results on training and programme pages.',
      relevance: 'course',
      section: 'structured'
    },
    faq: {
      id: 'faq',
      label: 'FAQPage',
      googleLooksFor: 'Google may show FAQ rich results with expandable Q&A directly in search.',
      relevance: 'faq',
      section: 'structured'
    },
    website: {
      id: 'website',
      label: 'WebSite (with SearchAction)',
      googleLooksFor: 'Google may show a sitelinks search box when WebSite schema includes SearchAction.',
      relevance: 'homepage',
      section: 'structured'
    },
    article: {
      id: 'article',
      label: 'Article / BlogPosting',
      googleLooksFor: 'Google uses Article schema for news and blog rich results (date, author, image).',
      relevance: 'article',
      section: 'structured'
    },
    review: {
      id: 'review',
      label: 'Review / AggregateRating',
      googleLooksFor: 'Google may show star ratings in search when Review or AggregateRating schema is valid.',
      relevance: 'optional',
      section: 'structured'
    },
    event: {
      id: 'event',
      label: 'Event',
      googleLooksFor: 'Google may show event rich results with date, location, and ticket info.',
      relevance: 'optional',
      section: 'structured'
    },
    person: {
      id: 'person',
      label: 'Person',
      googleLooksFor: 'Google uses Person schema for author bylines and knowledge panel connections.',
      relevance: 'optional',
      section: 'structured'
    },
    video: {
      id: 'video',
      label: 'VideoObject',
      googleLooksFor: 'Google may show video rich results with thumbnail and duration in search.',
      relevance: 'optional',
      section: 'structured'
    }
  };

  const META_GOOGLE_HINT_IDS = {
    title: 'title',
    description: 'meta-description',
    canonical: 'canonical'
  };

  let helpers = null;
  let activeSection = 'overview';
  let highlightOn = false;
  let overlayLayer = null;
  let overlayNodes = [];
  let lastAuditData = null;
  let locateHighlightEl = null;
  let locateHighlightTimer = null;
  let openRowMenu = null;
  let lastKeywordAnalysis = null;

  const STOP_WORDS = new Set(
    'a about above after again against all am an and any are as at be because been before being below between both but by can did do does doing done down during each few for from further had has have having he her here hers herself him himself his how if in into is it its itself just let like ll me more most much must my myself no nor not now of off on once only or other our ours ourselves out over own re s same shall she should so some such t than that the their theirs them themselves then there these they this those though through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves'.split(
      ' '
    )
  );

  const META_LOCATE_KEYS = {
    title: 'meta-title',
    description: 'meta-description',
    canonical: 'meta-canonical',
    robots: 'meta-robots',
    googlebot: 'meta-googlebot',
    keywords: 'meta-keywords',
    author: 'meta-author',
    publisher: 'meta-publisher',
    lang: 'meta-lang',
    charset: 'meta-charset',
    viewport: 'meta-viewport'
  };

  const OG_LOCATE_KEYS = {
    'og:title': 'og-title',
    'og:description': 'og-description',
    'og:url': 'og-url',
    'og:image': 'og-image',
    'og:type': 'og-type',
    'og:locale': 'og-locale',
    'og:site_name': 'og-site_name',
    'og:image:width': 'og-image_width',
    'og:image:height': 'og-image_height',
    'og:image:alt': 'og-image_alt'
  };

  const TWITTER_LOCATE_KEYS = {
    'twitter:card': 'twitter-card',
    'twitter:title': 'twitter-title',
    'twitter:description': 'twitter-description',
    'twitter:image': 'twitter-image',
    'twitter:site': 'twitter-site',
    'twitter:creator': 'twitter-creator'
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

  function pageDepth() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/') return 0;
    return path.split('/').filter(Boolean).length;
  }

  function pathIncludes(segments) {
    const path = location.pathname.toLowerCase();
    return segments.some((s) => path.includes(s));
  }

  function isHomepage() {
    return pageDepth() === 0;
  }

  function isCoursePage() {
    return pathIncludes(['/courses/', '/course/', '/programme', '/training', '/diploma', '/retreat']);
  }

  function isArticlePage() {
    return pathIncludes(['/journal/', '/blog/', '/article/', '/news/']);
  }

  function isFaqPage() {
    return pathIncludes(['/faq', '/questions']);
  }

  function computeGoogleStatus(found, hint) {
    if (found) return 'found';
    if (!hint) return 'not-set';
    const rel = hint.relevance;
    if (rel === 'all') return 'not-set';
    if (rel === 'optional') return 'might-add';
    if (rel === 'inner') return pageDepth() >= 1 ? 'might-relevant' : 'might-add';
    if (rel === 'homepage') return isHomepage() ? 'might-relevant' : 'might-add';
    if (rel === 'course') return isCoursePage() ? 'might-relevant' : 'might-add';
    if (rel === 'article') return isArticlePage() ? 'might-relevant' : 'might-add';
    if (rel === 'faq') return isFaqPage() ? 'might-relevant' : 'might-add';
    return 'not-set';
  }

  function googleStatusPill(status) {
    const labels = {
      found: 'Found',
      'might-relevant': 'Might be relevant',
      'might-add': 'Might be added',
      'not-set': 'Not set'
    };
    return (
      '<span class="shadow-seo-status-pill shadow-seo-status-pill--' +
      status +
      '">' +
      escapeHtml(labels[status] || status) +
      '</span>'
    );
  }

  function applyGoogleGuidance(label, value, hintId, opts, foundOverride) {
    const hint = GOOGLE_FIELD_HINTS[hintId];
    if (!hint) return [label, value, opts || {}];
    const merged = Object.assign({}, opts || {});
    merged.googleHint = hint.googleLooksFor;
    const found =
      foundOverride !== undefined ? foundOverride : !isEmptyValue(value);
    merged.googleStatus = computeGoogleStatus(found, hint);
    return [label, value, merged];
  }

  function detectVisibleBreadcrumbs() {
    const selectors = [
      'nav[aria-label*="breadcrumb" i]',
      '[role="navigation"][aria-label*="breadcrumb" i]',
      '.breadcrumb',
      '.breadcrumbs',
      'ol.breadcrumb',
      'ul.breadcrumb',
      '[itemtype*="BreadcrumbList" i]',
      '[itemtype*="breadcrumb" i]'
    ];
    let nav = null;
    for (let i = 0; i < selectors.length; i++) {
      const el = document.querySelector(selectors[i]);
      if (el && !isExcluded(el)) {
        nav = el;
        break;
      }
    }
    if (!nav) return { found: false, items: [], el: null, summary: '' };

    const items = [];
    nav.querySelectorAll('[itemprop="name"], .breadcrumb-item, li a, li span, ol > li, ul > li').forEach(
      (el) => {
        const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
        if (text && text.length < 80) items.push(text);
      }
    );
    const unique = [];
    items.forEach((item) => {
      if (unique.indexOf(item) === -1) unique.push(item);
    });
    const trimmed = unique.slice(0, 8);
    return {
      found: trimmed.length > 0,
      items: trimmed,
      el: nav,
      summary: trimmed.length ? trimmed.join(' › ') : ''
    };
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
      const hasAltAttr = el.hasAttribute('alt');
      const missingAlt = !hasAltAttr;
      const decorative = hasAltAttr && (!alt || !alt.trim());
      const w = el.naturalWidth || el.width || el.getAttribute('width') || '';
      const h = el.naturalHeight || el.height || el.getAttribute('height') || '';
      let dims = '';
      if (w && h) dims = w + '×' + h;
      list.push({
        src: el.currentSrc || el.src || '',
        alt: alt || '',
        missingAlt,
        decorative,
        dims,
        el
      });
    });
    return list;
  }

  function collectLinks() {
    const internal = [];
    const external = [];
    let nofollowCount = 0;
    const origin = location.origin;
    document.querySelectorAll('a[href]').forEach((el) => {
      if (isExcluded(el)) return;
      const href = (el.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      const rel = (el.getAttribute('rel') || '').toLowerCase();
      if (rel.includes('nofollow')) nofollowCount += 1;
      let url;
      try {
        url = new URL(href, location.href);
      } catch (e) {
        return;
      }
      const entry = {
        href: url.href,
        text: truncate((el.innerText || '').trim(), 60),
        nofollow: rel.includes('nofollow'),
        el
      };
      if (url.origin === origin) internal.push(entry);
      else external.push(entry);
    });
    return { internal, external, total: internal.length + external.length, nofollowCount };
  }

  function collectHreflang() {
    const list = [];
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
      if (isExcluded(el)) return;
      const hreflang = (el.getAttribute('hreflang') || '').trim();
      const href = (el.getAttribute('href') || '').trim();
      if (hreflang) list.push({ hreflang, href, el });
    });
    return list;
  }

  function collectCharset() {
    const charsetMeta = document.querySelector('meta[charset]');
    if (charsetMeta) return (charsetMeta.getAttribute('charset') || '').trim();
    const httpEquiv = document.querySelector('meta[http-equiv="Content-Type" i]');
    if (httpEquiv) {
      const content = httpEquiv.getAttribute('content') || '';
      const match = content.match(/charset=([^\s;]+)/i);
      if (match) return match[1];
    }
    return '';
  }

  function parseRobotsFlags(robotsStr) {
    const robots = (robotsStr || '').toLowerCase();
    return {
      noindex: /noindex/.test(robots),
      nofollow: /nofollow/.test(robots)
    };
  }

  function flattenJsonLdItems(parsed) {
    const items = [];
    function walk(node) {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== 'object') return;
      items.push(node);
      if (node['@graph']) walk(node['@graph']);
    }
    walk(parsed);
    return items;
  }

  function itemTypes(item) {
    const type = item['@type'];
    if (!type) return [];
    return Array.isArray(type) ? type : [type];
  }

  function hasSearchAction(item) {
    const action = item.potentialAction;
    if (!action) return false;
    const actions = Array.isArray(action) ? action : [action];
    return actions.some((a) => {
      const t = a && a['@type'];
      if (!t) return false;
      const types = Array.isArray(t) ? t : [t];
      return types.includes('SearchAction');
    });
  }

  function analyseStructuredData(jsonLdBlocks) {
    const allItems = [];
    jsonLdBlocks.forEach((block) => {
      try {
        const parsed = JSON.parse(block.raw);
        flattenJsonLdItems(parsed).forEach((item) => allItems.push(item));
      } catch (e) {
        /* skip invalid */
      }
    });

    const template = STRUCTURED_TYPES.map((def) => {
      const matches = allItems.filter((item) => {
        const types = itemTypes(item);
        if (!types.some((t) => def.types.includes(t))) return false;
        if (def.needsSearchAction && types.includes('WebSite')) return hasSearchAction(item);
        return true;
      });
      return {
        id: def.id,
        label: def.label,
        found: matches.length > 0,
        matches
      };
    });

    return { template, allItems };
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
    const googlebot = metaContent('name', 'googlebot');
    const keywords = metaContent('name', 'keywords');
    const author = metaContent('name', 'author');
    const publisher = metaContent('name', 'publisher') || metaContent('property', 'article:publisher');
    const viewport = metaContent('name', 'viewport');
    const charset = collectCharset();
    const contentLanguage =
      metaContent('http-equiv', 'content-language') ||
      metaContent('http-equiv', 'Content-Language') ||
      '';
    const og = allMetaByPrefix('property', 'og:');
    const twitter = allMetaByPrefix('name', 'twitter:');
    const pinMedia =
      metaContent('property', 'pin:media') || metaContent('name', 'pin:media') || '';
    const lang = (document.documentElement.getAttribute('lang') || '').trim();
    const hreflang = collectHreflang();
    const xDefault = hreflang.find((h) => h.hreflang.toLowerCase() === 'x-default');

    const headings = collectHeadings();
    const h1Count = headings.filter((h) => h.level === 1).length;
    const images = collectImages();
    const links = collectLinks();
    const jsonLd = collectJsonLd();
    const structured = analyseStructuredData(jsonLd);
    const visibleBreadcrumbs = detectVisibleBreadcrumbs();

    const headScripts = [...document.querySelectorAll('head script[src]')];
    const blockingHeadScripts = headScripts.filter((s) => {
      if (s.hasAttribute('async') || s.hasAttribute('defer')) return false;
      if ((s.getAttribute('type') || '').trim() && s.getAttribute('type') !== 'text/javascript') return false;
      return true;
    });

    const faviconEl =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]');
    const favicon = faviconEl ? (faviconEl.getAttribute('href') || '').trim() : '';
    const appleTouchEl = document.querySelector('link[rel="apple-touch-icon"]');
    const appleTouchIcon = appleTouchEl ? (appleTouchEl.getAttribute('href') || '').trim() : '';
    const themeColor = metaContent('name', 'theme-color');
    const preconnectCount = document.querySelectorAll('link[rel="preconnect"]').length;
    const prefetchCount = document.querySelectorAll('link[rel="prefetch"], link[rel="dns-prefetch"]').length;
    let lazyImageCount = 0;
    document.querySelectorAll('img[loading="lazy"]').forEach((el) => {
      if (!isExcluded(el)) lazyImageCount += 1;
    });
    let iframeCount = 0;
    document.querySelectorAll('iframe').forEach((el) => {
      if (!isExcluded(el)) iframeCount += 1;
    });

    const stylesheetCount = document.querySelectorAll('link[rel="stylesheet"], style').length;
    const scriptCount = document.querySelectorAll('script').length;
    const wordCount = visibleTextWordCount(mainContentRoot());
    const robotsFlags = parseRobotsFlags(robots + ' ' + googlebot);

    const warnings = [];
    let score = 100;

    if (!title) {
      warnings.push({ level: 'error', text: 'Page title is missing' });
      score -= 20;
    } else if (title.length > 60) {
      warnings.push({ level: 'warn', text: 'Title is long (' + title.length + ' chars, aim for ≤60 for Google snippets)' });
      score -= 5;
    } else if (title.length < 10) {
      warnings.push({ level: 'warn', text: 'Title is short (' + title.length + ' chars, aim for 10–60)' });
      score -= 5;
    }

    if (!description) {
      warnings.push({ level: 'error', text: 'Meta description is missing' });
      score -= 15;
    } else if (description.length > 160) {
      warnings.push({
        level: 'warn',
        text: 'Meta description is long (' + description.length + ' chars, aim for ≤160 for Google snippets)'
      });
      score -= 5;
    } else if (description.length < 50) {
      warnings.push({
        level: 'warn',
        text: 'Meta description is short (' + description.length + ' chars, aim for 50–160)'
      });
      score -= 3;
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

    if (robotsFlags.noindex) {
      warnings.push({
        level: 'info',
        text: 'robots noindex is set (expected on Shadow — live site should not use this)'
      });
    }

    if (!og['og:image']) {
      warnings.push({ level: 'warn', text: 'og:image is missing (social previews need an image)' });
      score -= 5;
    }
    if (!og['og:title']) {
      warnings.push({ level: 'warn', text: 'og:title is missing (social previews need a title)' });
      score -= 5;
    }
    const ogThin = !og['og:title'] || !og['og:description'] || !og['og:image'];
    if (!twitter['twitter:card'] && ogThin) {
      warnings.push({ level: 'warn', text: 'twitter:card is missing and Open Graph tags are thin' });
      score -= 3;
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

    const decorativeCount = images.filter((img) => img.decorative).length;
    if (decorativeCount) {
      warnings.push({
        level: 'info',
        text: decorativeCount + ' decorative image(s) with empty alt (valid if intentional)'
      });
    }

    const courseType = structured.template.find((t) => t.id === 'course');
    if (courseType && !courseType.found) {
      warnings.push({ level: 'warn', text: 'Course structured data not found (recommended for programme pages)' });
      score -= 5;
    }
    const orgType = structured.template.find((t) => t.id === 'organization');
    if (orgType && !orgType.found) {
      const eduType = structured.template.find((t) => t.id === 'local-edu');
      if (!eduType || !eduType.found) {
        warnings.push({
          level: 'warn',
          text: 'Organization or EducationalOrganization structured data not found'
        });
        score -= 5;
      }
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
      googlebot,
      robotsFlags,
      keywords,
      author,
      publisher,
      viewport,
      charset,
      contentLanguage,
      og,
      twitter,
      pinMedia,
      lang,
      hreflang,
      xDefault,
      url: location.href,
      headings,
      headingCounts,
      h1Count,
      images,
      links,
      jsonLd,
      structured,
      visibleBreadcrumbs,
      technical: {
        https: location.protocol === 'https:',
        wordCount,
        scriptCount,
        stylesheetCount,
        blockingHeadScripts: blockingHeadScripts.length,
        blockingHeadScriptSrcs: blockingHeadScripts.map((s) => s.src || s.getAttribute('src') || '(inline)'),
        favicon,
        appleTouchIcon,
        themeColor,
        preconnectCount,
        prefetchCount,
        lazyImageCount,
        iframeCount
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
    const full = String(val);
    const needsTitle = opts.truncate && full.length > opts.truncate;
    const title = needsTitle || (opts.mono && full.length > 40) ? ' title="' + escapeHtml(full) + '"' : '';
    return '<span class="' + classes.join(' ') + '"' + title + '>' + escapeHtml(text) + '</span>';
  }

  function scoreClass(score) {
    if (score >= 80) return 'shadow-seo-score--good';
    if (score >= 60) return 'shadow-seo-score--ok';
    return 'shadow-seo-score--poor';
  }

  function scoreRingSvg(score) {
    const r = 42;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    return (
      '<svg class="shadow-seo-score-svg" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="shadow-seo-score-track" cx="50" cy="50" r="' +
      r +
      '" fill="none" stroke-width="6"/>' +
      '<circle class="shadow-seo-score-fill" cx="50" cy="50" r="' +
      r +
      '" fill="none" stroke-width="6" stroke-linecap="round" ' +
      'stroke-dasharray="' +
      circ.toFixed(2) +
      '" stroke-dashoffset="' +
      offset.toFixed(2) +
      '" transform="rotate(-90 50 50)"/>' +
      '</svg>'
    );
  }

  function warningTitle(level) {
    if (level === 'error') return 'Critical';
    if (level === 'warn') return 'Warning';
    if (level === 'good') return 'All clear';
    return 'Note';
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
    const issues =
      data.warnings.length
        ? data.warnings
        : [{ level: 'good', text: 'No major issues detected on this page' }];

    const issueCards = issues
      .map(
        (w) =>
          '<article class="shadow-seo-issue-card shadow-seo-issue-card--' +
          w.level +
          '">' +
          '<span class="shadow-seo-issue-icon" aria-hidden="true">' +
          warningIcon(w.level) +
          '</span>' +
          '<div class="shadow-seo-issue-body">' +
          '<h4 class="shadow-seo-issue-title">' +
          escapeHtml(warningTitle(w.level)) +
          '</h4>' +
          '<p class="shadow-seo-issue-detail">' +
          escapeHtml(w.text) +
          '</p>' +
          '</div></article>'
      )
      .join('');

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
      renderFieldGroup('Issues', '<div class="shadow-seo-issue-cards">' + issueCards + '</div>', {
        plain: true
      }) +
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
      if (locateKey === 'meta-googlebot') return data.googlebot;
      if (locateKey === 'meta-keywords') return data.keywords;
      if (locateKey === 'meta-author') return data.author;
      if (locateKey === 'meta-publisher') return data.publisher;
      if (locateKey === 'meta-lang') return data.lang;
      if (locateKey === 'meta-charset') return data.charset;
      if (locateKey === 'meta-viewport') return data.viewport;
      if (locateKey === 'og-title') return data.og['og:title'] || '';
      if (locateKey === 'og-description') return data.og['og:description'] || '';
      if (locateKey === 'og-url') return data.og['og:url'] || '';
      if (locateKey === 'og-image') return data.og['og:image'] || '';
      if (locateKey === 'og-type') return data.og['og:type'] || '';
      if (locateKey === 'og-locale') return data.og['og:locale'] || '';
      if (locateKey === 'og-site_name') return data.og['og:site_name'] || '';
      if (locateKey === 'og-image_width') return data.og['og:image:width'] || '';
      if (locateKey === 'og-image_height') return data.og['og:image:height'] || '';
      if (locateKey === 'og-image_alt') return data.og['og:image:alt'] || '';
      if (locateKey === 'twitter-card') return data.twitter['twitter:card'] || '';
      if (locateKey === 'twitter-title') return data.twitter['twitter:title'] || '';
      if (locateKey === 'twitter-description') return data.twitter['twitter:description'] || '';
      if (locateKey === 'twitter-image') return data.twitter['twitter:image'] || '';
      if (locateKey === 'twitter-site') return data.twitter['twitter:site'] || '';
      if (locateKey === 'twitter-creator') return data.twitter['twitter:creator'] || '';
      if (locateKey === 'pin-media') return data.pinMedia || '';

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

      const kwMatch = locateKey.match(/^kw-(single|pair)-(.+)$/);
      if (kwMatch) {
        try {
          return decodeURIComponent(kwMatch[2]);
        } catch (e) {
          return '';
        }
      }
    }

    const staticMap = {
      Title: data.title,
      'Meta description': data.description,
      'Page URL': data.url,
      'Canonical URL': data.canonical,
      Canonical: data.canonical,
      URL: data.url,
      Robots: data.robots,
      Googlebot: data.googlebot,
      Keywords: data.keywords,
      Author: data.author,
      Publisher: data.publisher,
      Language: data.lang,
      Charset: data.charset,
      Viewport: data.viewport,
      'Word count': String(data.technical.wordCount),
      HTTPS: data.technical.https ? 'Yes' : 'No',
      'Content-Language': data.contentLanguage,
      Favicon: data.technical.favicon,
      'Apple touch icon': data.technical.appleTouchIcon,
      'Theme colour': data.technical.themeColor
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

  function renderFieldGroup(title, innerHtml, opts) {
    opts = opts || {};
    const bodyClass = opts.plain ? 'shadow-seo-group-card shadow-seo-group-card--plain' : 'shadow-seo-group-card';
    return (
      '<section class="shadow-seo-group">' +
      (title ? '<h3 class="shadow-seo-group-title">' + escapeHtml(title) + '</h3>' : '') +
      '<div class="' +
      bodyClass +
      '">' +
      innerHtml +
      '</div></section>'
    );
  }

  function renderFieldRow(label, value, opts) {
    opts = opts || {};
    const fieldName = opts.fieldName || label;
    const locateKey = opts.locate || '';
    const rowClass =
      'shadow-seo-field-row' +
      (opts.info ? ' shadow-seo-field-row--info' : '') +
      (opts.media ? ' shadow-seo-field-row--media' : '') +
      (opts.warn ? ' shadow-seo-field-row--warn' : '') +
      (opts.badge ? ' shadow-seo-field-row--badge' : '') +
      (opts.googleHint || opts.googleStatus ? ' shadow-seo-field-row--google' : '');
    const labelHtml = opts.badge
      ? '<span class="' + opts.badge + '">' + escapeHtml(label) + '</span>'
      : '<span class="shadow-seo-field-label">' + escapeHtml(label) + '</span>';
    if (opts.info) {
      return (
        '<div class="' +
        rowClass +
        '">' +
        labelHtml +
        '<div class="shadow-seo-field-value">' +
        '<span class="shadow-seo-info-text">' +
        escapeHtml(String(value)) +
        '</span></div></div>'
      );
    }
    let valueHtml = opts.raw ? String(value) : renderCellValue(value, opts);
    if (opts.googleHint || opts.googleStatus) {
      valueHtml =
        '<div class="shadow-seo-field-stack">' +
        '<div class="shadow-seo-field-primary">' +
        valueHtml +
        '</div>' +
        (opts.googleHint
          ? '<p class="shadow-seo-google-hint">' + escapeHtml(opts.googleHint) + '</p>'
          : '') +
        (opts.googleStatus ? googleStatusPill(opts.googleStatus) : '') +
        '</div>';
    }
    return (
      '<div class="' +
      rowClass +
      '">' +
      labelHtml +
      '<div class="shadow-seo-field-value">' +
      valueHtml +
      '</div>' +
      '<div class="shadow-seo-field-actions">' +
      rowMenuHtml(fieldName, locateKey) +
      '</div></div>'
    );
  }

  function renderFieldRows(rows) {
    return rows
      .map((r) => renderFieldRow(r[0], r[1], Object.assign({}, r[2] || {}, { fieldName: r[0] })))
      .join('');
  }

  function renderFieldTable(rows, groupTitle) {
    return (
      '<div class="shadow-seo-groups">' +
      renderFieldGroup(groupTitle || '', renderFieldRows(rows)) +
      '</div>'
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
    return renderFieldTable(rows, 'Document meta');
  }

  function renderSocial(data) {
    const ogRows = OG_FIELDS.map((key) => {
      const rowOpts = { mono: true, truncate: 64, emptyLabel: 'Not set' };
      if (OG_LOCATE_KEYS[key]) rowOpts.locate = OG_LOCATE_KEYS[key];
      return [key, data.og[key] || '', rowOpts];
    });
    const twitterRows = TWITTER_FIELDS.map((key) => {
      const rowOpts = { mono: true, truncate: 64, emptyLabel: 'Not set' };
      if (TWITTER_LOCATE_KEYS[key]) rowOpts.locate = TWITTER_LOCATE_KEYS[key];
      return [key, data.twitter[key] || '', rowOpts];
    });
    const otherRows = [
      [
        'Pinterest (pin:media)',
        data.pinMedia || '',
        {
          mono: true,
          truncate: 64,
          emptyLabel: 'Not set',
          locate: 'pin-media',
          fieldName: 'Pinterest pin:media'
        }
      ],
      ['LinkedIn', 'Uses Open Graph', { info: true }]
    ];
    return (
      '<div class="shadow-seo-groups">' +
      renderFieldGroup('Open Graph', renderFieldRows(ogRows)) +
      renderFieldGroup('Twitter / X', renderFieldRows(twitterRows)) +
      renderFieldGroup('Other social', renderFieldRows(otherRows)) +
      '</div>'
    );
  }

  function renderInternational(data) {
    const hreflangRows = data.hreflang.length
      ? data.hreflang.map((h, i) => [
          h.hreflang,
          h.href,
          { mono: true, truncate: 56, locate: 'hreflang-' + i, fieldName: 'hreflang: ' + h.hreflang }
        ])
      : [];
    const rows = [
      [
        'x-default hreflang',
        data.xDefault ? data.xDefault.href : '',
        { mono: true, truncate: 56, emptyLabel: 'Not set', locate: data.xDefault ? 'hreflang-x-default' : '' }
      ],
      [
        'Content-Language',
        data.contentLanguage,
        { emptyLabel: 'Not set', locate: data.contentLanguage ? 'meta-content-language' : '' }
      ]
    ];
    let html = '<div class="shadow-seo-groups">';
    html += renderFieldGroup('Locale signals', renderFieldRows(rows));
    if (hreflangRows.length) {
      html += renderFieldGroup('hreflang alternates', renderFieldRows(hreflangRows));
    } else {
      html +=
        renderFieldGroup(
          'hreflang alternates',
          '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>',
          { plain: true }
        );
    }
    html += '</div>';
    return html;
  }

  function renderCrawlSecurity(data) {
    const t = data.technical;
    const flags = data.robotsFlags;
    const rows = [
      ['HTTPS', t.https ? 'Yes' : 'No', {}],
      ['noindex', flags.noindex ? 'Yes' : 'No', {}],
      ['nofollow', flags.nofollow ? 'Yes' : 'No', {}],
      [
        'X-Robots-Tag (server)',
        'Check server headers',
        { fieldName: 'X-Robots-Tag (server)' }
      ]
    ];
    return (
      '<div class="shadow-seo-groups">' +
      renderFieldGroup('Crawl & security', renderFieldRows(rows)) +
      '<p class="shadow-seo-subhead">HTTP response headers (including X-Robots-Tag) cannot be read from the browser. Check server or CDN settings.</p>' +
      '</div>'
    );
  }

  function renderHeadings(data) {
    const counts = data.headingCounts;
    const h1Text = data.headings.filter((h) => h.level === 1).map((h) => h.text).join('; ');
    const summary =
      '<div class="shadow-seo-heading-counts">' +
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        .map(
          (k) =>
            '<span class="' +
            headingBadgeClass(parseInt(k.charAt(1), 10)) +
            '">' +
            k.toUpperCase() +
            ' <span class="shadow-seo-tabular">' +
            counts[k] +
            '</span></span>'
        )
        .join('') +
      '</div>';
    const h1Row = applyGoogleGuidance(
      'H1 heading',
      h1Text,
      'h1',
      { emptyLabel: 'Missing', locate: data.headings.find((h) => h.level === 1) ? 'heading-' + data.headings.findIndex((h) => h.level === 1) : '' },
      data.h1Count > 0
    );
    const list =
      data.headings.length
        ? renderFieldRows(
            data.headings.map((h, i) => [
              h.tag.toUpperCase(),
              h.text,
              {
                emptyLabel: 'Empty',
                locate: 'heading-' + i,
                fieldName: h.tag.toUpperCase() + ' heading',
                badge: headingBadgeClass(h.level)
              }
            ])
          )
        : '<p class="shadow-seo-empty-state">' + emptyPill('No headings') + '</p>';
    return (
      '<div class="shadow-seo-groups">' +
      renderFieldGroup('Summary', summary, { plain: true }) +
      renderFieldGroup('Google guidance', renderFieldRows([h1Row])) +
      (data.headings.length
        ? renderFieldGroup('On this page', list)
        : '<div class="shadow-seo-group-card">' + list + '</div>') +
      '</div>'
    );
  }

  function renderImages(data) {
    const total = data.images.length;
    const missingAltCount = data.images.filter((img) => img.missingAlt).length;
    const decorativeCount = data.images.filter((img) => img.decorative).length;
    let html =
      '<p class="shadow-seo-counts">Total: ' +
      total +
      ' · Missing alt: ' +
      missingAltCount +
      (decorativeCount ? ' · Decorative (empty alt): ' + decorativeCount : '') +
      '</p>';
    if (!total) {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('No images') + '</p>';
      return html;
    }
    const rows = data.images.map((img, i) => {
      let altDisplay = '';
      if (img.missingAlt) {
        altDisplay = '<span class="shadow-seo-badge-missing-alt">Missing alt</span>';
      } else if (img.decorative) {
        altDisplay = '<span class="shadow-seo-badge-missing-alt">Decorative (empty alt)</span>';
      } else {
        altDisplay = escapeHtml(truncate(img.alt, 40));
      }
      const value =
        renderCellValue(img.src, { mono: true, truncate: 48, emptyLabel: 'Not set' }) +
        '<br><span class="shadow-seo-link-text">' +
        altDisplay +
        '</span>' +
        (img.dims ? ' <span class="shadow-seo-link-text">' + escapeHtml(img.dims) + '</span>' : '');
      return [
        img.missingAlt ? 'Image alt' : img.decorative ? 'Image (decorative)' : 'Image',
        value,
        {
          media: true,
          warn: img.missingAlt,
          locate: 'image-' + i,
          fieldName: img.missingAlt ? 'Image alt' : 'Image',
          raw: true
        }
      ];
    });
    html +=
      renderFieldGroup('Images', renderFieldRows(rows)) +
      '</div>';
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
      ' · rel=nofollow: ' +
      links.nofollowCount +
      '</p>' +
      '<p class="shadow-seo-subhead">Broken links cannot be fully detected client-side without fetching each URL.</p>';
    const slice = links.internal.slice(0, 15);
    if (slice.length) {
      const intRows = slice.map((l, i) => [
        'Internal',
        '<a href="' +
          escapeHtml(l.href) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(truncate(l.href, 56)) +
          '</a>' +
          (l.text ? ' <span class="shadow-seo-link-text">' + escapeHtml(l.text) + '</span>' : '') +
          (l.nofollow ? ' <span class="shadow-seo-link-text">nofollow</span>' : ''),
        {
          media: true,
          locate: 'link-int-' + i,
          fieldName: 'Internal link',
          raw: true,
          badge: 'shadow-seo-link-badge shadow-seo-link-badge--internal'
        }
      ]);
      html +=
        '<div class="shadow-seo-groups">' +
        renderFieldGroup('Internal (first ' + slice.length + ')', renderFieldRows(intRows)) +
        '</div>';
    } else {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>';
    }
    const extSlice = links.external.slice(0, 10);
    if (extSlice.length) {
      const extRows = extSlice.map((l, i) => [
        'External',
        '<a href="' +
          escapeHtml(l.href) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(truncate(l.href, 56)) +
          '</a>' +
          (l.nofollow ? ' <span class="shadow-seo-link-text">nofollow</span>' : ''),
        {
          media: true,
          locate: 'link-ext-' + i,
          fieldName: 'External link',
          raw: true,
          badge: 'shadow-seo-link-badge shadow-seo-link-badge--external'
        }
      ]);
      html +=
        '<div class="shadow-seo-groups">' +
        renderFieldGroup('External (first ' + extSlice.length + ')', renderFieldRows(extRows)) +
        '</div>';
    } else if (!slice.length) {
      html += '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>';
    }
    return html;
  }

  function renderStructuredTypeRow(entry) {
    if (!entry.found) {
      return renderFieldRow(entry.label, '', { emptyLabel: 'Not set', fieldName: entry.label });
    }
    const firstMatch = entry.matches[0];
    let pretty = '';
    try {
      pretty = JSON.stringify(firstMatch, null, 2);
    } catch (e) {
      pretty = String(firstMatch);
    }
    const value =
      '<span class="shadow-seo-value shadow-seo-value--found">Found</span>' +
      (entry.matches.length > 1 ? ' <span class="shadow-seo-link-text">(' + entry.matches.length + ')</span>' : '') +
      '<details class="shadow-seo-jsonld shadow-seo-jsonld--inline"><summary class="shadow-seo-jsonld-summary">View JSON</summary>' +
      '<pre class="shadow-seo-pre shadow-seo-pre--json">' +
      highlightJson(pretty) +
      '</pre></details>';
    return renderFieldRow(entry.label, value, {
      fieldName: entry.label,
      raw: true,
      locate: 'structured-' + entry.id
    });
  }

  function renderStructured(data) {
    const templateRows = data.structured.template.map((entry) => renderStructuredTypeRow(entry)).join('');
    let html =
      '<div class="shadow-seo-groups">' +
      renderFieldGroup('Google rich result types', templateRows);

    if (data.jsonLd.length) {
      html += data.jsonLd
        .map((block, i) => {
          const locateKey = findJsonLdVisibleTarget(block) ? 'jsonld-' + i : '';
          return renderFieldGroup(
            'JSON-LD block ' + block.index,
            '<details class="shadow-seo-jsonld"><summary class="shadow-seo-jsonld-summary">' +
              '<span>' +
              block.raw.length +
              ' chars</span>' +
              rowMenuHtml('Structured data block ' + block.index, locateKey) +
              '</summary><pre class="shadow-seo-pre shadow-seo-pre--json">' +
              highlightJson(block.pretty) +
              '</pre></details>',
            { plain: true }
          );
        })
        .join('');
    } else {
      html += renderFieldGroup(
        'JSON-LD blocks found',
        '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>',
        { plain: true }
      );
    }
    html += '</div>';
    return html;
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
      },
      { label: 'Lazy-loaded images', value: String(t.lazyImageCount) },
      { label: 'iframes', value: String(t.iframeCount) },
      { label: 'Preconnect hints', value: String(t.preconnectCount) },
      { label: 'Prefetch / dns-prefetch', value: String(t.prefetchCount) }
    ];
    let html =
      '<div class="shadow-seo-groups">' +
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
    const assetRows = [
      ['Favicon', t.favicon, { mono: true, truncate: 56, emptyLabel: 'Not set', locate: 'tech-favicon' }],
      [
        'Apple touch icon',
        t.appleTouchIcon,
        { mono: true, truncate: 56, emptyLabel: 'Not set', locate: 'tech-apple-touch' }
      ],
      [
        'Theme colour',
        t.themeColor,
        { emptyLabel: 'Not set', locate: t.themeColor ? 'tech-theme-color' : '' }
      ]
    ];
    html += renderFieldGroup('Icons & theme', renderFieldRows(assetRows));
    const scriptRows = t.blockingHeadScripts
      ? t.blockingHeadScriptSrcs.map((s) => [
          'Script',
          s,
          { mono: true, truncate: 64, emptyLabel: 'Not set', fieldName: 'Blocking script' }
        ])
      : [];
    html += scriptRows.length
      ? renderFieldGroup('Blocking script sources', renderFieldRows(scriptRows))
      : renderFieldGroup(
          'Blocking script sources',
          '<p class="shadow-seo-empty-state">' + emptyPill('None') + '</p>',
          { plain: true }
        );
    html += '</div>';
    return html;
  }

  function normaliseToken(word) {
    return String(word || '')
      .toLowerCase()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/[^a-z0-9'-]/g, '');
  }

  function tokenizeText(text) {
    const tokens = [];
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .forEach((raw) => {
        const word = normaliseToken(raw);
        if (word.length >= 3 && !STOP_WORDS.has(word)) tokens.push(word);
      });
    return tokens;
  }

  function addTermCount(map, term, source) {
    if (!term) return;
    if (!map.has(term)) map.set(term, { count: 0, sources: new Set() });
    const entry = map.get(term);
    entry.count += 1;
    entry.sources.add(source);
  }

  function addBigramCounts(map, tokens, source) {
    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = tokens[i] + ' ' + tokens[i + 1];
      addTermCount(map, pair, source);
    }
  }

  function collectKeywordSources() {
    const sources = { body: [], heading: [], link: [], alt: [] };
    const root = mainContentRoot();

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
    while (walker.nextNode()) {
      sources.body.push(walker.currentNode.textContent.trim());
    }

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      if (isExcluded(el)) return;
      const text = (el.innerText || '').trim();
      if (text) sources.heading.push(text);
    });

    document.querySelectorAll('a[href]').forEach((el) => {
      if (isExcluded(el)) return;
      const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
      if (text) sources.link.push(text);
    });

    document.querySelectorAll('img[alt]').forEach((el) => {
      if (isExcluded(el)) return;
      const alt = (el.getAttribute('alt') || '').trim();
      if (alt) sources.alt.push(alt);
    });

    return sources;
  }

  function analyseKeywords(data) {
    const sources = collectKeywordSources();
    const singles = new Map();
    const bigrams = new Map();
    let totalWords = 0;

    Object.entries(sources).forEach(([source, chunks]) => {
      chunks.forEach((chunk) => {
        const tokens = tokenizeText(chunk);
        totalWords += tokens.length;
        tokens.forEach((token) => addTermCount(singles, token, source));
        addBigramCounts(bigrams, tokens, source);
      });
    });

    function topTerms(map, limit) {
      return [...map.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([term, entry]) => ({
          term,
          count: entry.count,
          density: totalWords ? (entry.count / totalWords) * 100 : 0,
          sources: [...entry.sources].sort()
        }));
    }

    const analysis = {
      totalWords,
      singles: topTerms(singles, 30),
      bigrams: topTerms(bigrams, 30),
      metaKeywords: (data.keywords || '').trim()
    };
    lastKeywordAnalysis = analysis;
    return analysis;
  }

  function keywordSourceBadges(sourceList) {
    const labels = { body: 'Body', heading: 'Heading', link: 'Link', alt: 'Alt' };
    return sourceList
      .map(
        (s) =>
          '<span class="shadow-seo-kw-badge shadow-seo-kw-badge--' +
          s +
          '">' +
          escapeHtml(labels[s] || s) +
          '</span>'
      )
      .join('');
  }

  function keywordLocateKey(term, kind) {
    return 'kw-' + kind + '-' + encodeURIComponent(term);
  }

  function renderKeywordTermTable(terms, kind, label) {
    if (!terms.length) {
      return renderFieldGroup(label, '<p class="shadow-seo-empty-state">' + emptyPill('None found') + '</p>', {
        plain: true
      });
    }
    const rows = terms
      .map((item) => {
        const locateKey = keywordLocateKey(item.term, kind);
        const fieldName = (kind === 'pair' ? 'Keyword pair' : 'Keyword') + ': ' + item.term;
        return (
          '<tr class="shadow-seo-kw-row">' +
          '<td class="shadow-seo-kw-term">' +
          escapeHtml(item.term) +
          '</td>' +
          '<td class="shadow-seo-kw-count shadow-seo-tabular">' +
          item.count +
          '</td>' +
          '<td class="shadow-seo-kw-density shadow-seo-tabular">' +
          item.density.toFixed(1) +
          '%</td>' +
          '<td class="shadow-seo-kw-sources">' +
          keywordSourceBadges(item.sources) +
          '</td>' +
          '<td class="shadow-seo-kw-actions">' +
          rowMenuHtml(fieldName, locateKey) +
          '</td></tr>'
        );
      })
      .join('');
    const table =
      '<div class="shadow-seo-kw-table-wrap">' +
      '<table class="shadow-seo-kw-table">' +
      '<thead><tr>' +
      '<th scope="col">Term</th>' +
      '<th scope="col">Count</th>' +
      '<th scope="col">Density</th>' +
      '<th scope="col">Sources</th>' +
      '<th scope="col"><span class="shadow-seo-sr-only">Actions</span></th>' +
      '</tr></thead><tbody>' +
      rows +
      '</tbody></table></div>';
    return renderFieldGroup(label, table);
  }

  function renderKeywords(data) {
    const analysis = analyseKeywords(data);
    let html = '<div class="shadow-seo-groups">';
    html += renderFieldGroup(
      'Meta tag',
      renderFieldRows([
        [
          'Meta keywords',
          analysis.metaKeywords,
          { truncate: 80, emptyLabel: 'Not set', locate: 'meta-keywords', fieldName: 'Meta keywords' }
        ]
      ])
    );
    html +=
      '<p class="shadow-seo-counts">Analysed ' +
      analysis.totalWords +
      ' content words from body, headings, links, and alt text</p>' +
      renderKeywordTermTable(analysis.singles, 'single', 'Top keywords') +
      renderKeywordTermTable(analysis.bigrams, 'pair', 'Keyword pairs') +
      '</div>';
    return html;
  }

  function renderSection(data, sectionId) {
    switch (sectionId) {
      case 'overview':
        return renderOverview(data);
      case 'meta':
        return renderMetaTable(data);
      case 'international':
        return renderInternational(data);
      case 'social':
        return renderSocial(data);
      case 'security':
        return renderCrawlSecurity(data);
      case 'headings':
        return renderHeadings(data);
      case 'images':
        return renderImages(data);
      case 'links':
        return renderLinks(data);
      case 'keywords':
        return renderKeywords(data);
      case 'structured':
        return renderStructured(data);
      case 'technical':
        return renderTechnical(data);
      default:
        return '';
    }
  }

  function renderTabs() {
    const navEl = qs('#shadow-seo-nav');
    if (!navEl) return;
    navEl.innerHTML = '';
    navEl.setAttribute('role', 'tablist');
    navEl.setAttribute('aria-label', 'SEO audit sections');
    SECTIONS.forEach((section) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'shadow-seo-nav-item' + (activeSection === section.id ? ' shadow-seo-nav-item--active' : '');
      btn.textContent = section.label;
      btn.dataset.section = section.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', activeSection === section.id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (activeSection === section.id) return;
        activeSection = section.id;
        renderAudit();
      });
      navEl.appendChild(btn);
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

  function findFirstVisibleTextMatch(term) {
    if (!term) return null;
    const needle = String(term).toLowerCase();
    const walker = document.createTreeWalker(mainContentRoot(), NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || isExcluded(parent)) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent || '';
      if (text.toLowerCase().indexOf(needle) >= 0) {
        const parent = walker.currentNode.parentElement;
        if (parent && !isExcluded(parent)) return parent;
      }
    }
    return null;
  }

  function resolveLocateTarget(key) {
    const data = lastAuditData;
    if (!data || !key) return null;

    if (key === 'meta-title') return firstVisibleH1();
    if (key === 'meta-description') return metaElement('name', 'description');
    if (key === 'meta-canonical') return document.querySelector('link[rel="canonical"]');
    if (key === 'meta-robots') return metaElement('name', 'robots');
    if (key === 'meta-googlebot') return metaElement('name', 'googlebot');
    if (key === 'meta-keywords') return metaElement('name', 'keywords');
    if (key === 'meta-author') return metaElement('name', 'author');
    if (key === 'meta-publisher') {
      return metaElement('name', 'publisher') || metaElement('property', 'article:publisher');
    }
    if (key === 'meta-lang') return document.documentElement;
    if (key === 'meta-charset') {
      return document.querySelector('meta[charset]') || document.querySelector('meta[http-equiv="Content-Type" i]');
    }
    if (key === 'meta-viewport') return metaElement('name', 'viewport');
    if (key === 'meta-content-language') {
      return (
        metaElement('http-equiv', 'content-language') || metaElement('http-equiv', 'Content-Language')
      );
    }

    const hreflangMatch = key.match(/^hreflang-(\d+)$/);
    if (hreflangMatch) {
      const h = data.hreflang[parseInt(hreflangMatch[1], 10)];
      return h ? h.el : null;
    }
    if (key === 'hreflang-x-default' && data.xDefault) return data.xDefault.el;

    if (key === 'og-title' || key === 'twitter-title') {
      return firstVisibleH1() || metaElement('property', 'og:title') || metaElement('name', 'twitter:title');
    }
    if (key === 'og-description' || key === 'twitter-description') {
      return (
        metaElement('property', 'og:description') || metaElement('name', 'twitter:description')
      );
    }
    if (key === 'og-url') return metaElement('property', 'og:url');
    if (key === 'og-image') return findImageByUrl(data.og['og:image']) || metaElement('property', 'og:image');
    if (key === 'twitter-image') {
      return findImageByUrl(data.twitter['twitter:image']) || metaElement('name', 'twitter:image');
    }
    if (key === 'og-type') return metaElement('property', 'og:type');
    if (key === 'og-locale') return metaElement('property', 'og:locale');
    if (key === 'og-site_name') return metaElement('property', 'og:site_name');
    if (key === 'og-image_width') return metaElement('property', 'og:image:width');
    if (key === 'og-image_height') return metaElement('property', 'og:image:height');
    if (key === 'og-image_alt') return metaElement('property', 'og:image:alt');
    if (key === 'twitter-card') return metaElement('name', 'twitter:card');
    if (key === 'twitter-site') return metaElement('name', 'twitter:site');
    if (key === 'twitter-creator') return metaElement('name', 'twitter:creator');
    if (key === 'pin-media') {
      return metaElement('property', 'pin:media') || metaElement('name', 'pin:media');
    }

    if (key === 'tech-favicon') {
      return (
        document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]')
      );
    }
    if (key === 'tech-apple-touch') return document.querySelector('link[rel="apple-touch-icon"]');
    if (key === 'tech-theme-color') return metaElement('name', 'theme-color');

    const kwMatch = key.match(/^kw-(single|pair)-(.+)$/);
    if (kwMatch) {
      try {
        return findFirstVisibleTextMatch(decodeURIComponent(kwMatch[2]));
      } catch (e) {
        return null;
      }
    }

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
    if (popover) {
      popover.hidden = true;
      popover.style.top = '';
      popover.style.left = '';
    }
    if (openRowMenu === menu) openRowMenu = null;
  }

  function positionRowMenuPopover(menu) {
    const btn = menu.querySelector('.shadow-seo-row-menu-btn');
    const popover = menu.querySelector('.shadow-seo-row-menu-popover');
    if (!btn || !popover) return;
    popover.hidden = false;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const popW = popover.offsetWidth;
    const popH = popover.offsetHeight;
    let left = rect.right - popW;
    let top = rect.bottom + 4;
    if (left < margin) left = margin;
    if (left + popW > window.innerWidth - margin) left = window.innerWidth - popW - margin;
    if (top + popH > window.innerHeight - margin) top = rect.top - popH - 4;
    if (top < margin) top = margin;
    popover.style.top = Math.round(top) + 'px';
    popover.style.left = Math.round(left) + 'px';
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
    positionRowMenuPopover(menu);
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
    body.classList.remove('shadow-seo-section--visible');
    body.innerHTML = renderSection(data, activeSection);
    requestAnimationFrame(() => {
      body.classList.add('shadow-seo-section--visible');
    });
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
      toggle.classList.toggle('shadow-seo-footer-btn--active', highlightOn);
      toggle.textContent = highlightOn ? 'Hide highlights' : 'Highlight on page';
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
