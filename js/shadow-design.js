/**
 * Shadow mode design audit — typography, colours, and token mismatches on the live page.
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
    { id: 'issues', label: 'Issues' }
  ];

  let helpers = null;
  let activeSection = 'summary';
  let auditCache = null;
  let locateEls = [];
  let locateTimer = null;

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

    const dedupedIssues = dedupeIssues(issues);

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
      issues: dedupedIssues,
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
        if (prev.elements.length < 5) prev.elements.push(item.elements[0]);
      } else {
        const copy = { ...item, count: 1, elements: [item.elements[0]] };
        seen.set(key, copy);
        out.push(copy);
      }
    });
    return out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }

  function severityRank(s) {
    if (s === 'warn') return 2;
    if (s === 'info') return 1;
    return 0;
  }

  function sortMap(map) {
    return [...map.entries()]
      .map(([key, val]) => ({ key, count: val.count, samples: val.samples }))
      .sort((a, b) => b.count - a.count);
  }

  function clearLocateHighlight() {
    locateEls.forEach((el) => el.classList.remove('shadow-highlight'));
    locateEls = [];
    if (locateTimer) clearTimeout(locateTimer);
    locateTimer = null;
  }

  function locateElements(elements) {
    clearLocateHighlight();
    if (!elements || !elements.length) return;
    locateEls = elements.filter((el) => el && el.isConnected && !isExcluded(el));
    locateEls.forEach((el) => el.classList.add('shadow-highlight'));
    const first = locateEls[0];
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      locateTimer = setTimeout(clearLocateHighlight, 4500);
    }
  }

  function swatch(hex) {
    return '<span class="shadow-design-swatch" style="background:' + escapeHtml(hex) + '" aria-hidden="true"></span>';
  }

  function renderSummary(a) {
    const warn = a.issues.filter((i) => i.severity === 'warn').length;
    return (
      '<div class="shadow-design-summary">' +
      '<p class="shadow-design-lead">Scanned visible page content (shadow UI excluded). ' +
      escapeHtml(a.scannedAt) + '</p>' +
      '<ul class="shadow-design-stats">' +
      '<li><strong>' + a.fontFamilies.length + '</strong> font families</li>' +
      '<li><strong>' + a.fontSizes.length + '</strong> font sizes</li>' +
      '<li><strong>' + a.fontWeights.length + '</strong> font weights</li>' +
      '<li><strong>' + a.lineHeights.length + '</strong> line heights</li>' +
      '<li><strong>' + a.textColors.length + '</strong> font colours</li>' +
      '<li><strong>' + warn + '</strong> warnings</li>' +
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

  function renderTableRows(rows, locateKey, withLocate) {
    if (!rows.length) return '<p class="shadow-design-empty">None found on this page.</p>';
    const locateCol = withLocate ? '<th></th>' : '';
    return (
      '<table class="shadow-design-table"><thead><tr>' +
      '<th>Value</th><th>Uses</th><th>Sample</th>' + locateCol +
      '</tr></thead><tbody>' +
      rows
        .map((row, idx) => {
          const id = locateKey + '-' + idx;
          const locateBtn = withLocate
            ? '<td><button type="button" class="shadow-design-locate" data-locate="' +
              escapeHtml(id) +
              '">Locate</button></td>'
            : '';
          return (
            '<tr>' +
            '<td class="shadow-design-value">' + escapeHtml(row.key) + '</td>' +
            '<td class="shadow-design-count">' + row.count + '</td>' +
            '<td class="shadow-design-sample">' + escapeHtml((row.samples || []).join(', ')) + '</td>' +
            locateBtn +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  }

  function renderColorRows(rows, locateKey, withLocate) {
    if (!rows.length) return '<p class="shadow-design-empty">None found on this page.</p>';
    const locateCol = withLocate ? '<th></th>' : '';
    return (
      '<table class="shadow-design-table"><thead><tr>' +
      '<th>Colour</th><th>Uses</th><th>Sample</th>' + locateCol +
      '</tr></thead><tbody>' +
      rows
        .map((row, idx) => {
          const id = locateKey + '-' + idx;
          const locateBtn = withLocate
            ? '<td><button type="button" class="shadow-design-locate" data-locate="' +
              escapeHtml(id) +
              '">Locate</button></td>'
            : '';
          return (
            '<tr>' +
            '<td class="shadow-design-value">' + swatch(row.key) + '<code>' + escapeHtml(row.key) + '</code></td>' +
            '<td class="shadow-design-count">' + row.count + '</td>' +
            '<td class="shadow-design-sample">' + escapeHtml((row.samples || []).join(', ')) + '</td>' +
            locateBtn +
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
    a.issues.forEach((row, idx) => {
      index['issue-' + idx] = row.elements || [];
    });
    return index;
  }

  function rowElementsForTypoCombo(key) {
    return collectMatchingElements((el, cs) => {
      if (!isTextElement(el, cs)) return false;
      const family = primaryFontFamily(cs.fontFamily);
      const typoKey = family + ' · ' + cs.fontSize + ' · ' + cs.fontWeight + ' · ' + cs.lineHeight;
      return typoKey === key;
    });
  }

  let locateIndex = {};

  function renderSection(a) {
    if (activeSection === 'summary') return renderSummary(a);
    if (activeSection === 'typography') {
      return (
        '<h3 class="shadow-design-h3">Font families</h3>' +
        renderTableRows(a.fontFamilies, 'family', true) +
        '<h3 class="shadow-design-h3">Font sizes</h3>' +
        renderTableRows(a.fontSizes, 'size', true) +
        '<h3 class="shadow-design-h3">Font weights</h3>' +
        renderTableRows(a.fontWeights, 'weight', true) +
        '<h3 class="shadow-design-h3">Line heights</h3>' +
        renderTableRows(a.lineHeights, 'lh', true) +
        '<h3 class="shadow-design-h3">Full combinations</h3>' +
        '<p class="shadow-design-meta">Family · size · weight · line-height</p>' +
        renderTableRows(a.typography, 'typo', true)
      );
    }
    if (activeSection === 'colors') {
      return (
        '<h3 class="shadow-design-h3">Font colours</h3>' +
        '<p class="shadow-design-meta">Computed text colour on visible elements</p>' +
        renderColorRows(a.textColors, 'text', true) +
        '<h3 class="shadow-design-h3">Background colours</h3>' +
        renderColorRows(a.bgColors, 'bg', true) +
        '<h3 class="shadow-design-h3">Border colours</h3>' +
        renderColorRows(a.borderColors, 'border', true)
      );
    }
    if (activeSection === 'issues') {
      const focused = a.issues.filter((i) =>
        i.kind === 'inline-style' || i.kind === 'font-family' || i.kind === 'text-color'
      );
      if (!focused.length) {
        return '<p class="shadow-design-empty">No font or colour mismatches flagged on this page.</p>';
      }
      return (
        '<p class="shadow-design-meta">Unexpected fonts, non-token font colours, and inline styles</p>' +
        '<ul class="shadow-design-issues">' +
        focused
          .map((issue, idx) => {
            const badge = '<span class="shadow-design-pill shadow-design-pill--warn">Warning</span>';
            const issueIdx = a.issues.indexOf(issue);
            return (
              '<li class="shadow-design-issue">' +
              badge +
              '<div class="shadow-design-issue-body">' +
              '<strong>' + escapeHtml(issue.message) + '</strong>' +
              (issue.detail ? '<span class="shadow-design-issue-detail">' + escapeHtml(issue.detail) + '</span>' : '') +
              '<span class="shadow-design-issue-count">' + issue.count + ' element(s)</span>' +
              '</div>' +
              '<button type="button" class="shadow-design-locate" data-locate="issue-' + issueIdx + '">Locate</button>' +
              '</li>'
            );
          })
          .join('') +
        '</ul>'
      );
    }
    return '';
  }

  function renderNav() {
    const nav = qs('#shadow-design-nav');
    if (!nav) return;
    nav.innerHTML = SECTIONS.map((s) => {
      const active = s.id === activeSection ? ' shadow-design-nav-item--active' : '';
      const count =
        s.id === 'issues' && auditCache
          ? ' <span class="shadow-design-nav-count">' +
            auditCache.issues.filter((i) =>
              i.kind === 'inline-style' || i.kind === 'font-family' || i.kind === 'text-color'
            ).length +
            '</span>'
          : '';
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

  function renderAudit() {
    auditCache = auditPage();
    locateIndex = buildLocateIndex(auditCache);
    renderNav();
    const panel = qs('#shadow-design-section');
    if (!panel) return;
    panel.classList.remove('shadow-design-section--visible');
    panel.innerHTML = renderSection(auditCache);
    requestAnimationFrame(() => panel.classList.add('shadow-design-section--visible'));
    bindLocateButtons(panel);
  }

  function bindLocateButtons(root) {
    if (!root) return;
    root.querySelectorAll('.shadow-design-locate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-locate');
        if (!id || !locateIndex[id]) return;
        locateElements(locateIndex[id]);
        if (helpers && helpers.toast) helpers.toast('Highlighted on page');
      });
    });
  }

  function bindDesignControls() {
    const refresh = qs('#shadow-design-refresh');
    if (refresh && !refresh._bound) {
      refresh._bound = true;
      refresh.addEventListener('click', () => renderAudit());
    }
  }

  function openPanel() {
    if (helpers && helpers.showFloating) helpers.showFloating('design');
    else {
      const modal = qs('#shadow-design-modal');
      if (modal) modal.hidden = false;
    }
    activeSection = 'summary';
    renderAudit();
    bindDesignControls();
  }

  function closePanel() {
    clearLocateHighlight();
    const modal = qs('#shadow-design-modal');
    if (modal) modal.hidden = true;
  }

  function onToolsClosed() {
    clearLocateHighlight();
  }

  function shutdown() {
    clearLocateHighlight();
    closePanel();
  }

  function init(h) {
    helpers = h || null;
    const btn = qs('#shadow-tools-design-btn');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        if (!h || !h.getPerson || !h.getPerson()) {
          if (h && h.showExclusive) h.showExclusive('person');
          return;
        }
        openPanel();
      });
    }
  }

  window.TWAShadowDesign = {
    init,
    open: openPanel,
    close: closePanel,
    refresh: renderAudit,
    onToolsClosed,
    shutdown
  };
})();
