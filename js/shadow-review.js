/**
 * Meridian shadow review overlay — shadow branch only.
 * Review FAB explodes into category menu; each activity opens its own draggable popup. Tickets stay in toolbar.
 */
(function () {
  'use strict';

  const PEOPLE = [
    { id: 'katia', name: 'Katia Major' },
    { id: 'raili', name: 'Raili Maripuu' },
    { id: 'marko', name: 'Marko Tuisk' }
  ];

  const CATEGORIES = [
    'Change',
    'Reconsider',
    'Bug',
    'Missing image',
    'Broken button',
    'Broken link',
    'Other'
  ];

  const STATUS_LABELS = {
    Open: 'Open',
    Discussing: 'Discussing',
    Accepted: 'Accepted',
    'On shadow': 'On shadow',
    'In progress': 'In progress',
    'Ready for review': 'Ready for review',
    Approved: 'Approved',
    'Shipped to live': 'Shipped to live',
    "Won't fix": "Won't fix",
    Duplicate: 'Duplicate',
    Blocked: 'Blocked'
  }; // backend / audit labels; partner UI uses partnerStatusLabel()

  const OPEN_STATUSES = [
    'Open',
    'Discussing',
    'Accepted',
    'On shadow',
    'In progress',
    'Ready for review',
    'Blocked'
  ];

  const CLOSED_STATUSES = ['Approved', 'Shipped to live', "Won't fix", 'Duplicate'];

  const STORAGE_PERSON = 'twa_shadow_person';
  const STORAGE_VERSION_SEEN = 'twa_shadow_version_seen';
  const STORAGE_LAST_ACTIVE = 'twa_shadow_last_active';
  const STORAGE_MODAL_POS = 'twa_shadow_modal_pos_';
  const STORAGE_INBOX_COLLAPSED = 'twa_shadow_inbox_collapsed';
  const STORAGE_DETAIL_COLLAPSED = 'twa_shadow_detail_collapsed';
  const MODAL_COLLAPSED_HEIGHT = 48;
  const COLLAPSIBLE_MODALS = ['inbox', 'detail'];
  const INSIGHTS_SECTIONS = [
    { id: 'summary', label: 'Summary', icon: 'chart' },
    { id: 'gsc', label: 'Search (GSC)', icon: 'search' },
    { id: 'ga4', label: 'Traffic (GA4)', icon: 'traffic' },
    { id: 'linkgraph', label: 'Link graph', icon: 'graph' }
  ];
  const INSIGHTS_GROUPS = [{ label: 'Page insights', ids: ['summary', 'gsc', 'ga4', 'linkgraph'] }];
  const TOOL_CATEGORIES = [
    { id: 'insights', label: 'Insights', icon: 'insights' },
    { id: 'seo', label: 'SEO', icon: 'seo' },
    { id: 'design', label: 'Design', icon: 'design' },
    { id: 'pick', label: 'Pick', icon: 'pick' }
  ];
  const CATEGORY_ICON_SVG = {
    insights:
      '<svg class="shadow-tools-cat-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12V4.5L8 2l6 2.5V12L8 14.5 2 12z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M8 8.5V14.5M8 8.5L2 6M8 8.5l6-2.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>',
    seo:
      '<svg class="shadow-tools-cat-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M10.5 10.5L14 14" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
    design:
      '<svg class="shadow-tools-cat-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5h11M4 13.5V6l4-3.5L12 6v7.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M8 2.5v4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
    pick:
      '<svg class="shadow-tools-cat-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v9M5.5 9.5L8 12l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 14h10" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'
  };
  const SECTION_ICON_SVG = {
    chart:
      '<svg class="shadow-tools-section-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 11V5h2.5v6H2zm3.5-3V5h2.5v6H5.5zm3.5 5V3h2.5v8H9z" fill="currentColor"/></svg>',
    search:
      '<svg class="shadow-tools-section-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="6" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M9 9l3 3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    traffic:
      '<svg class="shadow-tools-section-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 10.5V8l2.5-3L7 7l2.5-4L12 6.5v4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    graph:
      '<svg class="shadow-tools-section-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="3.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="10.5" cy="3.5" r="1.5" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1.5" fill="currentColor"/><path d="M4.5 9.5l5-5M4.5 9.5l5.5.5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
  };
  const ACTIVITY_DEFAULT_SIZE = { width: 400, height: 480 };
  const ACTIVITY_STACK_OFFSET = 24;
  const DOCK_MAX_PILLS = 5;
  const IDLE_MS = 60 * 60 * 1000;
  const IDLE_CHECK_MS = 60 * 1000;
  const AUDIT_SHEET_URL =
    'https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit';
  const ASSETS_FOLDER_URL =
    'https://drive.google.com/drive/folders/1TIhmFeB7LanKDhNCfiCm83ZZQTYjQKhF';
  const MAX_ASSET_BYTES = 8 * 1024 * 1024;
  const ASSET_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const DRAGGABLE_MODALS = {
    inbox: 'shadow-inbox-modal',
    detail: 'shadow-detail-modal',
    new: 'shadow-new-modal'
  };

  const SUBMENU_POS_KEY = 'tools-submenu';

  const DEFAULT_MODAL_SIZES = {};

  const TOOLS_FAB_ICON =
    '<svg class="shadow-fab-icon" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">' +
    '<path d="M3.5 7.5h15v10a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 3.5 17.5v-10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M7 7.5V5.5A2 2 0 0 1 9 3.5h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const EMPTY_ICON_SEARCH =
    '<svg class="shadow-empty-state__icon" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<circle cx="18" cy="18" r="9" fill="none" stroke="currentColor" stroke-width="1.75" opacity="0.55"/>' +
    '<path d="M25 25l6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" opacity="0.55"/></svg>';

  const EMPTY_ICON_TRAFFIC =
    '<svg class="shadow-empty-state__icon" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<rect x="8" y="22" width="5" height="10" rx="1.25" fill="currentColor" opacity="0.35"/>' +
    '<rect x="17.5" y="16" width="5" height="16" rx="1.25" fill="currentColor" opacity="0.5"/>' +
    '<rect x="27" y="10" width="5" height="22" rx="1.25" fill="currentColor" opacity="0.65"/></svg>';

  const EMPTY_ICON_GRAPH =
    '<svg class="shadow-empty-state__icon" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.55"/>' +
    '<circle cx="10" cy="12" r="3" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="30" cy="12" r="3" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="10" cy="28" r="3" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="30" cy="28" r="3" fill="currentColor" opacity="0.3"/>' +
    '<path d="M13 14l5 4M27 14l-5 4M13 26l5-4M27 26l-5-4" stroke="currentColor" stroke-width="1.25" opacity="0.35"/></svg>';

  const DRAG_GRIP_SVG =
    '<svg class="shadow-modal-drag-icon" width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" focusable="false">' +
    '<circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/>' +
    '<circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/>' +
    '<circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/></svg>';

  const COLLAPSE_CHEVRON_DOWN =
    '<svg class="shadow-modal-collapse-icon" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
    '<path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const COLLAPSE_CHEVRON_UP =
    '<svg class="shadow-modal-collapse-icon" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
    '<path d="M2.5 7.5L6 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const MODAL_MIN_WIDTH = 280;
  const MODAL_MIN_HEIGHT = 220;
  const MODAL_MAX_WIDTH_VW = 0.95;
  const MODAL_MAX_HEIGHT_VH = 0.9;

  const PICK_TARGET_SELECTOR =
    'img, [class*="placeholder-img"], a, button, h1, h2, h3, h4, h5, h6, p, li, span, time, small, strong, em, mark, label, figcaption, blockquote, dt, dd, td, th, div, ul, ol, nav, header, footer, main, aside, dl, section, article, .btn, [class*="card"], [class*="section"], [class*="badge"], [class*="tag"], [class*="category"]';
  const PICK_EXCLUDE_SELECTOR =
    '#shadow-review-root, .shadow-toolbar, .shadow-modal, #shadow-page-badges, #shadow-seo-overlay, .shadow-seo-badge, #shadow-design-overlay, .shadow-design-badge';

  let ticketsCache = [];
  let activeEl = null;
  let seoTicketDraft = null;
  let highlightEl = null;
  let pickHoverEl = null;
  let pickHoverBound = false;
  let whatsNewManual = false;
  let inboxTab = 'open';
  let pageBadgeNodes = [];
  let badgePositionBound = false;
  let toolsMenuExpanded = false;
  let activeToolCategory = null;
  let dockOverflowOpen = false;
  const openActivityPopups = new Map();
  let activityPopupCounter = 0;
  let activeDockKey = null;
  let insightsCache = null;
  let insightsFetchPath = '';
  let insightsLoading = false;
  let metricDetailModal = null;
  const METRIC_DETAIL_STORAGE_KEY = 'activity-metric-detail';

  function changelog() {
    return window.TWAShadowChangelog || { version: '0.0.0', releases: [] };
  }

  function isDeveloper(person) {
    return person && person.id === 'marko';
  }

  function isOpenStatus(status) {
    return OPEN_STATUSES.includes(status);
  }

  function isClosedStatus(status) {
    return CLOSED_STATUSES.includes(status);
  }

  function partnerStatusLabel(status) {
    if (isClosedStatus(status)) {
      if (status === 'Approved') return 'Done';
      if (status === 'Shipped to live') return 'Closed';
      if (status === "Won't fix") return "Won't fix";
      if (status === 'Duplicate') return 'Duplicate';
      return 'Closed';
    }
    if (status === 'In progress' || status === 'On shadow' || status === 'Accepted') {
      return 'In progress';
    }
    if (status === 'Ready for review') return 'Ready for review';
    if (status === 'Blocked') return 'Blocked';
    return 'Open';
  }

  function statusPillModifier(status) {
    if (isClosedStatus(status)) {
      if (status === 'Approved') return 'done';
      if (status === "Won't fix" || status === 'Duplicate') return 'muted';
      return 'closed';
    }
    if (status === 'In progress' || status === 'On shadow' || status === 'Accepted') {
      return 'progress';
    }
    if (status === 'Ready for review') return 'review';
    if (status === 'Blocked') return 'blocked';
    return 'open';
  }

  function currentPagePath() {
    return location.pathname || '/';
  }

  function normalizePagePath(path) {
    let p = String(path || '/').trim();
    if (!p.startsWith('/')) {
      try {
        p = new URL(p, location.origin).pathname;
      } catch (e) {
        p = '/';
      }
    }
    p = p.replace(/\/index\.html$/i, '/');
    if (p !== '/') {
      p = p.replace(/\.html$/i, '');
      p = p.replace(/\/+$/, '') || '/';
    }
    return p || '/';
  }

  function ticketPagePath(ticket) {
    if (ticket.pagePath) return ticket.pagePath;
    if (ticket.pageUrl) {
      try {
        return new URL(ticket.pageUrl).pathname;
      } catch (e) {
        return '/';
      }
    }
    return '/';
  }

  function pageLabel(path) {
    const norm = normalizePagePath(path);
    if (norm === '/') return 'Homepage';
    const segments = norm.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'Page';
    return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function isCurrentPage(ticket) {
    return normalizePagePath(ticketPagePath(ticket)) === normalizePagePath(currentPagePath());
  }

  function ticketMatchesPage(ticket) {
    return isCurrentPage(ticket);
  }

  function ticketCountLabel(count) {
    return count === 1 ? '1 ticket' : count + ' tickets';
  }

  function groupInboxTickets(tickets) {
    const groups = new Map();
    tickets.forEach((t) => {
      const path = normalizePagePath(ticketPagePath(t));
      if (!groups.has(path)) groups.set(path, []);
      groups.get(path).push(t);
    });

    const currentPath = normalizePagePath(currentPagePath());
    const sortedPaths = [...groups.keys()].sort((a, b) => {
      if (a === currentPath) return -1;
      if (b === currentPath) return 1;
      return a.localeCompare(b);
    });

    return sortedPaths.map((path) => ({
      path,
      isCurrent: path === currentPath,
      tickets: groups
        .get(path)
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }));
  }

  function compareVersion(a, b) {
    const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  function migrateVersionSeen() {
    if (!localStorage.getItem(STORAGE_VERSION_SEEN)) {
      localStorage.setItem(STORAGE_VERSION_SEEN, '1.0.0');
    }
  }

  function getLastSeenVersion() {
    return localStorage.getItem(STORAGE_VERSION_SEEN) || '1.0.0';
  }

  function markVersionSeen() {
    localStorage.setItem(STORAGE_VERSION_SEEN, changelog().version);
  }

  function releasesForPerson(person, onlyUnseen) {
    const seen = getLastSeenVersion();
    const dev = isDeveloper(person);
    return changelog()
      .releases.filter((r) => {
        if (onlyUnseen && compareVersion(r.version, seen) <= 0) return false;
        const userItems = r.user && r.user.length;
        const devItems = dev && r.dev && r.dev.length;
        return userItems || devItems;
      })
      .sort((a, b) => compareVersion(b.version, a.version));
  }

  function shouldShowWhatsNew(person) {
    if (!person) return false;
    return releasesForPerson(person, true).length > 0;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function api(path, options) {
    return fetch(path, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      ...options
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
      return data;
    });
  }

  function getPerson() {
    const saved = localStorage.getItem(STORAGE_PERSON);
    return PEOPLE.find((p) => p.id === saved) || null;
  }

  function setPerson(id) {
    localStorage.setItem(STORAGE_PERSON, id);
    touchActivity();
    updateToolbarUser();
  }

  function clearPerson() {
    localStorage.removeItem(STORAGE_PERSON);
    localStorage.removeItem(STORAGE_LAST_ACTIVE);
    clearPageBadges();
    updateToolbarUser();
  }

  function touchActivity() {
    if (!getPerson()) return;
    localStorage.setItem(STORAGE_LAST_ACTIVE, String(Date.now()));
  }

  function isIdleExpired() {
    const person = getPerson();
    if (!person) return false;
    const last = parseInt(localStorage.getItem(STORAGE_LAST_ACTIVE) || '0', 10);
    if (!last) return false;
    return Date.now() - last >= IDLE_MS;
  }

  function checkIdleLogout() {
    if (!getPerson()) return;
    if (isIdleExpired()) {
      performLogout('Logged out after 1 hour of inactivity.');
    }
  }

  function getModalPosition(key) {
    try {
      const raw = sessionStorage.getItem(STORAGE_MODAL_POS + key);
      if (!raw) return null;
      const pos = JSON.parse(raw);
      if (typeof pos.top === 'number' && typeof pos.left === 'number') return pos;
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function saveModalPosition(key, top, left, width, height) {
    try {
      const data = { top, left };
      if (typeof width === 'number' && width > 0) data.width = width;
      if (typeof height === 'number' && height > 0) data.height = height;
      sessionStorage.setItem(STORAGE_MODAL_POS + key, JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
  }

  function modalSizeLimits() {
    return {
      minW: MODAL_MIN_WIDTH,
      minH: MODAL_MIN_HEIGHT,
      maxW: Math.floor(window.innerWidth * MODAL_MAX_WIDTH_VW),
      maxH: Math.floor(window.innerHeight * MODAL_MAX_HEIGHT_VH)
    };
  }

  function clampModalWidth(width) {
    const limits = modalSizeLimits();
    return Math.min(Math.max(limits.minW, width), limits.maxW);
  }

  function clampModalSize(width, height) {
    const limits = modalSizeLimits();
    return {
      width: clampModalWidth(width),
      height: Math.min(Math.max(limits.minH, height), limits.maxH)
    };
  }

  function isCardCollapsed(card, key) {
    return card.classList.contains('shadow-modal-card--collapsed') || isModalCollapsed(key);
  }

  function enforceCollapsedCardHeight(card) {
    card.style.height = MODAL_COLLAPSED_HEIGHT + 'px';
    card.style.minHeight = MODAL_COLLAPSED_HEIGHT + 'px';
    card.style.maxHeight = 'none';
  }

  function applyModalSize(card, width, height) {
    const size = clampModalSize(width, height);
    card.style.width = size.width + 'px';
    card.style.height = size.height + 'px';
    card.style.maxHeight = 'none';
    return size;
  }

  function clearModalSize(card) {
    card.style.width = '';
    card.style.height = '';
    card.style.maxHeight = '';
  }

  function saveModalState(key, card) {
    const top = parseFloat(card.style.top);
    const left = parseFloat(card.style.left);
    let width = card.style.width ? parseFloat(card.style.width) : undefined;
    let height = card.style.height ? parseFloat(card.style.height) : undefined;
    if (isModalCollapsed(key)) {
      const existing = getModalPosition(key);
      if (existing && typeof existing.height === 'number') height = existing.height;
    }
    saveModalPosition(key, top, left, width, height);
  }

  function clearModalPosition(key) {
    try {
      sessionStorage.removeItem(STORAGE_MODAL_POS + key);
    } catch (e) {
      /* ignore */
    }
  }

  function collapseStorageKey(key) {
    if (key === 'inbox') return STORAGE_INBOX_COLLAPSED;
    if (key === 'detail') return STORAGE_DETAIL_COLLAPSED;
    return 'twa_shadow_' + key + '_collapsed';
  }

  function isModalCollapsed(key) {
    try {
      return sessionStorage.getItem(collapseStorageKey(key)) === '1';
    } catch (e) {
      return false;
    }
  }

  function setModalCollapsed(key, collapsed) {
    try {
      if (collapsed) sessionStorage.setItem(collapseStorageKey(key), '1');
      else sessionStorage.removeItem(collapseStorageKey(key));
    } catch (e) {
      /* ignore */
    }
  }

  function collapseButtonLabel(key, collapsed) {
    if (key === 'inbox') return collapsed ? 'Expand inbox' : 'Collapse inbox';
    if (key.startsWith('activity-')) return collapsed ? 'Expand panel' : 'Collapse panel';
    return collapsed ? 'Expand ticket' : 'Collapse ticket';
  }

  function applyModalCollapseState(key, modal, card, collapsed) {
    const btn = qs('.shadow-modal-collapse', modal);
    if (collapsed) {
      modal.classList.add('shadow-modal--collapsed');
      card.classList.add('shadow-modal-card--collapsed');
      card.style.height = MODAL_COLLAPSED_HEIGHT + 'px';
      card.style.minHeight = MODAL_COLLAPSED_HEIGHT + 'px';
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', collapseButtonLabel(key, true));
        btn.innerHTML = COLLAPSE_CHEVRON_UP;
      }
    } else {
      modal.classList.remove('shadow-modal--collapsed');
      card.classList.remove('shadow-modal-card--collapsed');
      card.style.minHeight = '';
      const saved = getModalPosition(key);
      if (saved && typeof saved.height === 'number' && typeof saved.width === 'number') {
        applyModalSize(card, saved.width, saved.height);
      } else {
        card.style.height = '';
      }
      if (btn) {
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', collapseButtonLabel(key, false));
        btn.innerHTML = COLLAPSE_CHEVRON_DOWN;
      }
    }
  }

  function toggleModalCollapse(key) {
    const id = DRAGGABLE_MODALS[key];
    const modal = qs('#' + id);
    if (!modal) return;
    const card = qs('.shadow-modal-card', modal);
    if (!card) return;
    const willCollapse = !isModalCollapsed(key);
    if (willCollapse) saveModalState(key, card);
    setModalCollapsed(key, willCollapse);
    applyModalCollapseState(key, modal, card, willCollapse);
  }

  function initModalCollapse(key, modal, card, head) {
    const actions = qs('.shadow-modal-head-actions', head);
    const closeBtn = actions ? qs('.shadow-close', actions) : qs('.shadow-close', head);
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'shadow-modal-collapse';
    collapseBtn.setAttribute('data-collapse', key);
    collapseBtn.setAttribute('aria-label', collapseButtonLabel(key, false));
    collapseBtn.setAttribute('aria-expanded', 'true');
    collapseBtn.innerHTML = COLLAPSE_CHEVRON_DOWN;
    const host = actions || head;
    if (closeBtn) host.insertBefore(collapseBtn, closeBtn);
    else host.appendChild(collapseBtn);
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModalCollapse(key);
    });
    if (isModalCollapsed(key)) applyModalCollapseState(key, modal, card, true);
  }

  function clampModalPosition(left, top, card) {
    const margin = 8;
    const w = card.offsetWidth || 320;
    const h = card.offsetHeight || 400;
    const maxLeft = Math.max(margin, window.innerWidth - w - margin);
    const maxTop = Math.max(margin, window.innerHeight - h - margin);
    return {
      left: Math.min(Math.max(margin, left), maxLeft),
      top: Math.min(Math.max(margin, top), maxTop)
    };
  }

  const DEFAULT_MODAL_EDGE_MARGIN = 28;

  function defaultModalPlacement(key, card) {
    card.style.position = 'fixed';
    card.style.margin = '0';
    requestAnimationFrame(() => {
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      let left;
      let top;
      if (key.startsWith('activity-')) {
        const stack = openActivityPopups.size;
        left = window.innerWidth - w - DEFAULT_MODAL_EDGE_MARGIN - stack * ACTIVITY_STACK_OFFSET;
        top = (window.innerHeight - h) * 0.32 - stack * ACTIVITY_STACK_OFFSET;
      } else {
        left = (window.innerWidth - w) / 2;
        top = (window.innerHeight - h) / 2;
      }
      const pos = clampModalPosition(left, top, card);
      card.style.left = pos.left + 'px';
      card.style.top = pos.top + 'px';
    });
  }

  function applyModalPosition(key, card) {
    const saved = getModalPosition(key);
    const modal = card.closest('.shadow-modal');
    const collapsed = isModalCollapsed(key);
    card.style.position = 'fixed';
    card.style.margin = '0';
    if (saved) {
      requestAnimationFrame(() => {
        if (
          !collapsed &&
          typeof saved.width === 'number' &&
          typeof saved.height === 'number'
        ) {
          applyModalSize(card, saved.width, saved.height);
        }
        const pos = clampModalPosition(saved.left, saved.top, card);
        card.style.left = pos.left + 'px';
        card.style.top = pos.top + 'px';
        if (modal) applyModalCollapseState(key, modal, card, collapsed);
      });
      return;
    }
    if (modal && collapsed) applyModalCollapseState(key, modal, card, true);
    if (DEFAULT_MODAL_SIZES[key]) {
      const def = DEFAULT_MODAL_SIZES[key];
      applyModalSize(card, def.width, def.height);
    }
    defaultModalPlacement(key, card);
  }

  function resetModalPosition(key, card) {
    clearModalPosition(key);
    clearModalSize(card);
    if (COLLAPSIBLE_MODALS.includes(key)) {
      const modal = card.closest('.shadow-modal');
      setModalCollapsed(key, false);
      if (modal) applyModalCollapseState(key, modal, card, false);
    }
    defaultModalPlacement(key, card);
    toast(
      key.startsWith('activity-')
        ? 'Modal reset to default position'
        : 'Modal re-centred'
    );
  }

  function isResizeHandle(el) {
    return el && el.classList && el.classList.contains('shadow-modal-resize');
  }

  function applyEdgeResize(card, edge, startLeft, startTop, startW, startH, dx, dy, collapsed) {
    let newW = startW;
    let newH = startH;
    switch (edge) {
      case 'top':
        newH = startH - dy;
        break;
      case 'bottom':
        newH = startH + dy;
        break;
      case 'left':
        newW = startW - dx;
        break;
      case 'right':
        newW = startW + dx;
        break;
      default:
        return;
    }

    let width;
    let height;
    if (collapsed) {
      width = clampModalWidth(newW);
      height = MODAL_COLLAPSED_HEIGHT;
    } else {
      const size = clampModalSize(newW, newH);
      width = size.width;
      height = size.height;
    }

    card.style.width = width + 'px';
    card.style.height = height + 'px';
    card.style.maxHeight = 'none';
    if (collapsed) card.style.minHeight = MODAL_COLLAPSED_HEIGHT + 'px';

    let newLeft = startLeft;
    let newTop = startTop;
    if (!collapsed && edge === 'top') newTop = startTop + startH - height;
    if (edge === 'left') newLeft = startLeft + startW - width;

    const pos = clampModalPosition(newLeft, newTop, card);
    card.style.left = pos.left + 'px';
    card.style.top = pos.top + 'px';
  }

  function applyCornerResize(card, corner, startLeft, startTop, startW, startH, dx, dy, collapsed) {
    if (collapsed) return;

    let newW;
    let newH;
    switch (corner) {
      case 'se':
        newW = startW + dx;
        newH = startH + dy;
        break;
      case 'sw':
        newW = startW - dx;
        newH = startH + dy;
        break;
      case 'ne':
        newW = startW + dx;
        newH = startH - dy;
        break;
      case 'nw':
        newW = startW - dx;
        newH = startH - dy;
        break;
      default:
        return;
    }
    const size = clampModalSize(newW, newH);
    card.style.width = size.width + 'px';
    card.style.height = size.height + 'px';
    card.style.maxHeight = 'none';

    let newLeft = startLeft;
    let newTop = startTop;
    if (corner === 'sw' || corner === 'nw') newLeft = startLeft + startW - size.width;
    if (corner === 'ne' || corner === 'nw') newTop = startTop + startH - size.height;

    const pos = clampModalPosition(newLeft, newTop, card);
    card.style.left = pos.left + 'px';
    card.style.top = pos.top + 'px';
  }

  function bindModalResize(grip, mode, modal, key, card) {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const collapsed = isCardCollapsed(card, key);
      if (collapsed) {
        if (mode.type === 'corner') return;
        if (mode.type === 'edge' && mode.id !== 'left' && mode.id !== 'right') return;
      }
      e.preventDefault();
      e.stopPropagation();
      const rect = card.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      const startW = rect.width;
      const startH = collapsed ? MODAL_COLLAPSED_HEIGHT : rect.height;
      let resized = false;

      card.style.position = 'fixed';
      card.style.margin = '0';
      card.style.left = startLeft + 'px';
      card.style.top = startTop + 'px';
      if (collapsed) enforceCollapsedCardHeight(card);

      grip.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!resized && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          resized = true;
          modal.classList.add('shadow-modal--resizing');
        }
        if (!resized) return;
        if (mode.type === 'corner') {
          applyCornerResize(card, mode.id, startLeft, startTop, startW, startH, dx, dy, collapsed);
        } else {
          applyEdgeResize(card, mode.id, startLeft, startTop, startW, startH, dx, dy, collapsed);
        }
        if (collapsed) enforceCollapsedCardHeight(card);
      };

      const onUp = (ev) => {
        grip.releasePointerCapture(ev.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        modal.classList.remove('shadow-modal--resizing');
        if (resized) {
          if (isModalCollapsed(key)) {
            applyModalCollapseState(key, modal, card, true);
          }
          saveModalState(key, card);
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function addModalResizeHandles(card, modal, key) {
    const edges = [
      { id: 'top', cursor: 'ns-resize' },
      { id: 'bottom', cursor: 'ns-resize' },
      { id: 'left', cursor: 'ew-resize' },
      { id: 'right', cursor: 'ew-resize' }
    ];
    edges.forEach(({ id, cursor }) => {
      const grip = document.createElement('div');
      grip.className = 'shadow-modal-resize shadow-modal-resize--edge shadow-modal-resize--' + id;
      grip.style.cursor = cursor;
      grip.setAttribute('aria-hidden', 'true');
      card.appendChild(grip);
      bindModalResize(grip, { type: 'edge', id }, modal, key, card);
    });

    const corners = [
      { id: 'nw', cursor: 'nwse-resize' },
      { id: 'ne', cursor: 'nesw-resize' },
      { id: 'sw', cursor: 'nesw-resize' },
      { id: 'se', cursor: 'nwse-resize' }
    ];
    corners.forEach(({ id, cursor }) => {
      const grip = document.createElement('div');
      grip.className = 'shadow-modal-resize shadow-modal-resize--corner shadow-modal-resize--' + id;
      grip.style.cursor = cursor;
      grip.setAttribute('aria-hidden', 'true');
      card.appendChild(grip);
      bindModalResize(grip, { type: 'corner', id }, modal, key, card);
    });
  }

  function setupModalScrollArea(card, head, keepOutside) {
    const scroll = document.createElement('div');
    scroll.className = 'shadow-modal-scroll';
    const toMove = [];
    [...card.children].forEach((child) => {
      if (child === head || isResizeHandle(child)) return;
      if (keepOutside && keepOutside.includes(child)) return;
      toMove.push(child);
    });
    if (!toMove.length) return null;
    toMove.forEach((child) => scroll.appendChild(child));
    const anchor = keepOutside && keepOutside.length ? keepOutside[0] : null;
    if (anchor) card.insertBefore(scroll, anchor);
    else card.appendChild(scroll);
    return scroll;
  }

  function setupModalHeadActions(head) {
    if (qs('.shadow-modal-head-actions', head)) return;
    const closeBtn = qs('.shadow-close', head);
    if (!closeBtn) return;
    const actions = document.createElement('div');
    actions.className = 'shadow-modal-head-actions';
    actions.appendChild(closeBtn);
    head.appendChild(actions);
  }

  function setupDraggableModal(modal, key, options) {
    options = options || {};
    if (!modal || modal._draggableReady) return;
    modal._draggableReady = true;
    modal.classList.add('shadow-modal--floating');
    const card = qs('.shadow-modal-card', modal);
    const head = qs('.shadow-modal-head', modal);
    if (!card || !head) return;

    const keepOutside = (options.keepOutside || []).filter(Boolean);
    setupModalScrollArea(card, head, keepOutside);
    setupModalHeadActions(head);

    const dragGrip = document.createElement('button');
    dragGrip.type = 'button';
    dragGrip.className = 'shadow-modal-drag';
    dragGrip.setAttribute('aria-label', 'Drag to move');
    dragGrip.innerHTML = DRAG_GRIP_SVG;
    head.insertBefore(dragGrip, head.firstChild);

    addModalResizeHandles(card, modal, key);

    if (options.collapsible) initModalCollapse(key, modal, card, head);

    head.addEventListener('dblclick', (e) => {
      if (e.target.closest('.shadow-close, .shadow-modal-drag, .shadow-modal-collapse')) return;
      resetModalPosition(key, card);
    });

    dragGrip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = card.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      let dragged = false;

      card.style.position = 'fixed';
      card.style.left = startLeft + 'px';
      card.style.top = startTop + 'px';
      card.style.margin = '0';

      dragGrip.setPointerCapture(e.pointerId);
      document.body.classList.add('shadow-modal-drag-active');

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragged && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          dragged = true;
          modal.classList.add('shadow-modal--dragging');
        }
        if (!dragged) return;
        const pos = clampModalPosition(startLeft + dx, startTop + dy, card);
        card.style.left = pos.left + 'px';
        card.style.top = pos.top + 'px';
      };

      const onUp = (ev) => {
        dragGrip.releasePointerCapture(ev.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        modal.classList.remove('shadow-modal--dragging');
        document.body.classList.remove('shadow-modal-drag-active');
        if (dragged) saveModalState(key, card);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function initDraggableModals() {
    Object.entries(DRAGGABLE_MODALS).forEach(([key, id]) => {
      const modal = qs('#' + id);
      if (!modal) return;
      const keepOutside =
        key === 'detail' ? [qs('#shadow-comment-form', modal)].filter(Boolean) : [];
      setupDraggableModal(modal, key, {
        keepOutside,
        collapsible: COLLAPSIBLE_MODALS.includes(key)
      });
    });
  }

  function highlightElement(el) {
    clearHighlight();
    highlightEl = el;
    highlightEl.classList.add('shadow-highlight');
  }

  function showTicketOnPage(ticket) {
    if (!ticket || !ticket.cssSelector) {
      toast('No element linked to this ticket');
      return false;
    }
    if (!ticketMatchesPage(ticket)) {
      const path = ticketPagePath(ticket);
      window.location.assign(path + '?ticket=' + encodeURIComponent(ticket.id));
      return true;
    }
    let el;
    try {
      el = document.querySelector(ticket.cssSelector);
    } catch (e) {
      el = null;
    }
    if (!el || el.closest('#shadow-review-root, .shadow-toolbar, #shadow-page-badges')) {
      toast('Could not find element on this page');
      return false;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(el);
    return true;
  }

  async function handleTicketDeepLink() {
    const params = new URLSearchParams(location.search);
    const ticketId = params.get('ticket');
    if (!ticketId || !getPerson()) return;
    try {
      await refreshTickets();
      const ticket = ticketsCache.find((t) => t.id === ticketId);
      if (!ticket) {
        toast('Ticket ' + ticketId + ' not found');
        return;
      }
      await openDetail(ticketId);
      showTicketOnPage(ticket);
      const url = new URL(location.href);
      url.searchParams.delete('ticket');
      const clean = url.pathname + (url.search || '') + url.hash;
      history.replaceState(null, '', clean);
    } catch (err) {
      toast(err.message);
    }
  }

  function updatePickToggleLabel(on) {
    const btn = qs('#shadow-review-pick-toggle');
    if (btn) {
      btn.classList.toggle('shadow-btn--active', on);
      btn.textContent = on ? 'Turn off pick mode' : 'Turn on pick mode';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    const fabPick = qs('.shadow-tools-cat-btn[data-category="pick"]');
    if (fabPick) fabPick.classList.toggle('shadow-tools-cat-btn--active', on);
  }

  function requirePersonForReview() {
    if (getPerson()) return true;
    collapseToolsMenu();
    show('person');
    return false;
  }

  function formatNumber(n, decimals) {
    const num = Number(n) || 0;
    if (decimals != null) return num.toFixed(decimals);
    return num >= 1000 ? num.toLocaleString('en-GB') : String(Math.round(num));
  }

  function formatPercent(ratio) {
    return (Number(ratio) * 100).toFixed(1) + '%';
  }

  function formatDuration(seconds) {
    const s = Math.round(Number(seconds) || 0);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + 'm ' + rem + 's';
  }

  function comparisonBar(label, pageVal, siteVal, formatter) {
    const fmt = formatter || formatNumber;
    const pageNum = Number(pageVal) || 0;
    const siteNum = Number(siteVal) || 0;
    const max = Math.max(pageNum, siteNum, 0.0001);
    const pagePct = Math.round((pageNum / max) * 100);
    const sitePct = Math.round((siteNum / max) * 100);
    return (
      '<div class="shadow-insights-compare-row">' +
      '<span class="shadow-insights-compare-label">' +
      escapeHtml(label) +
      '</span>' +
      '<div class="shadow-insights-bars">' +
      '<div class="shadow-insights-bar shadow-insights-bar--page" style="width:' +
      pagePct +
      '%" title="This page: ' +
      escapeHtml(fmt(pageVal)) +
      '"></div>' +
      '<div class="shadow-insights-bar shadow-insights-bar--site" style="width:' +
      sitePct +
      '%" title="Site average: ' +
      escapeHtml(fmt(siteVal)) +
      '"></div>' +
      '</div>' +
      '<span class="shadow-insights-compare-values">' +
      escapeHtml(fmt(pageVal)) +
      ' vs ' +
      escapeHtml(fmt(siteVal)) +
      '</span>' +
      '</div>'
    );
  }

  function renderInsightSectionLabel(title) {
    return '<p class="shadow-insight-section-label">' + escapeHtml(title) + '</p>';
  }

  function renderInsightCard(title, body, modifier) {
    return (
      '<section class="shadow-insight-card' +
      (modifier ? ' shadow-insight-card--' + modifier : '') +
      '">' +
      renderInsightSectionLabel(title) +
      body +
      '</section>'
    );
  }

  function renderInsightsEmptyState(icon, headline, message, ctaLabel) {
    return (
      '<div class="shadow-empty-state">' +
      icon +
      '<p class="shadow-empty-state__headline">' +
      escapeHtml(headline) +
      '</p>' +
      '<p class="shadow-empty-state__message">' +
      escapeHtml(message) +
      '</p>' +
      '<button type="button" class="shadow-btn shadow-btn-secondary shadow-insight-settings-cta" aria-label="' +
      escapeAttr(ctaLabel + ' in Settings') +
      '">' +
      escapeHtml(ctaLabel) +
      '</button></div>'
    );
  }

  function renderInsightsVisibilityCard(data) {
    const gsc = data.gsc;
    if (data.configured.gsc && gsc && !gsc.error) {
      const rankText =
        gsc.pageRank != null
          ? 'Page #' + gsc.pageRank + ' of ' + (gsc.totalPagesWithData || gsc.sitePages.length)
          : 'No ranking data';
      let siteCtr = gsc.page.ctr;
      if (gsc.sitePages && gsc.sitePages.length) {
        let clicks = 0;
        let impressions = 0;
        gsc.sitePages.forEach((p) => {
          clicks += p.clicks || 0;
          impressions += p.impressions || 0;
        });
        siteCtr = impressions ? clicks / impressions : 0;
      }
      return renderInsightCard(
        'Visibility',
        '<p class="shadow-insight-card__meta">Search Console · 28 days</p>' +
          '<div class="shadow-seo-stat-grid shadow-insight-stat-grid">' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatNumber(gsc.page.clicks) +
          '</span><span class="shadow-seo-stat-label">Clicks</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatNumber(gsc.page.impressions) +
          '</span><span class="shadow-seo-stat-label">Impressions</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatPercent(gsc.page.ctr) +
          '</span><span class="shadow-seo-stat-label">CTR</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatNumber(gsc.page.position, 1) +
          '</span><span class="shadow-seo-stat-label">Avg position</span></div>' +
          '</div>' +
          comparisonBar('CTR vs site', gsc.page.ctr, siteCtr, formatPercent) +
          '<p class="shadow-insights-rank">' +
          escapeHtml(rankText) +
          ' by clicks</p>',
        'gsc'
      );
    }
    if (data.configured.gsc) {
      return renderInsightCard(
        'Visibility',
        '<p class="shadow-hint">Could not load Search Console data.</p>',
        'muted'
      );
    }
    return renderInsightCard(
      'Visibility',
      renderInsightsEmptyState(
        EMPTY_ICON_SEARCH,
        'Search Console not connected',
        'Connect your Google account to see search performance for this page.',
        'Connect in Settings'
      ),
      'empty'
    );
  }

  function renderInsightsTrafficCard(data) {
    const ga4 = data.ga4;
    if (data.configured.ga4 && ga4 && !ga4.error) {
      const rankText =
        ga4.pageRank != null
          ? 'Page #' + ga4.pageRank + ' of ' + ga4.pagesWithData
          : 'No ranking data';
      return renderInsightCard(
        'Traffic',
        '<p class="shadow-insight-card__meta">Analytics · 28 days</p>' +
          '<div class="shadow-seo-stat-grid shadow-insight-stat-grid">' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatNumber(ga4.page.sessions) +
          '</span><span class="shadow-seo-stat-label">Sessions</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatNumber(ga4.page.users) +
          '</span><span class="shadow-seo-stat-label">Users</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatPercent(ga4.page.engagementRate) +
          '</span><span class="shadow-seo-stat-label">Engagement rate</span></div>' +
          '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
          formatDuration(ga4.page.avgEngagementTime) +
          '</span><span class="shadow-seo-stat-label">Avg engagement</span></div>' +
          '</div>' +
          comparisonBar('Sessions vs site', ga4.page.sessions, ga4.siteAverage.sessions) +
          '<p class="shadow-insights-rank">' +
          escapeHtml(rankText) +
          ' by sessions</p>',
        'ga4'
      );
    }
    if (data.configured.ga4) {
      return renderInsightCard(
        'Traffic',
        '<p class="shadow-hint">Could not load Analytics data.</p>',
        'muted'
      );
    }
    return renderInsightCard(
      'Traffic',
      renderInsightsEmptyState(
        EMPTY_ICON_TRAFFIC,
        'Analytics not connected',
        'Connect your Google account to see traffic and engagement for this page.',
        'Connect in Settings'
      ),
      'empty'
    );
  }

  function renderInsightsQueriesCard(data) {
    const gsc = data.gsc;
    if (!data.configured.gsc || !gsc || !gsc.queries || !gsc.queries.length) return '';
    let rows = '';
    gsc.queries.forEach((row) => {
      rows +=
        '<tr><td>' +
        escapeHtml(row.query) +
        '</td><td>' +
        formatNumber(row.clicks) +
        '</td><td>' +
        formatNumber(row.impressions) +
        '</td><td>' +
        formatNumber(row.position, 1) +
        '</td></tr>';
    });
    return renderInsightCard(
      'Top queries',
      '<div class="shadow-seo-kw-table-wrap"><table class="shadow-seo-kw-table shadow-insight-queries-table">' +
        '<thead><tr><th>Query</th><th>Clicks</th><th>Impr.</th><th>Pos.</th></tr></thead><tbody>' +
        rows +
        '</tbody></table></div>',
      'queries'
    );
  }

  function renderInsightsDevHints(data) {
    if (!data.hints || !data.hints.length) return '';
    if (!isDeveloper(getPerson())) return '';
    if (data.configured.gsc && data.configured.ga4) return '';
    let html =
      '<details class="shadow-insights-hints shadow-insights-hints--dev"><summary class="shadow-insights-hints-summary">Setup hints (Marko)</summary><ul class="shadow-insights-hints-list">';
    data.hints.forEach((hint) => {
      html += '<li>' + escapeHtml(hint) + '</li>';
    });
    html += '</ul></details>';
    return html;
  }

  function renderInsightsConfiguredBlock(data) {
    let html =
      '<div class="shadow-insight-grid">' +
      renderInsightsVisibilityCard(data) +
      renderInsightsTrafficCard(data) +
      '</div>';
    html += renderInsightsQueriesCard(data);
    html += renderInsightsDevHints(data);
    return html;
  }

  function renderInsightsCard(title, body, tone) {
    return renderInsightCard(title, body, tone);
  }

  function renderInsightsLoading() {
    return (
      '<div class="shadow-insights-loading">' +
      '<p class="shadow-hint">Loading page insights…</p>' +
      '<div class="shadow-seo-link-progress-bar" role="progressbar"><span class="shadow-seo-link-progress-fill shadow-seo-link-progress-fill--indeterminate"></span></div>' +
      '</div>'
    );
  }

  function renderLinkGraphSummary() {
    const graph = window.TWAShadowGraph ? window.TWAShadowGraph.getPageGraph(currentPagePath()) : null;
    let statsHtml = '';
    if (graph && graph.ready) {
      statsHtml = window.TWAShadowGraph.renderGraphStats(graph);
    } else {
      statsHtml =
        '<div class="shadow-metric-chips"><span class="shadow-metric-chip shadow-metric-chip--muted">Loading graph…</span></div>';
    }
    return (
      renderInsightCard(
        'Link graph',
        statsHtml +
          '<div id="shadow-review-graph-mini" class="shadow-graph-mini shadow-graph-mini--hero" aria-hidden="false"></div>' +
          '<button type="button" class="shadow-btn-text shadow-insights-graph-open">Open link graph</button>',
        'graph'
      )
    );
  }

  function mountSummaryGraphMini() {
    const container = qs('#shadow-review-graph-mini');
    if (!container || !window.TWAShadowGraph) return;
    window.TWAShadowGraph.renderMiniPreview(container, currentPagePath());
  }

  function closeMetricDetailPopup() {
    if (!metricDetailModal) return;
    if (metricDetailModal.parentNode) metricDetailModal.parentNode.removeChild(metricDetailModal);
    metricDetailModal = null;
  }

  function bindMetricDetailPopupControls(modal) {
    const closeBtn = qs('.shadow-activity-close', modal);
    if (closeBtn && !closeBtn._bound) {
      closeBtn._bound = true;
      closeBtn.addEventListener('click', () => closeMetricDetailPopup());
    }
    const openLinks = qs('.shadow-insight-metric-detail__open-links', modal);
    if (openLinks && !openLinks._bound) {
      openLinks._bound = true;
      openLinks.addEventListener('click', () => {
        closeMetricDetailPopup();
        openActivityPopup('seo', 'links');
      });
    }
  }

  function openMetricDetailPopup(metric) {
    if (!requirePersonForReview()) return;
    if (!window.TWAShadowSEO || !window.TWAShadowSEO.renderMetricDetailHtml) return;
    const layer = qs('#shadow-activity-layer');
    if (!layer) return;
    const title = window.TWAShadowSEO.getMetricPopupTitle
      ? window.TWAShadowSEO.getMetricPopupTitle(metric)
      : 'SEO detail';
    const bodyHtml = window.TWAShadowSEO.renderMetricDetailHtml(metric);
    if (metricDetailModal) {
      const titleEl = qs('.shadow-activity-title', metricDetailModal);
      const bodyEl = qs('.shadow-activity-body', metricDetailModal);
      const pathEl = qs('.shadow-activity-path-pill', metricDetailModal);
      const card = qs('.shadow-modal-card', metricDetailModal);
      if (titleEl) titleEl.textContent = title;
      if (pathEl) pathEl.textContent = currentPagePath();
      if (card) card.setAttribute('data-metric', metric);
      if (bodyEl) {
        bodyEl.innerHTML = bodyHtml;
        bindMetricDetailPopupControls(metricDetailModal);
      }
      bringActivityToFront(metricDetailModal, METRIC_DETAIL_STORAGE_KEY);
      return;
    }
    const modal = document.createElement('div');
    modal.id = 'shadow-metric-detail-modal';
    modal.className = 'shadow-modal shadow-modal--floating shadow-activity-modal shadow-metric-detail-modal';
    modal.dataset.activityKey = METRIC_DETAIL_STORAGE_KEY;
    modal.innerHTML =
      '<div class="shadow-modal-card shadow-activity-card shadow-modal-review shadow-metric-detail-card" data-metric="' +
      escapeHtml(metric) +
      '">' +
      '<div class="shadow-modal-head">' +
      '<h2 class="shadow-activity-title">' +
      escapeHtml(title) +
      '</h2>' +
      '<code class="shadow-activity-path-pill" title="Current page">' +
      escapeHtml(currentPagePath()) +
      '</code>' +
      '<button type="button" class="shadow-close shadow-activity-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="shadow-activity-body shadow-review-panel">' +
      bodyHtml +
      '</div></div>';
    layer.appendChild(modal);
    modal.hidden = false;
    const card = qs('.shadow-modal-card', modal);
    setupDraggableModal(modal, METRIC_DETAIL_STORAGE_KEY, { collapsible: true });
    applyModalSize(card, ACTIVITY_DEFAULT_SIZE.width, ACTIVITY_DEFAULT_SIZE.height);
    applyModalPosition(METRIC_DETAIL_STORAGE_KEY, card);
    bindMetricDetailPopupControls(modal);
    metricDetailModal = modal;
    bringActivityToFront(modal, METRIC_DETAIL_STORAGE_KEY);
  }

  function bindSummaryInsightsControls(container) {
    const root = container || document;
    const openGraph = root.querySelector('.shadow-insights-graph-open');
    if (openGraph && !openGraph._bound) {
      openGraph._bound = true;
      openGraph.addEventListener('click', () => {
        openActivityPopup('insights', 'linkgraph');
      });
    }
    root.querySelectorAll('.shadow-insight-settings-cta').forEach((btn) => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => openSettingsPopup());
    });
    const openDesign = root.querySelector('.shadow-insight-design-open');
    if (openDesign && !openDesign._bound) {
      openDesign._bound = true;
      openDesign.addEventListener('click', () => openActivityPopup('design', 'summary'));
    }
    root.querySelectorAll('.shadow-insight-metric-btn').forEach((btn) => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        const metric = btn.getAttribute('data-metric');
        if (metric) openMetricDetailPopup(metric);
      });
    });
  }

  function invalidateInsightsCache() {
    insightsCache = null;
    insightsFetchPath = '';
    if (window.TWAShadowSettings && window.TWAShadowSettings.invalidateCache) {
      window.TWAShadowSettings.invalidateCache();
    }
  }

  function openSettingsPopup() {
    if (!getPerson()) {
      show('person');
      return;
    }
    openActivityPopup('settings', 'environment');
  }

  async function loadPageInsights(force) {
    const path = currentPagePath();
    if (!force && insightsCache && insightsFetchPath === path) {
      return insightsCache;
    }
    if (insightsLoading) return insightsCache;
    insightsLoading = true;
    try {
      const res = await fetch('/api/insights?path=' + encodeURIComponent(path), {
        credentials: 'same-origin'
      });
      const data = await res.json();
      insightsCache = data;
      insightsFetchPath = path;
      return data;
    } catch (e) {
      return { ok: false, error: 'Could not reach insights API' };
    } finally {
      insightsLoading = false;
    }
  }

  function togglePickMode() {
    document.body.classList.toggle('shadow-pick-mode');
    const on = document.body.classList.contains('shadow-pick-mode');
    updatePickToggleLabel(on);
    if (!on) clearPickHover();
    toast(on ? 'Click an element to file a ticket' : 'Pick mode off');
  }

  function openToolCategory(category) {
    if (!requirePersonForReview()) return;
    if (category === 'pick') togglePickMode();
    else if (category === 'seo') openActivityPopup('seo', 'overview');
    else if (category === 'design') openActivityPopup('design', 'summary');
    else if (category === 'insights') openActivityPopup('insights', 'summary');
  }

  function closeAllModals() {
    ['person', 'inbox', 'detail', 'new', 'whatsnew'].forEach((key) => hide(key));
    closeAllActivityPopups();
    clearHighlight();
    clearPickHover();
    document.body.classList.remove('shadow-pick-mode');
    updatePickToggleLabel(false);
    collapseToolsMenu();
  }

  function performLogout(message) {
    clearPerson();
    closeAllModals();
    if (message) {
      try {
        sessionStorage.setItem('twa_shadow_logout_msg', message);
      } catch (e) {
        /* ignore */
      }
    }
    window.location.assign('/cdn-cgi/access/logout');
  }

  function logout() {
    const person = getPerson();
    if (!person) {
      show('person');
      return;
    }
    if (
      !window.confirm(
        'Log out of Shadow mode? You will need to sign in again with your email code.'
      )
    ) {
      return;
    }
    performLogout('');
  }

  function switchUser() {
    clearPerson();
    closeAllModals();
    show('person');
    toast('Choose who is reviewing');
  }

  function throttle(fn, wait) {
    let last = 0;
    return function throttled() {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn();
      }
    };
  }

  function bindActivityTracking() {
    const onActivity = throttle(touchActivity, 15000);
    ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach((evt) => {
      document.addEventListener(evt, onActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkIdleLogout();
    });
  }

  function startIdleWatch() {
    setInterval(checkIdleLogout, IDLE_CHECK_MS);
  }

  function updateToolbarUser() {
    const userEl = qs('#shadow-toolbar-user');
    const logoutBtn = qs('#shadow-logout-btn');
    const switchBtn = qs('#shadow-switch-user-btn');
    const person = getPerson();
    if (!userEl || !logoutBtn || !switchBtn) return;
    if (person) {
      userEl.textContent = person.name;
      userEl.hidden = false;
      logoutBtn.hidden = false;
      switchBtn.hidden = false;
    } else {
      userEl.hidden = true;
      logoutBtn.hidden = true;
      switchBtn.hidden = true;
    }
  }

  function showLogoutMessageIfAny() {
    let msg = '';
    try {
      msg = sessionStorage.getItem('twa_shadow_logout_msg') || '';
      sessionStorage.removeItem('twa_shadow_logout_msg');
    } catch (e) {
      /* ignore */
    }
    if (msg) toast(msg);
  }

  function cssPath(el) {
    if (!el || el === document.body) return 'body';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += '#' + CSS.escape(node.id);
        parts.unshift(part);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
        }
      }
      if (node.classList && node.classList.length) {
        part += '.' + [...node.classList].slice(0, 2).map((c) => CSS.escape(c)).join('.');
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ').slice(0, 300);
  }

  function isPlaceholderImage(el) {
    if (!el || el.tagName.toLowerCase() === 'img') return false;
    return /placeholder-img/.test(String(el.className || ''));
  }

  function getImageElement(el) {
    if (!el) return null;
    if (el.tagName.toLowerCase() === 'img') return el;
    return el.querySelector ? el.querySelector('img') : null;
  }

  function currentSrcFor(el) {
    const img = getImageElement(el);
    return img ? img.getAttribute('src') || '' : '';
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'asset';
  }

  function pageSlug(path) {
    let p = String(path || '/')
      .replace(/\/index\.html$/i, '/')
      .replace(/\.html$/i, '');
    if (p === '/' || !p) return 'home';
    return slugify(p.replace(/^\/+|\/+$/g, '').replace(/\//g, '-'));
  }

  function assetKey(el, meta) {
    const img = getImageElement(el);
    if (img && img.id) return slugify(img.id);
    if (el.id) return slugify(el.id);
    const cls = String(el.className || '')
      .split(/\s+/)
      .find((c) => c && !/^placeholder-img/.test(c));
    if (cls) return slugify(cls);
    if (img && img.alt) return slugify(img.alt.slice(0, 40));
    return slugify(meta.selector.slice(-60));
  }

  function fileExtension(file) {
    const name = file.name || '';
    const dot = name.lastIndexOf('.');
    if (dot > -1) return name.slice(dot + 1).toLowerCase();
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    return 'jpg';
  }

  function buildAssetFilename(ticketId, path, el, meta, file) {
    const ext = fileExtension(file);
    const loc = ticketId + '__' + pageSlug(path) + '__' + assetKey(el, meta);
    return loc + '.' + ext;
  }

  function buildLocationId(ticketId, path, el, meta) {
    return ticketId + '__' + pageSlug(path) + '__' + assetKey(el, meta);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        resolve(comma > -1 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function elementMeta(el) {
    const tag = el.tagName.toLowerCase();
    let type = 'section';
    if (tag === 'img' || isPlaceholderImage(el)) type = 'image';
    else if (tag === 'a' || tag === 'button' || el.classList?.contains('btn')) type = 'button';
    else if (
      /^h[1-6]$/.test(tag) ||
      tag === 'p' ||
      tag === 'span' ||
      tag === 'li' ||
      tag === 'label' ||
      tag === 'time' ||
      tag === 'small' ||
      tag === 'strong' ||
      tag === 'em' ||
      tag === 'mark' ||
      tag === 'figcaption'
    ) {
      type = 'text';
    }

    const text = (el.innerText || el.alt || el.getAttribute?.('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const label = text || tag + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    return { type, label, selector: cssPath(el), snippet: text };
  }

  function updateStorycard(el, meta) {
    const card = qs('#shadow-storycard');
    const preview = qs('#shadow-storycard-preview');
    const fileInput = qs('#shadow-new-form input[name="asset"]');
    if (!card) return;
    if (meta.type !== 'image') {
      card.hidden = true;
      if (fileInput) fileInput.value = '';
      if (preview) preview.innerHTML = '';
      return;
    }
    card.hidden = false;
    const src = currentSrcFor(el);
    if (preview) {
      if (src) {
        preview.innerHTML =
          '<img src="' + escapeAttr(src) + '" alt="" class="shadow-storycard-img">';
      } else {
        preview.innerHTML =
          '<span class="shadow-storycard-placeholder">Placeholder — no image yet</span>';
      }
    }
    if (fileInput) fileInput.value = '';
  }

  function getCategorySectionGroups(category) {
    if (category === 'seo' && window.TWAShadowSEO && window.TWAShadowSEO.getSectionGroups) {
      return window.TWAShadowSEO.getSectionGroups();
    }
    if (category === 'design' && window.TWAShadowDesign && window.TWAShadowDesign.getSectionGroups) {
      return window.TWAShadowDesign.getSectionGroups();
    }
    if (category === 'insights') {
      return INSIGHTS_GROUPS.map((group) => ({
        label: group.label,
        sections: group.ids
          .map((id) => INSIGHTS_SECTIONS.find((s) => s.id === id))
          .filter(Boolean)
      }));
    }
    return [];
  }

  function sectionIconHtml(category, sectionId) {
    if (category === 'insights') {
      const match = INSIGHTS_SECTIONS.find((s) => s.id === sectionId);
      if (match && match.icon && SECTION_ICON_SVG[match.icon]) {
        return SECTION_ICON_SVG[match.icon];
      }
    }
    return '';
  }

  function isSectionOpen(category, sectionId) {
    return openActivityPopups.has(activityPopupKey(category, sectionId));
  }

  function buildToolsSectionButton(category, section) {
    const open = isSectionOpen(category, section.id);
    const icon = sectionIconHtml(category, section.id);
    return (
      '<button type="button" class="shadow-tools-section-btn' +
      (open ? ' shadow-tools-section-btn--open' : '') +
      '" data-category="' +
      escapeHtml(category) +
      '" data-section="' +
      escapeHtml(section.id) +
      '"' +
      (open ? ' aria-current="true"' : '') +
      '>' +
      (open ? '<span class="shadow-tools-section-dot" aria-hidden="true"></span>' : '') +
      (icon ? '<span class="shadow-tools-section-icon-wrap">' + icon + '</span>' : '') +
      '<span class="shadow-tools-section-label">' +
      escapeHtml(section.label) +
      '</span></button>'
    );
  }

  function dockShortTitle(category, sectionId) {
    const label = activitySectionLabel(category, sectionId);
    if (category === 'insights') return label;
    const cat = TOOL_CATEGORIES.find((c) => c.id === category);
    return (cat ? cat.label : category) + ' · ' + label;
  }

  function updateActivityDock() {
    const dock = qs('#shadow-activity-dock');
    if (!dock) return;
    const entries = [...openActivityPopups.entries()];
    const showEmpty = toolsMenuExpanded && entries.length === 0;
    const showDock = entries.length > 0 || showEmpty;
    dock.hidden = !showDock;
    dock.classList.toggle('shadow-activity-dock--empty', showEmpty);
    if (!showDock) {
      dock.innerHTML = '';
      dockOverflowOpen = false;
      return;
    }
    if (showEmpty) {
      dock.innerHTML =
        '<p class="shadow-activity-dock-empty">Nothing open yet — pick a lens from the toolbox</p>';
      return;
    }
    const visible = entries.slice(0, DOCK_MAX_PILLS);
    const overflow = entries.slice(DOCK_MAX_PILLS);
    let html = '<div class="shadow-activity-dock-track" role="tablist" aria-label="Open activities">';
    visible.forEach(([key, entry]) => {
      const active = key === activeDockKey;
      html +=
        '<div class="shadow-activity-dock-pill' +
        (active ? ' shadow-activity-dock-pill--active' : '') +
        '" role="presentation">' +
        '<button type="button" class="shadow-activity-dock-focus" data-dock-key="' +
        escapeAttr(key) +
        '" role="tab"' +
        (active ? ' aria-selected="true"' : ' aria-selected="false"') +
        '>' +
        escapeHtml(dockShortTitle(entry.category, entry.sectionId)) +
        '</button>' +
        '<button type="button" class="shadow-activity-dock-close" data-dock-close="' +
        escapeAttr(key) +
        '" aria-label="Close ' +
        escapeAttr(dockShortTitle(entry.category, entry.sectionId)) +
        '">&times;</button></div>';
    });
    if (overflow.length) {
      html +=
        '<div class="shadow-activity-dock-overflow-wrap">' +
        '<button type="button" class="shadow-activity-dock-overflow" aria-expanded="' +
        (dockOverflowOpen ? 'true' : 'false') +
        '" aria-haspopup="true">+' +
        overflow.length +
        ' more</button>' +
        '<div class="shadow-activity-dock-overflow-menu' +
        (dockOverflowOpen ? ' shadow-activity-dock-overflow-menu--open' : '') +
        '">';
      overflow.forEach(([key, entry]) => {
        html +=
          '<button type="button" class="shadow-activity-dock-overflow-item" data-dock-key="' +
          escapeAttr(key) +
          '">' +
          escapeHtml(dockShortTitle(entry.category, entry.sectionId)) +
          '</button>';
      });
      html += '</div></div>';
    }
    html += '</div>';
    dock.innerHTML = html;
    dock.querySelectorAll('[data-dock-key]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = btn.getAttribute('data-dock-key');
        const entry = openActivityPopups.get(k);
        if (entry) bringActivityToFront(entry.modal, k);
        dockOverflowOpen = false;
        updateActivityDock();
      });
    });
    dock.querySelectorAll('[data-dock-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeActivityPopup(btn.getAttribute('data-dock-close'));
      });
    });
    const overflowBtn = qs('.shadow-activity-dock-overflow', dock);
    if (overflowBtn && !overflowBtn._bound) {
      overflowBtn._bound = true;
      overflowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dockOverflowOpen = !dockOverflowOpen;
        updateActivityDock();
      });
    }
  }

  function getCategorySections(category) {
    if (category === 'seo' && window.TWAShadowSEO && window.TWAShadowSEO.getSections) {
      return window.TWAShadowSEO.getSections();
    }
    if (category === 'design' && window.TWAShadowDesign && window.TWAShadowDesign.getSections) {
      return window.TWAShadowDesign.getSections();
    }
    if (category === 'insights') return INSIGHTS_SECTIONS.slice();
    if (category === 'settings') {
      return [{ id: 'environment', label: 'Environment' }];
    }
    if (category === 'pick') {
      return [{ id: 'pick', label: 'Pick element' }];
    }
    return [];
  }

  function activityPopupKey(category, sectionId) {
    return category + '-' + sectionId;
  }

  function activityModalId(key) {
    return 'shadow-activity-' + key.replace(/[^a-z0-9-]/gi, '-');
  }

  function activityStorageKey(key) {
    return 'activity-' + key;
  }

  function activitySectionLabel(category, sectionId) {
    const sections = getCategorySections(category);
    const match = sections.find((s) => s.id === sectionId);
    if (match) return match.label;
    if (category === 'insights' && sectionId === 'summary') return 'Summary';
    if (category === 'pick') return 'Pick element';
    return sectionId;
  }

  function activityPopupTitle(category, sectionId) {
    const label = activitySectionLabel(category, sectionId);
    if (category === 'seo') return 'SEO · ' + label;
    if (category === 'design') return 'Design · ' + label;
    if (category === 'insights') return 'Insights · ' + label;
    if (category === 'settings') return 'Settings';
    if (category === 'pick') return 'Pick element';
    return label;
  }

  function updateInsightsPanel(container, data) {
    if (!container) return;
    if (!data || data.error) {
      container.innerHTML =
        '<p class="shadow-hint">Page insights unavailable. Link graph still works without Google credentials.</p>';
    } else {
      container.innerHTML = renderInsightsConfiguredBlock(data);
    }
    bindSummaryInsightsControls(container.closest('.shadow-review-summary') || container);
  }

  function renderInsightsDesignRow() {
    let designCount = 0;
    if (window.TWAShadowDesign && window.TWAShadowDesign.getAuditSummary) {
      designCount = Number(window.TWAShadowDesign.getAuditSummary().issueCount) || 0;
    }
    const countLabel = designCount === 1 ? '1 issue' : designCount + ' issues';
    return (
      '<div class="shadow-insight-design-row">' +
      renderInsightSectionLabel('Design') +
      '<div class="shadow-insight-design-row__actions">' +
      '<span class="shadow-metric-chip shadow-metric-chip--count">' +
      escapeHtml(countLabel) +
      '</span>' +
      '<button type="button" class="shadow-btn-text shadow-insight-design-open">Open design issues</button>' +
      '</div></div>'
    );
  }

  function renderInsightsSummaryHtml(container) {
    if (!container) return;
    const path = currentPagePath();
    let heroBlock = '<p class="shadow-hint">Open SEO from the toolbox to run an audit.</p>';
    if (window.TWAShadowSEO && window.TWAShadowSEO.renderSummaryHeroHtml) {
      heroBlock = window.TWAShadowSEO.renderSummaryHeroHtml(path);
    } else if (window.TWAShadowSEO && window.TWAShadowSEO.renderSummaryHtml) {
      heroBlock = window.TWAShadowSEO.renderSummaryHtml();
    }
    container.innerHTML =
      '<div class="shadow-review-summary">' +
      heroBlock +
      '<div class="shadow-review-insights shadow-insight-panel">' +
      renderInsightsLoading() +
      '</div>' +
      renderLinkGraphSummary() +
      renderInsightsDesignRow() +
      '</div>';
    const mini = container.querySelector('#shadow-review-graph-mini');
    if (mini && window.TWAShadowGraph) {
      window.TWAShadowGraph.renderMiniPreview(mini, currentPagePath());
    }
    bindSummaryInsightsControls(container);
    loadPageInsights(false).then((data) => {
      const insightsEl = container.querySelector('.shadow-review-insights');
      if (insightsEl) updateInsightsPanel(insightsEl, data);
      const miniGraph = container.querySelector('#shadow-review-graph-mini');
      if (miniGraph && window.TWAShadowGraph) {
        window.TWAShadowGraph.renderMiniPreview(miniGraph, currentPagePath());
      }
    });
  }

  function renderInsightsSectionHtml(sectionId, container) {
    if (!container) return;
    if (sectionId === 'summary') {
      renderInsightsSummaryHtml(container);
      return;
    }
    if (sectionId === 'gsc') {
      container.innerHTML = renderInsightsLoading();
      loadPageInsights(false).then((data) => {
        if (!data || data.error || !data.configured || !data.configured.gsc) {
          container.innerHTML =
            '<p class="shadow-hint">Search Console not configured or unavailable.</p>';
          return;
        }
        const gsc = data.gsc;
        if (!gsc || gsc.error) {
          container.innerHTML = '<p class="shadow-hint">Could not load Search Console data.</p>';
          return;
        }
        container.innerHTML = renderInsightsCard(
          'Search (GSC · 28 days)',
          '<div class="shadow-seo-stat-grid">' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatNumber(gsc.page.clicks) +
            '</span><span class="shadow-seo-stat-label">Clicks</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatNumber(gsc.page.impressions) +
            '</span><span class="shadow-seo-stat-label">Impressions</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatPercent(gsc.page.ctr) +
            '</span><span class="shadow-seo-stat-label">CTR</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatNumber(gsc.page.position, 1) +
            '</span><span class="shadow-seo-stat-label">Avg position</span></div>' +
            '</div>',
          'gsc'
        );
      });
      return;
    }
    if (sectionId === 'ga4') {
      container.innerHTML = renderInsightsLoading();
      loadPageInsights(false).then((data) => {
        if (!data || data.error || !data.configured || !data.configured.ga4) {
          container.innerHTML =
            '<p class="shadow-hint">GA4 not configured or unavailable.</p>';
          return;
        }
        const ga4 = data.ga4;
        if (!ga4 || ga4.error) {
          container.innerHTML = '<p class="shadow-hint">Could not load Analytics data.</p>';
          return;
        }
        container.innerHTML = renderInsightsCard(
          'Traffic (GA4 · 28 days)',
          '<div class="shadow-seo-stat-grid">' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatNumber(ga4.page.sessions) +
            '</span><span class="shadow-seo-stat-label">Sessions</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatNumber(ga4.page.users) +
            '</span><span class="shadow-seo-stat-label">Users</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatPercent(ga4.page.engagementRate) +
            '</span><span class="shadow-seo-stat-label">Engagement rate</span></div>' +
            '<div class="shadow-seo-stat-card"><span class="shadow-seo-stat-value">' +
            formatDuration(ga4.page.avgEngagementTime) +
            '</span><span class="shadow-seo-stat-label">Avg engagement</span></div>' +
            '</div>',
          'ga4'
        );
      });
      return;
    }
    if (sectionId === 'linkgraph') {
      container.innerHTML =
        '<div class="shadow-seo-groups">' +
        '<p class="shadow-seo-subhead">Internal link relationships across sitemap pages.</p>' +
        '<div class="shadow-graph-panel shadow-activity-graph"></div></div>';
      const graphEl = container.querySelector('.shadow-activity-graph');
      if (graphEl && window.TWAShadowGraph) {
        window.TWAShadowGraph.renderGraphPanel(graphEl, currentPagePath());
      }
    }
  }

  function renderPickActivityHtml(container) {
    if (!container) return;
    const on = document.body.classList.contains('shadow-pick-mode');
    container.innerHTML =
      '<div class="shadow-review-pick-copy">' +
      '<h3 class="shadow-review-pick-title">Pick an element</h3>' +
      '<p>Turn on pick mode, then click any element on the page to file a ticket with that location attached.</p>' +
      '<button type="button" id="shadow-review-pick-toggle" class="shadow-btn" aria-pressed="' +
      (on ? 'true' : 'false') +
      '">' +
      (on ? 'Turn off pick mode' : 'Turn on pick mode') +
      '</button>' +
      '<p class="shadow-hint">Or hold ⌘ (Mac) or Alt (Windows) and click any element.</p>' +
      '<p class="shadow-hint">Use <strong>Tickets</strong> in the toolbar to view conversation threads.</p>' +
      '</div>';
    const pickToggle = container.querySelector('#shadow-review-pick-toggle');
    if (pickToggle) {
      pickToggle.addEventListener('click', () => {
        if (!requirePersonForReview()) return;
        togglePickMode();
        renderPickActivityHtml(container);
      });
    }
  }

  function renderActivityContent(category, sectionId, bodyEl, popupKey, modal) {
    if (category === 'seo' && window.TWAShadowSEO && window.TWAShadowSEO.renderActivity) {
      window.TWAShadowSEO.renderActivity(sectionId, bodyEl, popupKey, modal);
      return;
    }
    if (category === 'design' && window.TWAShadowDesign && window.TWAShadowDesign.renderActivity) {
      window.TWAShadowDesign.renderActivity(sectionId, bodyEl, popupKey, modal);
      return;
    }
    if (category === 'insights') {
      renderInsightsSectionHtml(sectionId, bodyEl);
      return;
    }
    if (category === 'settings' && window.TWAShadowSettings && window.TWAShadowSettings.renderActivity) {
      window.TWAShadowSettings.renderActivity(sectionId, bodyEl);
      return;
    }
    if (category === 'pick') {
      renderPickActivityHtml(bodyEl);
    }
  }

  function bringActivityToFront(modal, key) {
    activityPopupCounter += 1;
    modal.style.zIndex = String(99990 + activityPopupCounter);
    activeDockKey = key || modal.dataset.activityKey || null;
    updateActivityDock();
  }

  function bringToFront(popupId) {
    if (!popupId) return;
    let modal = null;
    let key = null;
    if (String(popupId).startsWith('shadow-activity-')) {
      modal = qs('#' + popupId);
      key = modal ? modal.dataset.activityKey : null;
    } else {
      key = popupId;
      const entry = openActivityPopups.get(key);
      if (entry) modal = entry.modal;
    }
    if (modal && key) bringActivityToFront(modal, key);
  }

  function closeActivityPopup(key) {
    const entry = openActivityPopups.get(key);
    if (!entry) return;
    const modal = entry.modal;
    openActivityPopups.delete(key);
    if (entry.category === 'seo' && window.TWAShadowSEO && window.TWAShadowSEO.closeActivity) {
      window.TWAShadowSEO.closeActivity(key);
    }
    if (entry.category === 'design' && window.TWAShadowDesign && window.TWAShadowDesign.closeActivity) {
      window.TWAShadowDesign.closeActivity(key);
    }
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    if (activeDockKey === key) activeDockKey = null;
    updateActivityDock();
  }

  function closeAllActivityPopups() {
    [...openActivityPopups.keys()].forEach((key) => closeActivityPopup(key));
    closeMetricDetailPopup();
    if (window.TWAShadowSEO) window.TWAShadowSEO.shutdown();
    if (window.TWAShadowDesign) window.TWAShadowDesign.shutdown();
  }

  function openActivityPopup(category, sectionId) {
    if (!requirePersonForReview()) return;
    if (category === 'pick') {
      togglePickMode();
      collapseToolsMenu();
      return;
    }
    const key = activityPopupKey(category, sectionId);
    if (openActivityPopups.has(key)) {
      bringActivityToFront(openActivityPopups.get(key).modal, key);
      collapseToolsMenu();
      return;
    }
    const layer = qs('#shadow-activity-layer');
    if (!layer) return;
    const modalId = activityModalId(key);
    const storageKey = activityStorageKey(key);
    const title = activityPopupTitle(category, sectionId);
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'shadow-modal shadow-modal--floating shadow-activity-modal';
    modal.dataset.activityKey = key;
    modal.innerHTML =
      '<div class="shadow-modal-card shadow-activity-card shadow-modal-review" data-category="' +
      escapeHtml(category) +
      '" data-section="' +
      escapeHtml(sectionId) +
      '">' +
      '<div class="shadow-modal-head">' +
      '<h2 class="shadow-activity-title">' +
      escapeHtml(title) +
      '</h2>' +
      '<code class="shadow-activity-path-pill" title="Current page">' +
      escapeHtml(currentPagePath()) +
      '</code>' +
      '<button type="button" class="shadow-close shadow-activity-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="shadow-activity-body shadow-review-panel"></div>' +
      '</div>';
    layer.appendChild(modal);
    modal.hidden = false;
    const card = qs('.shadow-modal-card', modal);
    const bodyEl = qs('.shadow-activity-body', modal);
    const footerSelector =
      category === 'seo'
        ? '.shadow-seo-footer'
        : category === 'design'
          ? '.shadow-design-footer'
          : null;
    setupDraggableModal(modal, storageKey, {
      keepOutside: footerSelector ? [qs(footerSelector, modal)].filter(Boolean) : [],
      collapsible: true
    });
    applyModalSize(card, ACTIVITY_DEFAULT_SIZE.width, ACTIVITY_DEFAULT_SIZE.height);
    applyModalPosition(storageKey, card);
    qs('.shadow-activity-close', modal).addEventListener('click', () => closeActivityPopup(key));
    renderActivityContent(category, sectionId, bodyEl, key, modal);
    openActivityPopups.set(key, { modal, category, sectionId, bodyEl });
    bringActivityToFront(modal, key);
    collapseToolsMenu();
  }

  function openReviewTab(tab) {
    if (tab === 'seo') openActivityPopup('seo', 'overview');
    else if (tab === 'design') openActivityPopup('design', 'summary');
    else if (tab === 'pick') togglePickMode();
    else openActivityPopup('insights', 'summary');
  }

  function buildToolsMenu() {
    const categoriesEl = qs('#shadow-tools-categories');
    if (!categoriesEl) return;
    categoriesEl.innerHTML = TOOL_CATEGORIES.map((cat, index) => {
      const delay = (TOOL_CATEGORIES.length - 1 - index) * 45;
      const icon = CATEGORY_ICON_SVG[cat.icon] || '';
      return (
        '<button type="button" class="shadow-tools-cat-btn" data-category="' +
        escapeHtml(cat.id) +
        '" style="--tools-delay:' +
        delay +
        'ms" aria-label="' +
        escapeHtml(cat.label) +
        '">' +
        icon +
        '<span class="shadow-tools-cat-label">' +
        escapeHtml(cat.label) +
        '</span></button>'
      );
    }).join('');
    categoriesEl.querySelectorAll('.shadow-tools-cat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = btn.getAttribute('data-category');
        if (category === 'pick') {
          if (!requirePersonForReview()) return;
          const wasOn = document.body.classList.contains('shadow-pick-mode');
          togglePickMode();
          collapseToolsMenu();
          if (!wasOn) toast('Pick mode on — click any element');
          return;
        }
        if (activeToolCategory === category) {
          hideToolsSubmenu();
          return;
        }
        showToolsSubmenu(category, btn);
      });
    });
  }

  function clearSubmenuInlinePosition(submenu) {
    submenu.style.left = '';
    submenu.style.top = '';
    submenu.style.right = '';
    submenu.style.bottom = '';
    submenu.style.width = '';
    submenu.style.position = '';
    submenu.style.margin = '';
    submenu.classList.remove('shadow-tools-submenu--floating', 'shadow-tools-submenu--dragging');
  }

  function anchorSubmenuFromLayout(submenu) {
    const rect = submenu.getBoundingClientRect();
    const pos = clampModalPosition(rect.left, rect.top, submenu);
    submenu.classList.add('shadow-tools-submenu--floating');
    submenu.style.position = 'fixed';
    submenu.style.margin = '0';
    submenu.style.right = 'auto';
    submenu.style.bottom = 'auto';
    submenu.style.left = pos.left + 'px';
    submenu.style.top = pos.top + 'px';
  }

  function applySubmenuPosition(submenu) {
    const saved = getModalPosition(SUBMENU_POS_KEY);
    if (saved) {
      submenu.classList.add('shadow-tools-submenu--floating');
      submenu.style.position = 'fixed';
      submenu.style.margin = '0';
      submenu.style.right = 'auto';
      submenu.style.bottom = 'auto';
      requestAnimationFrame(() => {
        const pos = clampModalPosition(saved.left, saved.top, submenu);
        submenu.style.left = pos.left + 'px';
        submenu.style.top = pos.top + 'px';
      });
      return;
    }
    requestAnimationFrame(() => anchorSubmenuFromLayout(submenu));
  }

  function saveSubmenuPosition(submenu) {
    const left = parseFloat(submenu.style.left);
    const top = parseFloat(submenu.style.top);
    if (!Number.isNaN(left) && !Number.isNaN(top)) {
      saveModalPosition(SUBMENU_POS_KEY, top, left);
    }
  }

  function initDraggableSubmenu() {
    const submenu = qs('#shadow-tools-submenu');
    if (!submenu || submenu._dragReady) return;
    submenu._dragReady = true;

    submenu.addEventListener('pointerdown', (e) => {
      if (submenu.hidden) return;
      const head = e.target.closest('.shadow-tools-submenu-head');
      if (!head || !submenu.contains(head)) return;
      if (e.target.closest('.shadow-tools-submenu-back, .shadow-tools-submenu-close')) return;
      if (e.button !== 0) return;
      e.preventDefault();

      if (!submenu.classList.contains('shadow-tools-submenu--floating')) {
        anchorSubmenuFromLayout(submenu);
      }

      const rect = submenu.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      let dragged = false;

      head.setPointerCapture(e.pointerId);
      document.body.classList.add('shadow-modal-drag-active');

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragged && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          dragged = true;
          submenu.classList.add('shadow-tools-submenu--dragging');
        }
        if (!dragged) return;
        const pos = clampModalPosition(startLeft + dx, startTop + dy, submenu);
        submenu.style.left = pos.left + 'px';
        submenu.style.top = pos.top + 'px';
      };

      const onUp = (ev) => {
        head.releasePointerCapture(ev.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        submenu.classList.remove('shadow-tools-submenu--dragging');
        document.body.classList.remove('shadow-modal-drag-active');
        if (dragged) saveSubmenuPosition(submenu);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function showToolsSubmenu(category, anchorBtn) {
    const submenu = qs('#shadow-tools-submenu');
    if (!submenu) return;
    activeToolCategory = category;
    const groups = getCategorySectionGroups(category);
    const groupHtml = groups
      .map((group) => {
        if (!group.sections || !group.sections.length) return '';
        return (
          '<div class="shadow-tools-submenu-group">' +
          '<p class="shadow-tools-submenu-group-label">' +
          escapeHtml(group.label) +
          '</p>' +
          '<div class="shadow-tools-submenu-group-items">' +
          group.sections.map((section) => buildToolsSectionButton(category, section)).join('') +
          '</div></div>'
        );
      })
      .join('');
    submenu.innerHTML =
      '<div class="shadow-tools-submenu-head">' +
      '<button type="button" class="shadow-tools-submenu-back" aria-label="Back">&larr;</button>' +
      '<span class="shadow-tools-submenu-title">' +
      escapeHtml(TOOL_CATEGORIES.find((c) => c.id === category)?.label || category) +
      '</span>' +
      '<button type="button" class="shadow-tools-submenu-close" aria-label="Close menu">&times;</button>' +
      '</div>' +
      '<div class="shadow-tools-submenu-list">' +
      groupHtml +
      '</div>';
    clearSubmenuInlinePosition(submenu);
    submenu.hidden = false;
    applySubmenuPosition(submenu);
    qs('.shadow-tools-submenu-back', submenu).addEventListener('click', (e) => {
      e.stopPropagation();
      hideToolsSubmenu();
    });
    qs('.shadow-tools-submenu-close', submenu).addEventListener('click', (e) => {
      e.stopPropagation();
      collapseToolsMenu();
    });
    submenu.querySelectorAll('.shadow-tools-section-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openActivityPopup(btn.getAttribute('data-category'), btn.getAttribute('data-section'));
      });
    });
    const wrap = qs('#shadow-tools-wrap');
    if (wrap) wrap.classList.add('shadow-tools-submenu-open');
    qs('#shadow-tools-categories')
      ?.querySelectorAll('.shadow-tools-cat-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'shadow-tools-cat-btn--ring',
          btn.getAttribute('data-category') === category
        );
      });
    updateActivityDock();
  }

  function hideToolsSubmenu() {
    const submenu = qs('#shadow-tools-submenu');
    if (submenu) {
      submenu.hidden = true;
      clearSubmenuInlinePosition(submenu);
    }
    activeToolCategory = null;
    const wrap = qs('#shadow-tools-wrap');
    if (wrap) wrap.classList.remove('shadow-tools-submenu-open');
    qs('#shadow-tools-categories')
      ?.querySelectorAll('.shadow-tools-cat-btn')
      .forEach((btn) => {
        btn.classList.remove('shadow-tools-cat-btn--ring');
      });
    updateActivityDock();
  }

  function collapseToolsMenu() {
    toolsMenuExpanded = false;
    hideToolsSubmenu();
    const wrap = qs('#shadow-tools-wrap');
    const fab = qs('#shadow-fab');
    if (wrap) wrap.classList.remove('shadow-tools-exploded');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    dockOverflowOpen = false;
    updateActivityDock();
  }

  function expandToolsMenu() {
    toolsMenuExpanded = true;
    const wrap = qs('#shadow-tools-wrap');
    const fab = qs('#shadow-fab');
    if (wrap) wrap.classList.add('shadow-tools-exploded');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    updateActivityDock();
  }

  function toggleToolsMenu() {
    if (toolsMenuExpanded) collapseToolsMenu();
    else expandToolsMenu();
  }

  function isToolsSubmenuOpen() {
    const submenu = qs('#shadow-tools-submenu');
    return !!(submenu && !submenu.hidden);
  }

  function bindToolsMenuOutsideClick() {
    if (bindToolsMenuOutsideClick._bound) return;
    bindToolsMenuOutsideClick._bound = true;
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!toolsMenuExpanded && !dockOverflowOpen) return;
        if (event.target.closest('#shadow-activity-dock')) return;
        if (isToolsSubmenuOpen()) {
          if (event.target.closest('#shadow-tools-submenu')) return;
          if (event.target.closest('#shadow-fab')) return;
          if (event.target.closest('#shadow-tools-categories')) return;
          collapseToolsMenu();
          return;
        }
        if (event.target.closest('#shadow-tools-wrap')) return;
        collapseToolsMenu();
      },
      true
    );
  }

  function bindToolsMenuEscapeKey() {
    if (bindToolsMenuEscapeKey._bound) return;
    bindToolsMenuEscapeKey._bound = true;
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (isToolsSubmenuOpen()) {
        event.preventDefault();
        hideToolsSubmenu();
        return;
      }
      if (toolsMenuExpanded) {
        event.preventDefault();
        collapseToolsMenu();
      }
    });
  }

  function pulseToolsFabOnce() {
    const fab = qs('#shadow-fab');
    if (!fab || pulseToolsFabOnce._done) return;
    pulseToolsFabOnce._done = true;
    fab.classList.add('shadow-tools-fab--pulse');
    fab.addEventListener(
      'animationend',
      () => fab.classList.remove('shadow-tools-fab--pulse'),
      { once: true }
    );
  }

  function addActivityDock() {
    const dock = document.createElement('div');
    dock.id = 'shadow-activity-dock';
    dock.className = 'shadow-activity-dock';
    dock.hidden = true;
    document.body.appendChild(dock);
  }

  function ensureUI() {
    if (qs('#shadow-review-root')) return;

    const root = document.createElement('div');
    root.id = 'shadow-review-root';
    root.innerHTML = `
      <div id="shadow-tools-wrap" class="shadow-tools-wrap">
        <div class="shadow-tools-stack">
          <div id="shadow-tools-submenu" class="shadow-tools-submenu" hidden></div>
          <div id="shadow-tools-categories" class="shadow-tools-categories" aria-hidden="true"></div>
        </div>
        <button type="button" id="shadow-fab" class="shadow-fab shadow-tools-fab" title="Review tools" aria-label="Open review tools menu" aria-expanded="false" aria-haspopup="true">${TOOLS_FAB_ICON}</button>
      </div>
      <div id="shadow-activity-layer" class="shadow-activity-layer" aria-live="polite"></div>

      <div id="shadow-person-modal" class="shadow-modal" hidden>
        <div class="shadow-modal-card">
          <h2>Who is reviewing?</h2>
          <p>Choose your name so tickets are attributed correctly.</p>
          <div class="shadow-person-list"></div>
        </div>
      </div>

      <div id="shadow-inbox-modal" class="shadow-modal" hidden>
        <div class="shadow-modal-card shadow-modal-wide">
          <div class="shadow-modal-head">
            <h2>Ticket inbox</h2>
            <button type="button" class="shadow-close" data-close="inbox" aria-label="Close">&times;</button>
          </div>
          <p class="shadow-hint">All reviewers see the same tickets. Orange markers on the page show open items for this page.</p>
          <div id="shadow-inbox-tabs" class="shadow-inbox-tabs" role="tablist" aria-label="Open and closed tickets"></div>
          <div id="shadow-ticket-list" class="shadow-ticket-list"></div>
        </div>
      </div>

      <div id="shadow-detail-modal" class="shadow-modal" hidden>
        <div class="shadow-modal-card shadow-modal-wide">
          <div class="shadow-modal-head">
            <h2 id="shadow-detail-title">Ticket</h2>
            <button type="button" class="shadow-close" data-close="detail" aria-label="Close">&times;</button>
          </div>
          <div id="shadow-detail-body"></div>
          <form id="shadow-comment-form" class="shadow-form">
            <label>Add comment
              <textarea name="message" rows="3" required placeholder="Follow-up note"></textarea>
            </label>
            <button type="submit" class="shadow-btn shadow-btn-secondary">Comment</button>
          </form>
        </div>
      </div>

      <div id="shadow-new-modal" class="shadow-modal" hidden>
        <div class="shadow-modal-card">
          <div class="shadow-modal-head">
            <h2>New ticket</h2>
            <button type="button" class="shadow-close" data-close="new" aria-label="Close">&times;</button>
          </div>
          <p id="shadow-new-target" class="shadow-hint"></p>
          <form id="shadow-new-form" class="shadow-form">
            <div id="shadow-storycard" class="shadow-storycard" hidden>
              <h3 class="shadow-storycard-title">Storycard</h3>
              <p class="shadow-hint">Upload a replacement image for this location. Optional.</p>
              <div id="shadow-storycard-preview" class="shadow-storycard-preview"></div>
              <label>Replacement image
                <input type="file" name="asset" accept="image/jpeg,image/png,image/webp,image/gif" />
              </label>
              <p class="shadow-storycard-hint">JPEG, PNG or WebP up to 8 MB</p>
            </div>
            <label>Category
              <select name="category" required></select>
            </label>
            <label>Comment
              <textarea name="summary" rows="4" required placeholder="What needs to change?"></textarea>
            </label>
            <button type="submit" class="shadow-btn">Create ticket</button>
          </form>
        </div>
      </div>

      <div id="shadow-whatsnew-modal" class="shadow-modal" hidden>
        <div class="shadow-modal-card shadow-modal-wide shadow-whatsnew-card">
          <div class="shadow-modal-head">
            <h2>What's new</h2>
            <button type="button" class="shadow-close" data-close="whatsnew" aria-label="Close">&times;</button>
          </div>
          <p class="shadow-hint">Updates to Shadow mode tools. Live site is unchanged until Marko ships approved work.</p>
          <div id="shadow-whatsnew-body" class="shadow-whatsnew-body"></div>
          <div class="shadow-whatsnew-foot">
            <button type="button" id="shadow-whatsnew-dismiss" class="shadow-btn">Got it</button>
          </div>
        </div>
      </div>

      <div id="shadow-pick-tooltip" hidden aria-hidden="true"></div>
      <div id="shadow-toast" class="shadow-toast" hidden></div>
    `;
    document.body.appendChild(root);

    const select = qs('#shadow-new-form select[name="category"]');
    CATEGORIES.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });

    const list = qs('.shadow-person-list');
    PEOPLE.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shadow-btn shadow-btn-secondary';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        setPerson(p.id);
        hide('person');
        afterLogin();
      });
      list.appendChild(btn);
    });

    qs('#shadow-fab').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!getPerson()) {
        show('person');
        return;
      }
      toggleToolsMenu();
    });

    buildToolsMenu();
    bindToolsMenuOutsideClick();
    bindToolsMenuEscapeKey();
    addActivityDock();
    pulseToolsFabOnce();

    root.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => hide(btn.getAttribute('data-close')));
    });

    qs('#shadow-new-form').addEventListener('submit', onCreateTicket);
    qs('#shadow-comment-form').addEventListener('submit', onAddComment);
    qs('#shadow-whatsnew-dismiss').addEventListener('click', onWhatsNewDismiss);
    qs('#shadow-detail-body').addEventListener('click', onDetailActionClick);
    qs('#shadow-ticket-list').addEventListener('click', onInboxListClick);

    initDraggableModals();
    initDraggableSubmenu();

    if (window.TWAShadowSEO) {
      window.TWAShadowSEO.init({
        escapeHtml,
        getPerson,
        showExclusive: show,
        openActivityPopup,
        openReviewTab,
        toast,
        openChangeTicket
      });
    }

    if (window.TWAShadowDesign) {
      window.TWAShadowDesign.init({
        getPerson,
        showExclusive: show,
        openActivityPopup,
        openReviewTab,
        toast,
        openChangeTicket
      });
    }

    if (window.TWAShadowSettings) {
      window.TWAShadowSettings.init({
        escapeHtml,
        toast,
        changelog,
        onInsightsRefresh: invalidateInsightsCache
      });
    }
  }

  function updateVersionBadge() {
    const badge = qs('#shadow-version-badge');
    if (!badge) return;
    const person = getPerson();
    if (person && shouldShowWhatsNew(person)) {
      badge.classList.add('shadow-version-badge--new');
      badge.setAttribute('title', 'New updates available');
    } else {
      badge.classList.remove('shadow-version-badge--new');
      badge.setAttribute('title', 'Shadow mode version');
    }
  }

  async function afterLogin() {
    updateVersionBadge();
    const person = getPerson();
    try {
      await refreshTickets();
    } catch (err) {
      toast('Could not load tickets: ' + err.message);
    }
    if (shouldShowWhatsNew(person)) {
      showWhatsNew(false);
      return;
    }
    const params = new URLSearchParams(location.search);
    if (window.TWAShadowSettings && window.TWAShadowSettings.consumeOAuthSuccess()) {
      openSettingsPopup();
    }
    if (params.get('ticket')) {
      await handleTicketDeepLink();
    }
  }

  function renderWhatsNewContent(person) {
    const body = qs('#shadow-whatsnew-body');
    if (!body) return;
    const dev = isDeveloper(person);
    const releases = releasesForPerson(person, whatsNewManual ? false : true);
    if (!releases.length) {
      body.innerHTML = '<p class="shadow-hint">You are on the latest version (' + escapeHtml(changelog().version) + ').</p>';
      return;
    }
    body.innerHTML = releases
      .map((r) => {
        const userList =
          r.user && r.user.length
            ? '<ul class="shadow-whatsnew-list">' +
              r.user.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
              '</ul>'
            : '';
        const devList =
          dev && r.dev && r.dev.length
            ? '<p class="shadow-whatsnew-dev-label">Developer</p><ul class="shadow-whatsnew-list shadow-whatsnew-list-dev">' +
              r.dev.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
              '</ul>'
            : '';
        return (
          '<article class="shadow-whatsnew-release">' +
          '<header class="shadow-whatsnew-release-head">' +
          '<span class="shadow-whatsnew-version">v' +
          escapeHtml(r.version) +
          '</span>' +
          '<span class="shadow-whatsnew-date">' +
          escapeHtml(r.date) +
          '</span>' +
          '</header>' +
          '<h3 class="shadow-whatsnew-release-title">' +
          escapeHtml(r.title) +
          '</h3>' +
          userList +
          devList +
          '</article>'
        );
      })
      .join('');
  }

  function showWhatsNew(manual) {
    whatsNewManual = !!manual;
    const person = getPerson();
    renderWhatsNewContent(person);
    show('whatsnew');
  }

  function onWhatsNewDismiss() {
    markVersionSeen();
    updateVersionBadge();
    hide('whatsnew');
    whatsNewManual = false;
  }

  const MODAL_MAP = {
    person: 'shadow-person-modal',
    inbox: 'shadow-inbox-modal',
    detail: 'shadow-detail-modal',
    new: 'shadow-new-modal',
    whatsnew: 'shadow-whatsnew-modal'
  };

  function showFloating(which) {
    const el = qs('#' + MODAL_MAP[which]);
    if (!el) return;
    el.hidden = false;
    if (DRAGGABLE_MODALS[which]) {
      const card = qs('.shadow-modal-card', el);
      if (card) applyModalPosition(which, card);
    }
  }

  function hideFloating(which) {
    const el = qs('#' + MODAL_MAP[which]);
    if (!el) return;
    el.hidden = true;
  }

  function show(which) {
    Object.entries(MODAL_MAP).forEach(([key, id]) => {
      const el = qs('#' + id);
      if (!el || el.hidden) return;
      el.hidden = true;
    });
    const el = qs('#' + MODAL_MAP[which]);
    if (el) {
      el.hidden = false;
      if (DRAGGABLE_MODALS[which]) {
        const card = qs('.shadow-modal-card', el);
        if (card) applyModalPosition(which, card);
      }
    }
  }

  function hide(which) {
    const el = qs('#' + MODAL_MAP[which]);
    if (el) el.hidden = true;
    if (which === 'new') {
      seoTicketDraft = null;
      clearHighlight();
      if (window.TWAShadowSEO && window.TWAShadowSEO.onTicketClosed) {
        window.TWAShadowSEO.onTicketClosed();
      }
      if (window.TWAShadowDesign && window.TWAShadowDesign.onTicketClosed) {
        window.TWAShadowDesign.onTicketClosed();
      }
    }
    if (which === 'detail') clearHighlight();
  }

  function toast(msg) {
    const el = qs('#shadow-toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 4000);
  }

  function clearHighlight() {
    if (highlightEl) {
      highlightEl.classList.remove('shadow-highlight');
      highlightEl = null;
    }
    activeEl = null;
  }

  function isPickExcluded(el) {
    return !!(el && el.closest && el.closest(PICK_EXCLUDE_SELECTOR));
  }

  function isBroadPickRoot(el) {
    return el === document.body || el === document.documentElement;
  }

  function isVisiblePickTarget(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function isPickableNode(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isBroadPickRoot(el)) return false;
    if (isPickExcluded(el)) return false;
    return isVisiblePickTarget(el);
  }

  function resolvePickTarget(fromEl) {
    if (!isPickableNode(fromEl)) return null;
    if (fromEl.matches(PICK_TARGET_SELECTOR)) return fromEl;

    let node = fromEl.parentElement;
    while (node && !isBroadPickRoot(node)) {
      if (isPickExcluded(node)) break;
      if (node.matches(PICK_TARGET_SELECTOR) && isVisiblePickTarget(node)) return node;
      node = node.parentElement;
    }

    return fromEl;
  }

  function elementFromPoint(clientX, clientY) {
    const stack = document.elementsFromPoint
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

    for (let i = 0; i < stack.length; i++) {
      const el = stack[i];
      if (!el || el.nodeType !== 1) continue;
      if (isBroadPickRoot(el)) continue;
      if (isPickExcluded(el)) continue;
      const target = resolvePickTarget(el);
      if (target) return target;
    }
    return null;
  }

  function pickTypeLabel(type) {
    if (!type) return 'Element';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function hidePickTooltip() {
    const tip = qs('#shadow-pick-tooltip');
    if (!tip) return;
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
  }

  function updatePickTooltip(el, clientX, clientY) {
    const tip = qs('#shadow-pick-tooltip');
    if (!tip || !el) return;
    const meta = elementMeta(el);
    const raw = (meta.snippet || meta.label || '').trim();
    const snippet = raw.length > 40 ? raw.slice(0, 40) + '…' : raw;
    const typeLabel = pickTypeLabel(meta.type);
    tip.textContent = snippet ? typeLabel + ' · ' + snippet : typeLabel;
    tip.hidden = false;
    tip.setAttribute('aria-hidden', 'false');

    tip.style.left = '0';
    tip.style.top = '0';
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let x = rect.left;
    let y = rect.top - tipH - margin;

    if (y < margin) {
      x = clientX + 12;
      y = clientY + 12;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (x + tipW > vw - margin) x = vw - tipW - margin;
    if (x < margin) x = margin;
    if (y + tipH > vh - margin) y = vh - tipH - margin;
    if (y < margin) y = margin;

    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  }

  function clearPickHover() {
    if (pickHoverEl) {
      pickHoverEl.classList.remove('shadow-pick-hover');
      pickHoverEl = null;
    }
    hidePickTooltip();
  }

  function setPickHover(el, clientX, clientY) {
    if (!el) return;
    if (el !== pickHoverEl) {
      if (pickHoverEl) pickHoverEl.classList.remove('shadow-pick-hover');
      pickHoverEl = el;
      pickHoverEl.classList.add('shadow-pick-hover');
    }
    updatePickTooltip(el, clientX, clientY);
  }

  function onPickPointerMove(event) {
    if (!document.body.classList.contains('shadow-pick-mode')) return;
    const el = elementFromPoint(event.clientX, event.clientY);
    if (!el) {
      clearPickHover();
      return;
    }
    setPickHover(el, event.clientX, event.clientY);
  }

  function openElementTicket(el) {
    if (!el) return;
    clearPickHover();
    clearHighlight();
    activeEl = el;
    highlightEl = activeEl;
    highlightEl.classList.add('shadow-highlight');

    const meta = elementMeta(activeEl);
    qs('#shadow-new-target').textContent = meta.type + ': ' + (meta.label || meta.selector);

    const form = qs('#shadow-new-form');
    if (form) {
      form.reset();
      const category = form.querySelector('select[name="category"]');
      const summary = form.querySelector('textarea[name="summary"]');
      if (category) category.value = meta.type === 'image' ? 'Missing image' : 'Change';
      if (summary) {
        summary.placeholder =
          meta.type === 'image'
            ? 'Image replacement — describe the change or upload below'
            : 'What needs to change?';
      }
    }

    updateStorycard(activeEl, meta);
    document.body.classList.remove('shadow-pick-mode');
    updatePickToggleLabel(false);
    show('new');
  }

  function bindPickHover() {
    if (pickHoverBound) return;
    pickHoverBound = true;
    let rafId = null;
    let pendingEvent = null;

    function flushPickMove() {
      rafId = null;
      if (!pendingEvent) return;
      const ev = pendingEvent;
      pendingEvent = null;
      onPickPointerMove(ev);
    }

    document.addEventListener(
      'mousemove',
      (event) => {
        pendingEvent = event;
        if (!rafId) rafId = requestAnimationFrame(flushPickMove);
      },
      { passive: true }
    );
    document.addEventListener('mouseleave', () => {
      pendingEvent = null;
      if (document.body.classList.contains('shadow-pick-mode')) clearPickHover();
    });
  }

  async function loadTickets() {
    const data = await api('/api/tickets');
    ticketsCache = data.tickets || [];
    return ticketsCache;
  }

  function ticketsByTab(tab) {
    return ticketsCache.filter((t) =>
      tab === 'closed' ? isClosedStatus(t.status) : isOpenStatus(t.status)
    );
  }

  function inboxTabCounts() {
    return {
      open: ticketsByTab('open').length,
      closed: ticketsByTab('closed').length
    };
  }

  function renderInboxTabs() {
    const tabsEl = qs('#shadow-inbox-tabs');
    if (!tabsEl) return;
    const counts = inboxTabCounts();
    tabsEl.innerHTML = '';
    [
      { id: 'open', label: 'Open' },
      { id: 'closed', label: 'Closed' }
    ].forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'shadow-inbox-tab' + (inboxTab === tab.id ? ' shadow-inbox-tab--active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', inboxTab === tab.id ? 'true' : 'false');
      btn.dataset.tab = tab.id;
      btn.innerHTML =
        escapeHtml(tab.label) +
        '<span class="shadow-inbox-tab-count">' +
        counts[tab.id] +
        '</span>';
      btn.addEventListener('click', () => {
        if (inboxTab === tab.id) return;
        inboxTab = tab.id;
        renderInboxList();
      });
      tabsEl.appendChild(btn);
    });
  }

  function createTicketRow(t) {
    const row = document.createElement('div');
    row.className = 'shadow-ticket-row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    const locateBtn = t.cssSelector
      ? '<button type="button" class="shadow-locate-btn" data-ticket-id="' +
        escapeAttr(t.id) +
        '" title="Show on page">Locate</button>'
      : '';
    row.innerHTML =
      '<span class="shadow-ticket-id">' +
      escapeHtml(t.id) +
      '</span><span class="shadow-status-pill shadow-status-pill--' +
      statusPillModifier(t.status) +
      '">' +
      escapeHtml(partnerStatusLabel(t.status)) +
      '</span><span class="shadow-ticket-meta">' +
      escapeHtml(formatDate(t.createdAt)) +
      ' · ' +
      escapeHtml(t.createdBy || 'Unknown') +
      '</span><span class="shadow-ticket-summary">' +
      escapeHtml(t.summary || '') +
      '</span>' +
      locateBtn;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.shadow-locate-btn')) return;
      openDetail(t.id);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.shadow-locate-btn')) return;
        e.preventDefault();
        openDetail(t.id);
      }
    });
    return row;
  }

  function renderInboxSectionHead(group) {
    const head = document.createElement('header');
    head.className =
      'shadow-inbox-section-head' + (group.isCurrent ? ' shadow-inbox-section-head--current' : '');

    const label = document.createElement('span');
    label.className = 'shadow-inbox-section-label';
    label.textContent = group.isCurrent ? 'This page' : pageLabel(group.path);

    const pathEl = document.createElement('span');
    pathEl.className = 'shadow-inbox-section-path';
    pathEl.textContent = group.path;

    const count = document.createElement('span');
    count.className = 'shadow-inbox-section-count';
    count.textContent = ticketCountLabel(group.tickets.length);

    head.appendChild(label);
    head.appendChild(pathEl);
    head.appendChild(count);
    return head;
  }

  function renderInboxList() {
    const list = qs('#shadow-ticket-list');
    if (!list) return;
    renderInboxTabs();
    const visible = ticketsByTab(inboxTab);
    if (!visible.length) {
      list.innerHTML =
        inboxTab === 'closed'
          ? '<p class="shadow-hint">No closed tickets yet.</p>'
          : '<p class="shadow-hint">No open tickets. Click any page element to create one.</p>';
      return;
    }
    list.innerHTML = '';
    groupInboxTickets(visible).forEach((group) => {
      const section = document.createElement('section');
      section.className = 'shadow-inbox-section';
      section.appendChild(renderInboxSectionHead(group));
      const rows = document.createElement('div');
      rows.className = 'shadow-inbox-section-rows';
      group.tickets.forEach((t) => rows.appendChild(createTicketRow(t)));
      section.appendChild(rows);
      list.appendChild(section);
    });
  }

  function onInboxListClick(event) {
    const btn = event.target.closest('.shadow-locate-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const ticket = ticketsCache.find((t) => t.id === btn.dataset.ticketId);
    if (ticket) showTicketOnPage(ticket);
  }

  function ensureBadgeLayer() {
    let layer = qs('#shadow-page-badges');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'shadow-page-badges';
      layer.className = 'shadow-page-badges';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function clearPageBadges() {
    pageBadgeNodes.forEach((node) => node.remove());
    pageBadgeNodes = [];
    const layer = qs('#shadow-page-badges');
    if (layer) layer.innerHTML = '';
  }

  function bindBadgePositioning() {
    if (badgePositionBound) return;
    badgePositionBound = true;
    const reposition = throttle(positionPageBadges, 100);
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
  }

  function positionPageBadges() {
    pageBadgeNodes.forEach((badge) => {
      const target = badge._shadowTarget;
      if (!target || !target.isConnected) {
        badge.hidden = true;
        return;
      }
      const rect = target.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        badge.hidden = true;
        return;
      }
      badge.hidden = false;
      const offset = badge._shadowOffset || 0;
      badge.style.top = Math.max(4, rect.top + 4 + offset) + 'px';
      badge.style.left = Math.max(4, rect.left + 4) + 'px';
    });
  }

  function renderPageBadges() {
    clearPageBadges();
    if (!getPerson()) return;

    const layer = ensureBadgeLayer();
    const pageTickets = ticketsCache.filter(
      (t) => isOpenStatus(t.status) && t.cssSelector && ticketMatchesPage(t)
    );
    if (!pageTickets.length) return;

    const grouped = new Map();
    pageTickets.forEach((ticket) => {
      const key = ticket.cssSelector;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(ticket);
    });

    grouped.forEach((tickets, selector) => {
      let target;
      try {
        target = document.querySelector(selector);
      } catch (e) {
        return;
      }
      if (!target || target.closest('#shadow-review-root, .shadow-toolbar, #shadow-page-badges')) {
        return;
      }

      tickets
        .slice()
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .forEach((ticket, index) => {
          const badge = document.createElement('button');
          badge.type = 'button';
          badge.className = 'shadow-page-badge';
          badge.textContent = ticket.id;
          badge.title =
            partnerStatusLabel(ticket.status) +
            ': ' +
            (ticket.summary || ticket.elementLabel || 'Open ticket');
          badge._shadowTarget = target;
          badge._shadowOffset = index * 26;
          badge.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDetail(ticket.id);
            showTicketOnPage(ticket);
          });
          layer.appendChild(badge);
          pageBadgeNodes.push(badge);
        });
    });

    bindBadgePositioning();
    positionPageBadges();
  }

  async function refreshTickets() {
    if (!getPerson()) return ticketsCache;
    await loadTickets();
    renderPageBadges();
    const inboxOpen = qs('#shadow-inbox-modal') && !qs('#shadow-inbox-modal').hidden;
    if (inboxOpen) renderInboxList();
    return ticketsCache;
  }

  function ticketActionButtons(t, person) {
    if (!person) return '';
    const dev = isDeveloper(person);
    const status = t.status;
    const parts = [];

    if (t.cssSelector) {
      parts.push(
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="show-location">Show on page</button>'
      );
    }

    if (['Open', 'Discussing'].includes(status)) {
      parts.push(
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="accepted">Accept</button>'
      );
    }
    if (status === 'Ready for review') {
      parts.push(
        '<button type="button" class="shadow-btn shadow-action shadow-action--done" data-action="approved">Done</button>'
      );
    }
    if (dev) {
      if (!['On shadow', 'Ready for review', 'Approved', 'Shipped to live', "Won't fix", 'Duplicate'].includes(status)) {
        parts.push(
          '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="on-shadow">Mark on shadow</button>'
        );
      }
      if (['Accepted', 'On shadow', 'In progress'].includes(status)) {
        parts.push(
          '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="ready">Send for review</button>'
        );
      }
      if (status === 'Approved') {
        parts.push(
          '<button type="button" class="shadow-btn shadow-action" data-action="shipped">Ship to live</button>'
        );
      }
      if (!['Shipped to live', "Won't fix", 'Duplicate'].includes(status)) {
        parts.push(
          '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="duplicate">Duplicate</button>'
        );
        parts.push(
          '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="wontfix">Won\'t fix</button>'
        );
      }
    }

    if (!parts.length) return '';
    return '<div class="shadow-ticket-actions">' + parts.join('') + '</div>';
  }

  async function updateTicketStatus(ticketId, action, person) {
    const map = {
      accepted: 'Accepted',
      approved: 'Approved',
      discussing: 'Discussing',
      'on-shadow': 'On shadow',
      ready: 'Ready for review',
      shipped: 'Shipped to live',
      duplicate: 'Duplicate',
      wontfix: "Won't fix"
    };
    const status = map[action];
    if (!status) return;
    await api('/api/tickets/' + encodeURIComponent(ticketId), {
      method: 'PATCH',
      body: JSON.stringify({ status, actor: person.name })
    });
    toast('Status: ' + partnerStatusLabel(status));
  }

  async function onDetailActionClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn || !btn.closest('#shadow-detail-body')) return;
    const action = btn.getAttribute('data-action');
    const person = getPerson();
    const form = qs('#shadow-comment-form');
    const id = form && form.dataset.ticketId;
    if (!person || !id) return;
    event.preventDefault();

    if (action === 'show-location') {
      const ticket = ticketsCache.find((t) => t.id === id);
      if (ticket) showTicketOnPage(ticket);
      return;
    }

    try {
      await updateTicketStatus(id, action, person);
      await refreshTickets();
      const updated = ticketsCache.find((t) => t.id === id);
      if (updated && isClosedStatus(updated.status)) {
        hide('detail');
        toast('Ticket moved to Closed');
        renderInboxList();
      } else {
        openDetail(id);
      }
    } catch (err) {
      toast(err.message);
    }
  }

  async function openInbox() {
    show('inbox');
    const list = qs('#shadow-ticket-list');
    list.innerHTML = '<p class="shadow-hint">Loading…</p>';
    try {
      await refreshTickets();
      renderInboxList();
    } catch (err) {
      list.innerHTML = '<p class="shadow-hint">Could not load tickets: ' + escapeHtml(err.message) + '</p>';
    }
  }

  async function openDetail(id) {
    clearHighlight();
    show('detail');
    const title = qs('#shadow-detail-title');
    const body = qs('#shadow-detail-body');
    const form = qs('#shadow-comment-form');
    form.dataset.ticketId = id;
    title.textContent = id;
    body.innerHTML = '<p class="shadow-hint">Loading…</p>';
    try {
      const data = await api('/api/tickets/' + encodeURIComponent(id));
      const t = data.ticket;
      const comments = data.comments || [];
      const person = getPerson();
      title.textContent = t.id + ' · ' + partnerStatusLabel(t.status);
      form.dataset.ticketStatus = t.status;
      body.innerHTML =
        ticketActionButtons(t, person) +
        '<dl class="shadow-dl">' +
        '<dt>Raised by</dt><dd>' +
        escapeHtml(t.createdBy) +
        '</dd>' +
        '<dt>Date</dt><dd>' +
        escapeHtml(formatDate(t.createdAt)) +
        '</dd>' +
        '<dt>Page</dt><dd><a href="' +
        escapeAttr(t.pagePath || t.pageUrl) +
        '">' +
        escapeHtml(t.pagePath || t.pageUrl) +
        '</a></dd>' +
        '<dt>Element</dt><dd>' +
        escapeHtml(t.elementLabel || t.elementType) +
        '</dd>' +
        '<dt>Category</dt><dd>' +
        escapeHtml(t.category) +
        '</dd>' +
        '<dt>Summary</dt><dd>' +
        escapeHtml(t.summary) +
        '</dd>' +
        (t.shadowFixUrl
          ? '<dt>Uploaded asset</dt><dd><a href="' +
            escapeAttr(t.shadowFixUrl) +
            '" target="_blank" rel="noopener">Open in Drive</a></dd>'
          : '') +
        '</dl>' +
        '<h3 class="shadow-thread-title">Discussion</h3>' +
        '<div class="shadow-thread">' +
        (comments.length
          ? comments
              .map(
                (c) =>
                  '<div class="shadow-comment"><strong>' +
                  escapeHtml(c.author) +
                  '</strong> <time>' +
                  escapeHtml(formatDate(c.createdAt)) +
                  '</time><p>' +
                  escapeHtml(c.message) +
                  '</p></div>'
              )
              .join('')
          : '<p class="shadow-hint">No comments yet.</p>') +
        '</div>';
    } catch (err) {
      body.innerHTML = '<p class="shadow-hint">' + escapeHtml(err.message) + '</p>';
    }
  }

  function seoChangeTitle(fieldName, fieldValue) {
    const empty =
      fieldValue == null ||
      !String(fieldValue).trim() ||
      fieldValue === 'Missing' ||
      fieldValue === 'Not set';
    const lower = String(fieldName || 'SEO field').toLowerCase();
    if (empty) {
      if (lower.includes('alt')) return 'Fix missing alt on image';
      if (lower.includes('description')) return 'Add ' + lower;
      if (lower.includes('canonical')) return 'Set canonical URL';
      return 'Add ' + lower;
    }
    return 'Update ' + lower;
  }

  function seoChangeSummaryBody(fieldName, fieldValue, pagePath, pageUrl) {
    const displayValue =
      fieldValue == null || !String(fieldValue).trim() ? '(not set)' : String(fieldValue);
    return (
      'Field: ' +
      fieldName +
      '\nCurrent value: ' +
      displayValue +
      '\n\nPage: ' +
      pagePath +
      '\nURL: ' +
      pageUrl +
      '\n\nDescribe the change needed:'
    );
  }

  function openChangeTicket(opts) {
    opts = opts || {};
    const person = getPerson();
    if (!person) {
      show('person');
      return;
    }

    clearPickHover();
    document.body.classList.remove('shadow-pick-mode');
    updatePickToggleLabel(false);
    if (highlightEl) {
      highlightEl.classList.remove('shadow-highlight');
      highlightEl = null;
    }

    const fieldName = opts.fieldName || 'SEO field';
    const fieldValue = opts.fieldValue != null ? String(opts.fieldValue) : '';
    activeEl = opts.element || null;

    let meta;
    if (activeEl) {
      meta = elementMeta(activeEl);
      meta = {
        type: meta.type,
        label: fieldName + ' · ' + (meta.label || meta.selector),
        selector: meta.selector,
        snippet: fieldValue.trim() || meta.snippet
      };
    } else {
      meta = {
        type: 'text',
        label: fieldName + ' (SEO)',
        selector: '',
        snippet: fieldValue.trim().slice(0, 120)
      };
    }
    seoTicketDraft = { meta };

    const form = qs('#shadow-new-form');
    if (form) {
      form.reset();
      const category = form.querySelector('select[name="category"]');
      if (category) category.value = 'Change';
      const summary = form.querySelector('textarea[name="summary"]');
      if (summary) {
        summary.value =
          seoChangeTitle(fieldName, fieldValue) +
          '\n\n' +
          seoChangeSummaryBody(fieldName, fieldValue, location.pathname, location.href);
      }
    }

    const target = qs('#shadow-new-target');
    if (target) target.textContent = 'SEO: ' + fieldName;
    updateStorycard(activeEl, meta);
    show('new');
  }

  async function onCreateTicket(event) {
    event.preventDefault();
    const person = getPerson();
    if (!person) return;
    const form = event.target;
    let meta;
    if (seoTicketDraft && seoTicketDraft.meta) {
      meta = seoTicketDraft.meta;
    } else if (activeEl) {
      meta = elementMeta(activeEl);
    } else {
      return;
    }
    const fileInput = form.querySelector('input[name="asset"]');
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    if (file) {
      if (!ASSET_MIME.includes(file.type)) {
        toast('Use JPEG, PNG, WebP or GIF');
        return;
      }
      if (file.size > MAX_ASSET_BYTES) {
        toast('Image must be 8 MB or smaller');
        return;
      }
    }

    const payload = {
      createdBy: person.name,
      pageUrl: location.href,
      pagePath: location.pathname,
      elementType: meta.type,
      elementLabel: meta.label,
      cssSelector: meta.selector,
      textSnippet: meta.snippet,
      category: form.category.value,
      summary: form.summary.value.trim(),
      status: 'Open'
    };
    try {
      const data = await api('/api/tickets', { method: 'POST', body: JSON.stringify(payload) });
      const ticket = data.ticket;
      let toastMsg = 'Ticket ' + ticket.id + ' created';

      if (file) {
        const filename = buildAssetFilename(ticket.id, location.pathname, activeEl, meta, file);
        const dataBase64 = await fileToBase64(file);
        const upload = await api('/api/assets', {
          method: 'POST',
          body: JSON.stringify({
            ticketId: ticket.id,
            uploadedBy: person.name,
            pagePath: location.pathname,
            pageUrl: location.href,
            cssSelector: meta.selector,
            currentSrc: currentSrcFor(activeEl),
            elementLabel: meta.label,
            locationId: buildLocationId(ticket.id, location.pathname, activeEl, meta),
            filename,
            mimeType: file.type,
            dataBase64
          })
        });
        toastMsg += upload.ok ? ' · image uploaded' : ' · image upload failed';
      }

      hide('new');
      seoTicketDraft = null;
      clearHighlight();
      toast(toastMsg);
      form.reset();
      updateStorycard(null, { type: 'section' });
      await refreshTickets();
    } catch (err) {
      toast(err.message);
    }
  }

  async function onAddComment(event) {
    event.preventDefault();
    const person = getPerson();
    const form = event.target;
    const id = form.dataset.ticketId;
    if (!person || !id) return;
    try {
      if (form.dataset.ticketStatus === 'Open') {
        await updateTicketStatus(id, 'discussing', person);
      }
      await api('/api/tickets/' + encodeURIComponent(id) + '/comments', {
        method: 'POST',
        body: JSON.stringify({ author: person.name, message: form.message.value.trim() })
      });
      form.reset();
      toast('Comment added');
      await refreshTickets();
      openDetail(id);
    } catch (err) {
      toast(err.message);
    }
  }

  function isPickModifier(event) {
    return event.altKey || event.metaKey;
  }

  function onPageClick(event) {
    if (event.defaultPrevented) return;
    if (event.target.closest('#shadow-review-root')) return;
    if (event.target.closest('.shadow-toolbar')) return;
    if (event.target.closest('.shadow-page-badge, #shadow-page-badges')) return;

    const pickMod = isPickModifier(event);
    const interactive = event.target.closest('a, button, input, textarea, select, label');
    if (interactive && !pickMod && !document.body.classList.contains('shadow-pick-mode')) return;

    if (!pickMod && !document.body.classList.contains('shadow-pick-mode')) return;

    event.preventDefault();
    event.stopPropagation();

    if (!getPerson()) {
      show('person');
      return;
    }

    const picked = elementFromPoint(event.clientX, event.clientY);
    if (!picked) return;
    openElementTicket(picked);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function addToolbar() {
    const bar = document.createElement('div');
    bar.className = 'shadow-toolbar';
    bar.innerHTML =
      '<span class="shadow-toolbar-label">Shadow mode</span>' +
      '<span class="shadow-toolbar-version" id="shadow-version-badge" title="Shadow mode version">v' +
      escapeHtml(changelog().version) +
      '</span>' +
      '<button type="button" id="shadow-whatsnew-btn" class="shadow-btn shadow-btn-small shadow-btn-secondary">What\'s new</button>' +
      '<button type="button" id="shadow-tickets-btn" class="shadow-btn shadow-btn-small">Tickets</button>' +
      '<a href="' +
      AUDIT_SHEET_URL +
      '" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-toolbar-link" target="_blank" rel="noopener">Open audit sheet</a>' +
      '<a href="' +
      ASSETS_FOLDER_URL +
      '" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-toolbar-link" target="_blank" rel="noopener">Open asset folder</a>' +
      '<span class="shadow-toolbar-hint">Review button · Tickets in toolbar</span>' +
      '<span class="shadow-toolbar-spacer"></span>' +
      '<button type="button" id="shadow-settings-btn" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-toolbar-settings" title="Environment settings" aria-label="Settings">' +
      '<svg class="shadow-toolbar-settings-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M12.9 9.1l.9.7a.6.6 0 0 1 .1.8l-.8 1.4a.6.6 0 0 1-.7.3l-1-.2a3.4 3.4 0 0 1-.8.5l-.2 1a.6.6 0 0 1-.6.5H7.3a.6.6 0 0 1-.6-.5l-.2-1a3.4 3.4 0 0 1-.8-.5l-1 .2a.6.6 0 0 1-.7-.3l-.8-1.4a.6.6 0 0 1 .1-.8l.9-.7a3.3 3.3 0 0 1 0-1l-.9-.7a.6.6 0 0 1-.1-.8l.8-1.4a.6.6 0 0 1 .7-.3l1 .2c.25-.2.52-.38.8-.5l.2-1a.6.6 0 0 1 .6-.5h1.6a.6.6 0 0 1 .6.5l.2 1c.28.12.55.3.8.5l1-.2a.6.6 0 0 1 .7.3l.8 1.4a.6.6 0 0 1-.1.8l-.9.7c.04.33.04.67 0 1z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>' +
      '<span class="shadow-toolbar-settings-label">Settings</span></button>' +
      '<span class="shadow-toolbar-user" id="shadow-toolbar-user" hidden></span>' +
      '<button type="button" id="shadow-switch-user-btn" class="shadow-btn shadow-btn-small shadow-btn-secondary" hidden>Switch user</button>' +
      '<button type="button" id="shadow-logout-btn" class="shadow-btn shadow-btn-small shadow-btn-secondary" hidden>Log out</button>';
    document.body.appendChild(bar);
    qs('#shadow-whatsnew-btn').addEventListener('click', () => {
      if (!getPerson()) {
        show('person');
        return;
      }
      showWhatsNew(true);
    });
    qs('#shadow-tickets-btn').addEventListener('click', () => {
      if (!getPerson()) {
        show('person');
        return;
      }
      openInbox();
    });
    qs('#shadow-settings-btn').addEventListener('click', openSettingsPopup);
    qs('#shadow-logout-btn').addEventListener('click', logout);
    qs('#shadow-switch-user-btn').addEventListener('click', switchUser);
  }

  function init() {
    migrateVersionSeen();
    ensureUI();
    addToolbar();
    bindActivityTracking();
    startIdleWatch();
    updateVersionBadge();
    updateToolbarUser();
    showLogoutMessageIfAny();
    document.addEventListener('click', onPageClick, true);
    bindPickHover();

    if (getPerson()) {
      if (isIdleExpired()) {
        performLogout('Logged out after 1 hour of inactivity.');
        return;
      }
      touchActivity();
      afterLogin();
      return;
    }
    show('person');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
