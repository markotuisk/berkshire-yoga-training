/**
 * Shadow mode design audit — typography, colours, accessibility, and token mismatches.
 */
(function () {
  'use strict';

  const EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge, #shadow-design-overlay, .shadow-design-badge';

  const TOKEN_VARS = [
    '--accent',
    '--accent-text',
    '--accent-on',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--bg-canvas',
    '--bg-white',
    '--bg-light',
    '--border-subtle',
    '--border-muted',
    '--highlight',
    '--highlight-warm',
    '--charcoal',
    '--charcoal-hover'
  ];

  const EXPECTED_FONT_HINTS = ['figtree', 'system-ui', 'apple system', '-apple-system', 'blinkmacsystemfont', 'segoe ui'];

  const SECTIONS = [
    { id: 'summary', label: 'Summary' },
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colours' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'issues', label: 'Issues' }
  ];

  const DESIGN_ISSUE_KINDS = ['inline-style', 'font-family', 'text-color'];
  const A11Y_ISSUE_PREFIX = 'a11y-';

  let helpers = null;
  let activeSection = 'summary';
  let auditCache = null;
  let locateEls = [];
  let locateTimer = null;
  let locateIndex = {};
  let menuPortal = null;
  let openRowMenu = null;
  let activeRowLocateKey = null;
  let activeRowForTicket = null;
  let menuIdCounter = 0;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isExcluded(el) {
    return !el || el.closest(EXCLUDE_SELECTOR);
  }

  function colorToHex(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    const m = document.createElement('canvas');
    m.width = 1;
    m.height = 1;
    const ctx = m.getContext('2d');
    if (!ctx) return color.trim();
    ctx.fillStyle = color;
    return ctx.fillStyle;
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    const h = hex.replace('#', '');
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16)
      };
    }
    if (h.length === 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
      };
    }
    return null;
  }

  function relativeLuminance(rgb) {
    if (!rgb) return 0;
    const linear = [rgb.r, rgb.g, rgb.b].map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function contrastRatio(fgHex, bgHex) {
    const fg = relativeLuminance(hexToRgb(fgHex));
    const bg = relativeLuminance(hexToRgb(bgHex));
    const lighter = Math.max(fg, bg);
    const darker = Math.min(fg, bg);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function primaryFontFamily(ff) {
    if (!ff) return '';
    return ff.split(',')[0].trim().replace(/^["']|["']$/g, '');
  }

  function isVisible(el, cs) {
    if (!el || isExcluded(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    return true;
  }

  function hasDirectText(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  }

  function accessibleName(el) {
    if (!el) return '';
    const aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria;
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      return labelledby
        .split(/\s+/)
        .map((id) => {
          const node = document.getElementById(id);
          return node ? (node.textContent || '').trim() : '';
        })
        .filter(Boolean)
        .join(' ');
    }
    return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function bumpMap(map, key, sample) {
    if (!key) return;
    const entry = map.get(key) || { count: 0, samples: [] };
    entry.count += 1;
    if (entry.samples.length < 3 && sample) {
      const tag = sample.tagName ? sample.tagName.toLowerCase() : '';
      const cls = sample.className && typeof sample.className === 'string'
        ? sample.className.split(/\s+/).slice(0, 2).join('.')
        : '';
      const label = cls ? tag + '.' + cls : tag;
      if (label && !entry.samples.includes(label)) entry.samples.push(label);
    }
    map.set(key, entry);
  }

  function getDesignTokens() {
    const st = getComputedStyle(document.documentElement);
    const tokens = {};
    TOKEN_VARS.forEach((v) => {
      const raw = st.getPropertyValue(v).trim();
      if (raw) tokens[v] = { raw, hex: colorToHex(raw) };
    });
    return tokens;
  }

  function collectDisplayClasses() {
    const set = new Set();
    document.querySelectorAll('[class*="display-"]').forEach((el) => {
      if (isExcluded(el)) return;
      el.className.split(/\s+/).forEach((c) => {
        if (c.startsWith('display-')) set.add(c);
      });
    });
    return [...set].sort();
  }

  function getEffectiveBackground(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      if (isExcluded(node)) break;
      const cs = getComputedStyle(node);
      const hex = colorToHex(cs.backgroundColor);
      if (hex && hex !== 'rgba(0, 0, 0, 0)') return hex;
      node = node.parentElement;
    }
    return colorToHex(getComputedStyle(document.body).backgroundColor) || '#ffffff';
  }

  function isLargeText(cs) {
    const px = parseFloat(cs.fontSize) || 0;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const bold = cs.fontWeight === 'bold' || weight >= 700;
    return px >= 24 || (bold && px >= 18.66);
  }

  function isContentImage(el) {
    if (!el || el.tagName !== 'IMG') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width >= 100 || rect.height >= 100) return true;
    if (el.closest('a')) return true;
    const nw = el.naturalWidth || 0;
    const nh = el.naturalHeight || 0;
    return nw >= 100 || nh >= 100;
  }

  function inputHasLabel(el) {
    if (!el) return false;
    const id = el.id;
    if (id) {
      let label = null;
      if (typeof CSS !== 'undefined' && CSS.escape) {
        label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      } else {
        label = [...document.querySelectorAll('label[for]')].find((n) => n.getAttribute('for') === id) || null;
      }
      if (label && !isExcluded(label)) return true;
    }
    if (el.closest('label') && !isExcluded(el.closest('label'))) return true;
    if ((el.getAttribute('aria-label') || '').trim()) return true;
    if ((el.getAttribute('aria-labelledby') || '').trim()) return true;
    if (el.getAttribute('title')) return true;
    return false;
  }

  function pushIssue(list, issue) {
    list.push({
      severity: issue.severity || 'warn',
      kind: issue.kind,
      message: issue.message,
      detail: issue.detail || '',
      elements: issue.elements || []
    });
  }

  function auditAccessibility() {
    const issues = [];
    const images = [];
    const headings = [];
    const contrastRows = [];
    const links = [];
    const buttons = [];
    const inputs = [];
    const contrastSeen = new Set();
    let contrastSamples = 0;
    const MAX_CONTRAST = 60;

    document.querySelectorAll('img').forEach((el) => {
      if (isExcluded(el)) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      const alt = el.getAttribute('alt');
      const hasAlt = el.hasAttribute('alt');
      const emptyAlt = hasAlt && (!alt || !alt.trim());
      const missingAlt = !hasAlt;
      const content = isContentImage(el);
      const src = (el.currentSrc || el.src || '').split('/').pop().slice(0, 40);
      if (missingAlt) {
        const row = { key: src || 'Image', detail: 'Missing alt attribute', severity: 'error', el };
        images.push(row);
        pushIssue(issues, {
          severity: 'error',
          kind: 'a11y-image',
          message: 'Image missing alt attribute',
          detail: src,
          elements: [el]
        });
      } else if (emptyAlt && content) {
        const row = { key: src || 'Image', detail: 'Empty alt on likely content image', severity: 'warn', el };
        images.push(row);
        pushIssue(issues, {
          severity: 'warn',
          kind: 'a11y-image',
          message: 'Empty alt on content image',
          detail: src + ' (inside link or large)',
          elements: [el]
        });
      }
    });

    const headingEls = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      if (isExcluded(el)) return;
      const level = parseInt(el.tagName.charAt(1), 10);
      headingEls.push({ level, text: accessibleName(el).slice(0, 80), el });
    });

    const h1Count = headingEls.filter((h) => h.level === 1).length;
    if (!h1Count) {
      pushIssue(issues, {
        severity: 'error',
        kind: 'a11y-heading',
        message: 'No H1 heading on page',
        detail: 'Add one main page heading',
        elements: []
      });
    } else if (h1Count > 1) {
      pushIssue(issues, {
        severity: 'warn',
        kind: 'a11y-heading',
        message: 'Multiple H1 headings (' + h1Count + ')',
        detail: 'Prefer a single main heading',
        elements: headingEls.filter((h) => h.level === 1).map((h) => h.el)
      });
    }

    let prevLevel = 0;
    headingEls.forEach((h) => {
      headings.push(h);
      if (prevLevel && h.level > prevLevel + 1) {
        pushIssue(issues, {
          severity: 'warn',
          kind: 'a11y-heading',
          message: 'Skipped heading level (h' + prevLevel + ' to h' + h.level + ')',
          detail: h.text || '(empty)',
          elements: [h.el]
        });
      }
      prevLevel = h.level;
    });

    document.querySelectorAll('body *').forEach((el) => {
      if (isExcluded(el) || contrastSamples >= MAX_CONTRAST) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      const textish =
        hasDirectText(el) ||
        /^(H[1-6]|P|A|BUTTON|LABEL|SPAN|LI|TD|TH|FIGCAPTION|BLOCKQUOTE|SMALL|STRONG|EM|DT|DD)$/i.test(el.tagName);
      if (!textish || !accessibleName(el)) return;

      const fg = colorToHex(cs.color);
      const bg = getEffectiveBackground(el);
      if (!fg || !bg) return;
      const pairKey = fg + '|' + bg;
      if (contrastSeen.has(pairKey)) return;
      contrastSeen.add(pairKey);
      contrastSamples += 1;

      const ratio = contrastRatio(fg, bg);
      const threshold = isLargeText(cs) ? 3 : 4.5;
      if (ratio < threshold) {
        const row = {
          key: ratio.toFixed(2) + ':1',
          fg,
          bg,
          ratio,
          threshold,
          large: isLargeText(cs),
          sample: el.tagName.toLowerCase(),
          el
        };
        contrastRows.push(row);
        pushIssue(issues, {
          severity: 'error',
          kind: 'a11y-contrast',
          message: 'Low colour contrast (' + ratio.toFixed(2) + ':1)',
          detail: fg + ' on ' + bg + ' (needs ' + threshold + ':1)',
          elements: [el]
        });
      }
    });

    document.querySelectorAll('a[href]').forEach((el) => {
      if (isExcluded(el)) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      const name = accessibleName(el);
      const href = (el.getAttribute('href') || '').trim();
      if (!name) {
        const iconOnly = el.querySelector('img, svg, [class*="icon"]');
        const detail = iconOnly ? 'Icon-only link' : 'Empty link text';
        links.push({ key: href.slice(0, 60), detail, severity: 'error', el });
        pushIssue(issues, {
          severity: 'error',
          kind: 'a11y-link',
          message: detail,
          detail: href.slice(0, 80),
          elements: [el]
        });
      }
    });

    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      if (isExcluded(el)) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      if (!accessibleName(el)) {
        buttons.push({ key: el.tagName.toLowerCase(), detail: 'No accessible name', severity: 'error', el });
        pushIssue(issues, {
          severity: 'error',
          kind: 'a11y-button',
          message: 'Button without accessible name',
          detail: el.className ? String(el.className).slice(0, 60) : '',
          elements: [el]
        });
      }
    });

    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (isExcluded(el)) return;
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      if (!inputHasLabel(el)) {
        const key = el.tagName.toLowerCase() + (type ? '[' + type + ']' : '');
        inputs.push({ key, detail: 'No label or aria-label', severity: 'error', el });
        pushIssue(issues, {
          severity: 'error',
          kind: 'a11y-input',
          message: 'Form field without label',
          detail: key + (el.name ? ' name="' + el.name + '"' : ''),
          elements: [el]
        });
      }
    });

    const lang = (document.documentElement.getAttribute('lang') || '').trim();
    const pageBasics = { lang };
    if (!lang) {
      pushIssue(issues, {
        severity: 'error',
        kind: 'a11y-page',
        message: 'Missing lang attribute on <html>',
        detail: 'Add lang="en" or appropriate language',
        elements: [document.documentElement]
      });
    }

    const skipLink = document.querySelector('a[href^="#"]');
    let hasSkip = false;
    if (skipLink && !isExcluded(skipLink)) {
      const text = accessibleName(skipLink).toLowerCase();
      hasSkip = /skip/.test(text);
    }
    pageBasics.hasSkipLink = hasSkip;
    if (!hasSkip) {
      pushIssue(issues, {
        severity: 'info',
        kind: 'a11y-page',
        message: 'No skip link detected',
        detail: 'Optional but helpful for keyboard users',
        elements: []
      });
    }

    const mains = [];
    document.querySelectorAll('main, [role="main"]').forEach((el) => {
      if (!isExcluded(el)) mains.push(el);
    });
    const landmarks = { mainCount: mains.length };
    if (!mains.length) {
      pushIssue(issues, {
        severity: 'warn',
        kind: 'a11y-landmark',
        message: 'No main landmark found',
        detail: 'Add <main> or role="main"',
        elements: []
      });
    } else if (mains.length > 1) {
      pushIssue(issues, {
        severity: 'info',
        kind: 'a11y-landmark',
        message: 'Multiple main landmarks (' + mains.length + ')',
        detail: 'Prefer a single main content region',
        elements: mains
      });
    }

    return {
      images,
      headings,
      contrast: contrastRows.sort((a, b) => a.ratio - b.ratio),
      links,
      buttons,
      inputs,
      pageBasics,
      landmarks,
      issues
    };
  }

  function auditPage() {
    const typography = new Map();
    const fontFamilies = new Map();
    const fontSizes = new Map();
    const fontWeights = new Map();
    const lineHeights = new Map();
    const textColors = new Map();
    const bgColors = new Map();
    const borderColors = new Map();
    const issues = [];
    const tokens = getDesignTokens();
    const tokenHexSet = new Set(
      Object.values(tokens)
        .map((t) => t.hex)
        .filter(Boolean)
    );

    document.querySelectorAll('body *').forEach((el) => {
      if (isExcluded(el)) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;

      if (el.hasAttribute('style')) {
        issues.push({
          severity: 'warn',
          kind: 'inline-style',
          message: 'Inline style on <' + el.tagName.toLowerCase() + '>',
          detail: (el.getAttribute('style') || '').slice(0, 120),
          elements: [el]
        });
      }

      const textish =
        hasDirectText(el) ||
        /^(H[1-6]|P|A|BUTTON|LABEL|SPAN|LI|TD|TH|FIGCAPTION|BLOCKQUOTE|SMALL|STRONG|EM|DT|DD)$/i.test(el.tagName);

      if (textish) {
        const family = primaryFontFamily(cs.fontFamily);
        const size = cs.fontSize;
        const weight = cs.fontWeight;
        const lineHeight = cs.lineHeight;
        const typoKey = family + ' · ' + size + ' · ' + weight + ' · ' + lineHeight;
        bumpMap(typography, typoKey, el);
        bumpMap(fontFamilies, family, el);
        bumpMap(fontSizes, size, el);
        bumpMap(fontWeights, weight, el);
        bumpMap(lineHeights, lineHeight, el);

        const familyLower = family.toLowerCase();
        const fontOk = EXPECTED_FONT_HINTS.some((h) => familyLower.includes(h));
        if (family && !fontOk) {
          issues.push({
            severity: 'warn',
            kind: 'font-family',
            message: 'Unexpected font: ' + family,
            detail: size + ', weight ' + weight,
            elements: [el]
          });
        }

        const textHex = colorToHex(cs.color);
        if (textHex) {
          bumpMap(textColors, textHex, el);
          if (!tokenHexSet.has(textHex) && textHex !== '#000000' && textHex !== '#ffffff') {
            issues.push({
              severity: 'warn',
              kind: 'text-color',
              message: 'Font colour not in CSS tokens',
              detail: textHex + ' (' + family + ' ' + size + ')',
              elements: [el]
            });
          }
        }
      }

      const bgHex = colorToHex(cs.backgroundColor);
      if (bgHex && bgHex !== '#000000') {
        bumpMap(bgColors, bgHex, el);
      }

      const borderHex = colorToHex(cs.borderTopColor);
      if (borderHex && cs.borderTopWidth !== '0px' && borderHex !== '#000000') {
        bumpMap(borderColors, borderHex, el);
      }
    });

    const a11y = auditAccessibility();
    const allIssues = dedupeIssues(issues.concat(a11y.issues));

    return {
      typography: sortMap(typography),
      fontFamilies: sortMap(fontFamilies),
      fontSizes: sortMap(fontSizes),
      fontWeights: sortMap(fontWeights),
      lineHeights: sortMap(lineHeights),
      textColors: sortMap(textColors),
      bgColors: sortMap(bgColors),
      borderColors: sortMap(borderColors),
      displayClasses: collectDisplayClasses(),
      tokens,
      a11y,
      issues: allIssues,
      scannedAt: new Date().toLocaleString('en-GB')
    };
  }

  function dedupeIssues(list) {
    const seen = new Map();
    const out = [];
    list.forEach((item) => {
      const key = item.kind + '|' + item.message + '|' + item.detail;
      const prev = seen.get(key);
      if (prev) {
        prev.count += 1;
        if (prev.elements.length < 5 && item.elements[0]) prev.elements.push(item.elements[0]);
      } else {
        const copy = { ...item, count: 1, elements: item.elements[0] ? [item.elements[0]] : [] };
        seen.set(key, copy);
        out.push(copy);
      }
    });
    return out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }

  function severityRank(s) {
    if (s === 'error') return 3;
    if (s === 'warn') return 2;
    if (s === 'info') return 1;
    return 0;
  }

  function sortMap(map) {
    return [...map.entries()]
      .map(([key, val]) => ({ key, count: val.count, samples: val.samples }))
      .sort((a, b) => b.count - a.count);
  }

  function isA11yIssue(issue) {
    return issue.kind && issue.kind.indexOf(A11Y_ISSUE_PREFIX) === 0;
  }

  function isDesignIssue(issue) {
    return DESIGN_ISSUE_KINDS.indexOf(issue.kind) >= 0;
  }

  function countA11yBySeverity(a, severity) {
    return a.issues.filter((i) => isA11yIssue(i) && i.severity === severity).length;
  }

  function clearLocateHighlight() {
    locateEls.forEach((el) => el.classList.remove('shadow-highlight'));
    locateEls = [];
    if (locateTimer) clearTimeout(locateTimer);
    locateTimer = null;
  }

  function locateElements(elements) {
    clearLocateHighlight();
    if (!elements || !elements.length) return false;
    locateEls = elements.filter((el) => el && el.isConnected && !isExcluded(el));
    if (!locateEls.length) return false;
    locateEls.forEach((el) => el.classList.add('shadow-highlight'));
    const first = locateEls[0];
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      locateTimer = setTimeout(clearLocateHighlight, 4500);
    }
    return true;
  }

  function swatch(hex) {
    return '<span class="shadow-design-swatch" style="background:' + escapeHtml(hex) + '" aria-hidden="true"></span>';
  }

  function contrastSwatch(fg, bg) {
    return (
      '<span class="shadow-design-contrast-pair" aria-hidden="true">' +
      swatch(fg) +
      '<span class="shadow-design-contrast-on" style="background:' +
      escapeHtml(bg) +
      ';color:' +
      escapeHtml(fg) +
      '">Aa</span>' +
      swatch(bg) +
      '</span>'
    );
  }

  function severityPill(severity) {
    if (severity === 'error') return '<span class="shadow-design-pill shadow-design-pill--error">Error</span>';
    if (severity === 'info') return '<span class="shadow-design-pill shadow-design-pill--info">Info</span>';
    return '<span class="shadow-design-pill shadow-design-pill--warn">Warning</span>';
  }

  function rowMenuHtml(fieldName, locateKey, menuOpts) {
    menuOpts = menuOpts || {};
    const canLocate = !!(locateKey && locateIndex[locateKey] && locateIndex[locateKey].length);
    return (
      '<span class="shadow-design-row-menu">' +
      '<button type="button" class="shadow-design-row-menu-btn" aria-haspopup="menu" aria-expanded="false" ' +
      'aria-label="Actions for ' +
      escapeHtml(fieldName) +
      '" data-field-name="' +
      escapeHtml(fieldName) +
      '" data-locate="' +
      escapeHtml(locateKey || '') +
      '">' +
      '<span class="shadow-design-row-menu-dots" aria-hidden="true">⋯</span>' +
      '</button>' +
      '<div class="shadow-design-row-menu-popover" role="menu" hidden>' +
      (canLocate
        ? '<button type="button" class="shadow-design-row-menu-item" role="menuitem" data-action="locate">Locate on page</button>'
        : '') +
      '<button type="button" class="shadow-design-row-menu-item" role="menuitem" data-action="change">Request change</button>' +
      '</div></span>'
    );
  }

  function renderSummary(a) {
    const designWarn = a.issues.filter((i) => isDesignIssue(i) && i.severity === 'warn').length;
    const a11yErrors = countA11yBySeverity(a, 'error');
    const a11yWarns = countA11yBySeverity(a, 'warn');
    return (
      '<div class="shadow-design-summary">' +
      '<p class="shadow-design-lead">Scanned visible page content (shadow UI excluded). ' +
      escapeHtml(a.scannedAt) + '</p>' +
      '<p class="shadow-design-hint">Accessibility supports SEO and Google quality signals; fix errors before go-live.</p>' +
      '<ul class="shadow-design-stats">' +
      '<li><strong>' + a.fontFamilies.length + '</strong> font families</li>' +
      '<li><strong>' + a.fontSizes.length + '</strong> font sizes</li>' +
      '<li><strong>' + a.fontWeights.length + '</strong> font weights</li>' +
      '<li><strong>' + a.lineHeights.length + '</strong> line heights</li>' +
      '<li><strong>' + a.textColors.length + '</strong> font colours</li>' +
      '<li><strong>' + designWarn + '</strong> design warnings</li>' +
      '<li><strong>' + a11yErrors + '</strong> accessibility errors</li>' +
      '<li><strong>' + a11yWarns + '</strong> accessibility warnings</li>' +
      '</ul>' +
      (a.displayClasses.length
        ? '<p class="shadow-design-meta"><strong>Display classes:</strong> ' +
          escapeHtml(a.displayClasses.join(', ')) +
          '</p>'
        : '') +
      '<div class="shadow-design-tokens">' +
      '<p class="shadow-design-meta"><strong>CSS tokens (:root)</strong></p>' +
      '<ul class="shadow-design-token-list">' +
      TOKEN_VARS.map((v) => {
        const t = a.tokens[v];
        if (!t) return '';
        return (
          '<li>' +
          swatch(t.hex || '#ccc') +
          '<code>' + escapeHtml(v) + '</code> ' +
          '<span class="shadow-design-token-val">' + escapeHtml(t.raw) + '</span>' +
          '</li>'
        );
      }).join('') +
      '</ul></div></div>'
    );
  }

  function renderTableRows(rows, locateKey, fieldPrefix) {
    if (!rows.length) return '<p class="shadow-design-empty">None found on this page.</p>';
    return (
      '<table class="shadow-design-table"><thead><tr>' +
      '<th>Value</th><th>Uses</th><th>Sample</th><th></th>' +
      '</tr></thead><tbody>' +
      rows
        .map((row, idx) => {
          const id = locateKey + '-' + idx;
          const fieldName = fieldPrefix + ': ' + row.key;
          return (
            '<tr class="shadow-design-row" data-locate="' + escapeHtml(id) + '">' +
            '<td class="shadow-design-value">' + escapeHtml(row.key) + '</td>' +
            '<td class="shadow-design-count">' + row.count + '</td>' +
            '<td class="shadow-design-sample">' + escapeHtml((row.samples || []).join(', ')) + '</td>' +
            '<td class="shadow-design-row-actions">' + rowMenuHtml(fieldName, id) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  }

  function renderColorRows(rows, locateKey, fieldPrefix) {
    if (!rows.length) return '<p class="shadow-design-empty">None found on this page.</p>';
    return (
      '<table class="shadow-design-table"><thead><tr>' +
      '<th>Colour</th><th>Uses</th><th>Sample</th><th></th>' +
      '</tr></thead><tbody>' +
      rows
        .map((row, idx) => {
          const id = locateKey + '-' + idx;
          const fieldName = fieldPrefix + ': ' + row.key;
          return (
            '<tr class="shadow-design-row" data-locate="' + escapeHtml(id) + '">' +
            '<td class="shadow-design-value">' + swatch(row.key) + '<code>' + escapeHtml(row.key) + '</code></td>' +
            '<td class="shadow-design-count">' + row.count + '</td>' +
            '<td class="shadow-design-sample">' + escapeHtml((row.samples || []).join(', ')) + '</td>' +
            '<td class="shadow-design-row-actions">' + rowMenuHtml(fieldName, id) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  }

  function renderA11yRows(rows, locateKey, fieldPrefix, valueCol) {
    if (!rows.length) return '<p class="shadow-design-empty">None found on this page.</p>';
    return (
      '<table class="shadow-design-table"><thead><tr>' +
      '<th>' + escapeHtml(valueCol || 'Item') + '</th><th>Detail</th><th></th>' +
      '</tr></thead><tbody>' +
      rows
        .map((row, idx) => {
          const id = locateKey + '-' + idx;
          const fieldName = fieldPrefix + ': ' + row.key;
          const valueCell =
            row.fg && row.bg
              ? contrastSwatch(row.fg, row.bg) + '<span>' + escapeHtml(row.key) + '</span>'
              : escapeHtml(row.key);
          return (
            '<tr class="shadow-design-row shadow-design-row--' + escapeHtml(row.severity || 'warn') + '" data-locate="' +
            escapeHtml(id) + '">' +
            '<td class="shadow-design-value">' + valueCell + '</td>' +
            '<td class="shadow-design-sample">' + escapeHtml(row.detail || row.text || '') + '</td>' +
            '<td class="shadow-design-row-actions">' + rowMenuHtml(fieldName, id) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  }

  function collectMatchingElements(matcher) {
    const els = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (isExcluded(el)) return;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) return;
      if (matcher(el, cs)) els.push(el);
    });
    return els.slice(0, 8);
  }

  function rowElementsForFontSize(size) {
    return collectMatchingElements((el, cs) => cs.fontSize === size);
  }

  function rowElementsForFontFamily(family) {
    return collectMatchingElements(
      (el, cs) => primaryFontFamily(cs.fontFamily) === family && isTextElement(el, cs)
    );
  }

  function rowElementsForFontWeight(weight) {
    return collectMatchingElements((el, cs) => cs.fontWeight === weight && isTextElement(el, cs));
  }

  function rowElementsForLineHeight(lineHeight) {
    return collectMatchingElements((el, cs) => cs.lineHeight === lineHeight && isTextElement(el, cs));
  }

  function rowElementsForTextColor(hex) {
    return collectMatchingElements((el, cs) => colorToHex(cs.color) === hex && isTextElement(el, cs));
  }

  function rowElementsForBgColor(hex) {
    return collectMatchingElements((el, cs) => colorToHex(cs.backgroundColor) === hex);
  }

  function rowElementsForBorderColor(hex) {
    return collectMatchingElements(
      (el, cs) => colorToHex(cs.borderTopColor) === hex && cs.borderTopWidth !== '0px'
    );
  }

  function isTextElement(el, cs) {
    return (
      hasDirectText(el) ||
      /^(H[1-6]|P|A|BUTTON|LABEL|SPAN|LI|TD|TH|FIGCAPTION|BLOCKQUOTE|SMALL|STRONG|EM|DT|DD)$/i.test(el.tagName)
    );
  }

  function rowElementsForTypoCombo(key) {
    return collectMatchingElements((el, cs) => {
      if (!isTextElement(el, cs)) return false;
      const family = primaryFontFamily(cs.fontFamily);
      const typoKey = family + ' · ' + cs.fontSize + ' · ' + cs.fontWeight + ' · ' + cs.lineHeight;
      return typoKey === key;
    });
  }

  function buildLocateIndex(a) {
    const index = {};
    a.fontFamilies.forEach((row, idx) => {
      index['family-' + idx] = rowElementsForFontFamily(row.key);
    });
    a.fontSizes.forEach((row, idx) => {
      index['size-' + idx] = rowElementsForFontSize(row.key);
    });
    a.fontWeights.forEach((row, idx) => {
      index['weight-' + idx] = rowElementsForFontWeight(row.key);
    });
    a.lineHeights.forEach((row, idx) => {
      index['lh-' + idx] = rowElementsForLineHeight(row.key);
    });
    a.typography.forEach((row, idx) => {
      index['typo-' + idx] = rowElementsForTypoCombo(row.key);
    });
    a.textColors.forEach((row, idx) => {
      index['text-' + idx] = rowElementsForTextColor(row.key);
    });
    a.bgColors.forEach((row, idx) => {
      index['bg-' + idx] = rowElementsForBgColor(row.key);
    });
    a.borderColors.forEach((row, idx) => {
      index['border-' + idx] = rowElementsForBorderColor(row.key);
    });
    a.a11y.images.forEach((row, idx) => {
      index['a11y-img-' + idx] = row.el ? [row.el] : [];
    });
    a.a11y.headings.forEach((row, idx) => {
      index['a11y-h-' + idx] = row.el ? [row.el] : [];
    });
    a.a11y.contrast.forEach((row, idx) => {
      index['a11y-contrast-' + idx] = row.el ? [row.el] : [];
    });
    a.a11y.links.forEach((row, idx) => {
      index['a11y-link-' + idx] = row.el ? [row.el] : [];
    });
    a.a11y.buttons.forEach((row, idx) => {
      index['a11y-btn-' + idx] = row.el ? [row.el] : [];
    });
    a.a11y.inputs.forEach((row, idx) => {
      index['a11y-input-' + idx] = row.el ? [row.el] : [];
    });
    a.issues.forEach((row, idx) => {
      index['issue-' + idx] = row.elements || [];
    });
    return index;
  }

  function renderSection(a) {
    if (activeSection === 'summary') return renderSummary(a);
    if (activeSection === 'typography') {
      return (
        '<h3 class="shadow-design-h3">Font families</h3>' +
        renderTableRows(a.fontFamilies, 'family', 'Font family') +
        '<h3 class="shadow-design-h3">Font sizes</h3>' +
        renderTableRows(a.fontSizes, 'size', 'Font size') +
        '<h3 class="shadow-design-h3">Font weights</h3>' +
        renderTableRows(a.fontWeights, 'weight', 'Font weight') +
        '<h3 class="shadow-design-h3">Line heights</h3>' +
        renderTableRows(a.lineHeights, 'lh', 'Line height') +
        '<h3 class="shadow-design-h3">Full combinations</h3>' +
        '<p class="shadow-design-meta">Family · size · weight · line-height</p>' +
        renderTableRows(a.typography, 'typo', 'Typography')
      );
    }
    if (activeSection === 'colors') {
      return (
        '<h3 class="shadow-design-h3">Font colours</h3>' +
        '<p class="shadow-design-meta">Computed text colour on visible elements</p>' +
        renderColorRows(a.textColors, 'text', 'Font colour') +
        '<h3 class="shadow-design-h3">Background colours</h3>' +
        renderColorRows(a.bgColors, 'bg', 'Background colour') +
        '<h3 class="shadow-design-h3">Border colours</h3>' +
        renderColorRows(a.borderColors, 'border', 'Border colour')
      );
    }
    if (activeSection === 'accessibility') {
      const langNote = a.a11y.pageBasics.lang
        ? 'lang="' + escapeHtml(a.a11y.pageBasics.lang) + '"'
        : 'lang not set';
      const skipNote = a.a11y.pageBasics.hasSkipLink ? 'Skip link found' : 'No skip link';
      const mainNote =
        a.a11y.landmarks.mainCount === 0
          ? 'No main landmark'
          : a.a11y.landmarks.mainCount === 1
            ? 'One main landmark'
            : a.a11y.landmarks.mainCount + ' main landmarks';
      return (
        '<p class="shadow-design-meta">Live page accessibility audit (shadow UI excluded). WCAG AA thresholds: 4.5:1 normal text, 3:1 large text.</p>' +
        '<h3 class="shadow-design-h3">Page basics</h3>' +
        '<ul class="shadow-design-stats shadow-design-stats--inline">' +
        '<li>' + langNote + '</li>' +
        '<li>' + skipNote + '</li>' +
        '<li>' + mainNote + '</li>' +
        '</ul>' +
        '<h3 class="shadow-design-h3">Images</h3>' +
        renderA11yRows(a.a11y.images, 'a11y-img', 'Image', 'Image') +
        '<h3 class="shadow-design-h3">Headings</h3>' +
        renderA11yRows(
          a.a11y.headings.map((h) => ({
            key: 'H' + h.level,
            detail: h.text || '(empty)',
            severity: 'info',
            el: h.el
          })),
          'a11y-h',
          'Heading',
          'Level'
        ) +
        '<h3 class="shadow-design-h3">Colour contrast</h3>' +
        renderA11yRows(a.a11y.contrast, 'a11y-contrast', 'Contrast', 'Ratio') +
        '<h3 class="shadow-design-h3">Links</h3>' +
        renderA11yRows(a.a11y.links, 'a11y-link', 'Link', 'Href') +
        '<h3 class="shadow-design-h3">Buttons</h3>' +
        renderA11yRows(a.a11y.buttons, 'a11y-btn', 'Button', 'Element') +
        '<h3 class="shadow-design-h3">Form inputs</h3>' +
        renderA11yRows(a.a11y.inputs, 'a11y-input', 'Form field', 'Field')
      );
    }
    if (activeSection === 'issues') {
      const focused = a.issues.filter((i) => isDesignIssue(i) || isA11yIssue(i));
      if (!focused.length) {
        return '<p class="shadow-design-empty">No design or accessibility issues flagged on this page.</p>';
      }
      return (
        '<p class="shadow-design-meta">Design mismatches and accessibility findings</p>' +
        '<ul class="shadow-design-issues">' +
        focused
          .map((issue) => {
            const issueIdx = a.issues.indexOf(issue);
            const locateKey = 'issue-' + issueIdx;
            const fieldName = isA11yIssue(issue) ? 'Accessibility: ' + issue.message : 'Design: ' + issue.message;
            return (
              '<li class="shadow-design-issue shadow-design-issue--' + escapeHtml(issue.severity) + '">' +
              severityPill(issue.severity) +
              '<div class="shadow-design-issue-body">' +
              '<strong>' + escapeHtml(issue.message) + '</strong>' +
              (issue.detail ? '<span class="shadow-design-issue-detail">' + escapeHtml(issue.detail) + '</span>' : '') +
              '<span class="shadow-design-issue-count">' + issue.count + ' element(s)</span>' +
              '</div>' +
              rowMenuHtml(fieldName, locateKey) +
              '</li>'
            );
          })
          .join('') +
        '</ul>'
      );
    }
    return '';
  }

  function issuesNavCount(a) {
    return a.issues.filter((i) => isDesignIssue(i) || isA11yIssue(i)).length;
  }

  function a11yNavCount(a) {
    return a.issues.filter((i) => isA11yIssue(i)).length;
  }

  function renderNav() {
    const nav = qs('#shadow-design-nav');
    if (!nav) return;
    nav.innerHTML = SECTIONS.map((s) => {
      const active = s.id === activeSection ? ' shadow-design-nav-item--active' : '';
      let count = '';
      if (auditCache) {
        if (s.id === 'issues') count = ' <span class="shadow-design-nav-count">' + issuesNavCount(auditCache) + '</span>';
        if (s.id === 'accessibility') count = ' <span class="shadow-design-nav-count">' + a11yNavCount(auditCache) + '</span>';
      }
      return (
        '<button type="button" class="shadow-design-nav-item' + active + '" data-section="' +
        s.id +
        '" role="tab" aria-selected="' +
        (s.id === activeSection ? 'true' : 'false') +
        '">' +
        escapeHtml(s.label) +
        count +
        '</button>'
      );
    }).join('');
    nav.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSection = btn.getAttribute('data-section');
        renderAudit();
      });
    });
  }

  function designPanelBounds() {
    const card = qs('#shadow-review-modal .shadow-modal-card');
    if (card) return card.getBoundingClientRect();
    const modal = qs('#shadow-review-modal');
    if (modal && !modal.hidden) return modal.getBoundingClientRect();
    return {
      top: 8,
      left: 8,
      right: window.innerWidth - 8,
      bottom: window.innerHeight - 8
    };
  }

  function ensureMenuId(menu) {
    if (!menu.dataset.menuId) {
      menuIdCounter += 1;
      menu.dataset.menuId = 'design-menu-' + menuIdCounter;
    }
    return menu.dataset.menuId;
  }

  function ensureMenuPortal() {
    if (menuPortal && menuPortal.isConnected) {
      bindMenuPortalHandlers(menuPortal);
      return menuPortal;
    }
    menuPortal = document.getElementById('shadow-design-menu-portal');
    if (!menuPortal) {
      menuPortal = document.createElement('div');
      menuPortal.id = 'shadow-design-menu-portal';
      menuPortal.className = 'shadow-design-menu-portal';
      menuPortal.setAttribute('aria-hidden', 'true');
      document.body.appendChild(menuPortal);
    }
    bindMenuPortalHandlers(menuPortal);
    return menuPortal;
  }

  function bindMenuPortalHandlers(portal) {
    if (!portal || portal._rowMenuBound) return;
    portal._rowMenuBound = true;
    portal.addEventListener('click', onRowMenuClick);
    portal.addEventListener('keydown', onRowMenuKeydown);
    portal.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target.closest('.shadow-design-row-menu-item')) event.stopPropagation();
      },
      true
    );
  }

  function menuForPopover(popover) {
    if (!popover) return null;
    const ownerId = popover.dataset.menuOwner;
    if (ownerId) {
      if (typeof CSS !== 'undefined' && CSS.escape) {
        return document.querySelector('.shadow-design-row-menu[data-menu-id="' + CSS.escape(ownerId) + '"]');
      }
      return [...document.querySelectorAll('.shadow-design-row-menu')].find(
        (menu) => menu.dataset.menuId === ownerId
      ) || null;
    }
    return popover.closest('.shadow-design-row-menu');
  }

  function attachPopoverToPortal(menu, popover) {
    const portal = ensureMenuPortal();
    ensureMenuId(menu);
    if (popover.parentElement !== portal) portal.appendChild(popover);
    popover.dataset.menuOwner = menu.dataset.menuId;
  }

  function returnPopoverToMenu(menu, popover) {
    if (!menu || !popover || popover.parentElement === menu) return;
    menu.appendChild(popover);
    delete popover.dataset.menuOwner;
  }

  function findPopoverForMenu(menu) {
    if (!menu) return null;
    const inMenu = menu.querySelector('.shadow-design-row-menu-popover');
    if (inMenu) return inMenu;
    const menuId = menu.dataset.menuId;
    if (!menuId) return null;
    const portal = document.getElementById('shadow-design-menu-portal');
    if (!portal) return null;
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return portal.querySelector(
        '.shadow-design-row-menu-popover[data-menu-owner="' + CSS.escape(menuId) + '"]'
      );
    }
    return (
      [...portal.querySelectorAll('.shadow-design-row-menu-popover')].find(
        (popover) => popover.dataset.menuOwner === menuId
      ) || null
    );
  }

  function clearMenuPortalPopovers() {
    const portal = document.getElementById('shadow-design-menu-portal');
    if (!portal) return;
    portal.querySelectorAll('.shadow-design-row-menu-popover').forEach((popover) => {
      const menu = menuForPopover(popover);
      popover.hidden = true;
      popover.style.visibility = '';
      popover.style.display = '';
      popover.style.top = '';
      popover.style.left = '';
      if (menu) returnPopoverToMenu(menu, popover);
      else popover.remove();
    });
  }

  function closeRowMenu(menu, opts) {
    opts = opts || {};
    if (!menu) return;
    const btn = menu.querySelector('.shadow-design-row-menu-btn');
    const popover = findPopoverForMenu(menu);
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (popover) {
      popover.hidden = true;
      popover.style.visibility = '';
      popover.style.display = '';
      popover.style.top = '';
      popover.style.left = '';
      returnPopoverToMenu(menu, popover);
    }
    if (openRowMenu === menu) openRowMenu = null;
    if (!opts.keepActiveRow && !activeRowForTicket) clearActiveRow();
  }

  function positionRowMenuPopover(menu) {
    const btn = menu.querySelector('.shadow-design-row-menu-btn');
    const popover = findPopoverForMenu(menu);
    if (!btn || !popover) return;
    ensureMenuId(menu);
    attachPopoverToPortal(menu, popover);
    popover.hidden = false;
    popover.style.visibility = 'hidden';
    popover.style.top = '0';
    popover.style.left = '0';
    const rect = btn.getBoundingClientRect();
    const bounds = designPanelBounds();
    const gap = 4;
    const margin = 8;
    const popW = popover.offsetWidth;
    const popH = popover.offsetHeight;
    let left = rect.right - popW;
    let top = rect.bottom + gap;
    if (left + popW > bounds.right - margin) left = rect.left - popW;
    if (left < bounds.left + margin) left = bounds.left + margin;
    if (left + popW > bounds.right - margin) left = bounds.right - popW - margin;
    if (top + popH > bounds.bottom - margin) top = rect.top - popH - gap;
    if (top < bounds.top + margin) top = bounds.top + margin;
    popover.style.visibility = '';
    popover.style.top = Math.round(top) + 'px';
    popover.style.left = Math.round(left) + 'px';
  }

  function closeAllRowMenus(opts) {
    document.querySelectorAll('.shadow-design-row-menu').forEach((menu) => closeRowMenu(menu, opts));
    clearMenuPortalPopovers();
  }

  function bindMenuReposition() {
    if (bindMenuReposition._bound) return;
    bindMenuReposition._bound = true;
    const reposition = () => {
      if (openRowMenu) positionRowMenuPopover(openRowMenu);
    };
    window.addEventListener('scroll', reposition, { passive: true, capture: true });
    window.addEventListener('resize', reposition, { passive: true });
  }

  function openRowMenuPopoverFn(menu) {
    if (!menu) return;
    const btn = menu.querySelector('.shadow-design-row-menu-btn');
    const popover = findPopoverForMenu(menu);
    if (!btn || !popover) return;
    const locateKey = btn.dataset.locate || '';
    closeAllRowMenus({ keepActiveRow: true });
    setActiveRow(locateKey);
    btn.setAttribute('aria-expanded', 'true');
    positionRowMenuPopover(menu);
    openRowMenu = menu;
    bindMenuReposition();
    const firstItem = popover.querySelector('.shadow-design-row-menu-item');
    if (firstItem) firstItem.focus();
  }

  function findRowByLocateKey(key) {
    if (!key) return null;
    const section = qs('#shadow-design-section');
    if (!section) return null;
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return section.querySelector('[data-locate="' + CSS.escape(key) + '"]');
    }
    return [...section.querySelectorAll('[data-locate]')].find((el) => el.dataset.locate === key) || null;
  }

  function syncActiveRowHighlight() {
    const section = qs('#shadow-design-section');
    if (!section) return;
    section.querySelectorAll('.shadow-design-row--active').forEach((row) => {
      row.classList.remove('shadow-design-row--active');
    });
    if (!activeRowLocateKey) return;
    const row = findRowByLocateKey(activeRowLocateKey);
    if (row) row.classList.add('shadow-design-row--active');
  }

  function setActiveRow(locateKey) {
    activeRowLocateKey = locateKey || null;
    syncActiveRowHighlight();
  }

  function clearActiveRow() {
    activeRowLocateKey = null;
    syncActiveRowHighlight();
  }

  function isRowMenuTarget(target) {
    if (!target || !openRowMenu) return false;
    if (target.closest('.shadow-design-row-menu') === openRowMenu) return true;
    const popover = target.closest('.shadow-design-row-menu-popover');
    if (!popover || popover.hidden) return false;
    if (target.closest('.shadow-design-row-menu-item')) return menuForPopover(popover) === openRowMenu;
    return menuForPopover(popover) === openRowMenu;
  }

  function resolveFieldValue(fieldName, locateKey) {
    if (locateKey && locateIndex[locateKey] && locateIndex[locateKey][0]) {
      const el = locateIndex[locateKey][0];
      const text = accessibleName(el);
      if (text) return text.slice(0, 120);
      if (el.tagName === 'IMG') return (el.getAttribute('alt') || el.src || '').slice(0, 120);
    }
    return fieldName;
  }

  function requestDesignChange(fieldName, locateKey) {
    if (!helpers || !helpers.getPerson || !helpers.getPerson()) {
      if (helpers && helpers.showExclusive) helpers.showExclusive('person');
      return;
    }
    if (!helpers.openChangeTicket) {
      if (helpers && helpers.toast) helpers.toast('Ticket form unavailable');
      return;
    }
    activeRowForTicket = locateKey || fieldName;
    setActiveRow(locateKey);
    const fieldValue = resolveFieldValue(fieldName, locateKey);
    const element = locateKey && locateIndex[locateKey] ? locateIndex[locateKey][0] : null;
    helpers.openChangeTicket({
      fieldName,
      fieldValue,
      element,
      locateKey
    });
  }

  function onRowMenuClick(event) {
    const menuBtn = event.target.closest('.shadow-design-row-menu-btn');
    if (menuBtn) {
      event.preventDefault();
      event.stopPropagation();
      const menu = menuBtn.closest('.shadow-design-row-menu');
      const popover = menu && findPopoverForMenu(menu);
      if (popover && popover.hidden) openRowMenuPopoverFn(menu);
      else closeRowMenu(menu);
      return;
    }

    const item = event.target.closest('.shadow-design-row-menu-item');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    const popover = item.closest('.shadow-design-row-menu-popover');
    const menu = menuForPopover(popover) || item.closest('.shadow-design-row-menu');
    const menuBtnEl = menu && menu.querySelector('.shadow-design-row-menu-btn');
    const fieldName = menuBtnEl ? menuBtnEl.dataset.fieldName : '';
    const locateKey = menuBtnEl ? menuBtnEl.dataset.locate : '';
    const action = item.dataset.action;
    if (action === 'locate' && locateKey) {
      setActiveRow(locateKey);
      closeRowMenu(menu, { keepActiveRow: true });
      const ok = locateElements(locateIndex[locateKey]);
      if (ok && helpers && helpers.toast) helpers.toast('Highlighted on page');
      else if (!ok && helpers && helpers.toast) helpers.toast('Could not locate on page');
    } else if (action === 'change') {
      setActiveRow(locateKey);
      closeRowMenu(menu, { keepActiveRow: true });
      requestDesignChange(fieldName, locateKey);
    } else {
      closeRowMenu(menu);
    }
  }

  function onRowMenuKeydown(event) {
    const menu =
      event.target.closest('.shadow-design-row-menu') ||
      menuForPopover(event.target.closest('.shadow-design-row-menu-popover'));
    if (!menu) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeRowMenu(menu);
      const btn = menu.querySelector('.shadow-design-row-menu-btn');
      if (btn) btn.focus();
      return;
    }

    const item = event.target.closest('.shadow-design-row-menu-item');
    if (!item || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const popover = findPopoverForMenu(menu);
    const items = popover ? [...popover.querySelectorAll('.shadow-design-row-menu-item')] : [];
    const idx = items.indexOf(item);
    if (idx < 0) return;
    const next = event.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1];
    if (next) next.focus();
  }

  function onDocumentPointerDown(event) {
    if (!openRowMenu) return;
    const target = event.target;
    if (target && target.closest('.shadow-design-menu-portal .shadow-design-row-menu-item')) return;
    if (isRowMenuTarget(target)) return;
    closeAllRowMenus();
  }

  function bindRowMenuHandlers() {
    if (bindRowMenuHandlers._bound) return;
    bindRowMenuHandlers._bound = true;
    const section = qs('#shadow-design-section');
    if (section) {
      section.addEventListener('click', onRowMenuClick);
      section.addEventListener('keydown', onRowMenuKeydown);
    }
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
  }

  function renderAudit() {
    const panel = qs('#shadow-design-section');
    try {
      auditCache = auditPage();
      locateIndex = buildLocateIndex(auditCache);
      renderNav();
      if (!panel) return;
      panel.classList.remove('shadow-design-section--visible');
      panel.innerHTML = renderSection(auditCache);
      requestAnimationFrame(() => panel.classList.add('shadow-design-section--visible'));
      closeAllRowMenus();
      activeRowForTicket = null;
      clearActiveRow();
      bindRowMenuHandlers();
    } catch (err) {
      console.error('[TWAShadowDesign] renderAudit failed', err);
      auditCache = null;
      renderNav();
      if (panel) {
        panel.innerHTML =
          '<p class="shadow-design-empty">Design audit failed. ' +
          escapeHtml((err && err.message) || String(err)) +
          '</p>';
        panel.classList.add('shadow-design-section--visible');
      }
    }
  }

  function bindDesignControls() {
    const refresh = qs('#shadow-design-refresh');
    if (refresh && !refresh._bound) {
      refresh._bound = true;
      refresh.addEventListener('click', () => renderAudit());
    }
  }

  function getAuditSummary() {
    const data = auditPage();
    return { issueCount: data.issues.length };
  }

  function onTabActive() {
    activeSection = activeSection || 'summary';
    renderAudit();
    bindDesignControls();
  }

  function openPanel() {
    if (helpers && helpers.openReviewTab) {
      helpers.openReviewTab('design');
      return;
    }
    activeSection = 'summary';
    renderAudit();
    bindDesignControls();
  }

  function closePanel() {
    clearLocateHighlight();
    closeAllRowMenus();
  }

  function onReviewClosed() {
    clearLocateHighlight();
    closeAllRowMenus();
  }

  function onToolsClosed() {
    onReviewClosed();
  }

  function onTicketClosed() {
    activeRowForTicket = null;
    clearActiveRow();
  }

  function shutdown() {
    clearLocateHighlight();
    closeAllRowMenus();
    closePanel();
  }

  function init(h) {
    helpers = h || null;
  }

  window.TWAShadowDesign = {
    init,
    open: openPanel,
    close: closePanel,
    refresh: renderAudit,
    onTabActive,
    onReviewClosed,
    onToolsClosed,
    onTicketClosed,
    shutdown,
    getAuditSummary
  };
})();
