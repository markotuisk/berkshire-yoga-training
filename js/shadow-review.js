/**
 * Meridian shadow review overlay — shadow branch only.
 * Click any element to file a ticket; open ticket inbox on load.
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
  };

  const ACTIVE_STATUSES = [
    'Open',
    'Discussing',
    'Accepted',
    'On shadow',
    'In progress',
    'Ready for review',
    'Blocked'
  ];

  const ARCHIVE_STATUSES = ['Approved', 'Shipped to live', "Won't fix", 'Duplicate'];

  const STORAGE_PERSON = 'twa_shadow_person';
  const STORAGE_VERSION_SEEN = 'twa_shadow_version_seen';
  const STORAGE_LAST_ACTIVE = 'twa_shadow_last_active';
  const STORAGE_MODAL_POS = 'twa_shadow_modal_pos_';
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

  let ticketsCache = [];
  let activeEl = null;
  let highlightEl = null;
  let whatsNewManual = false;
  let inboxTab = 'active';
  let pageBadgeNodes = [];
  let badgePositionBound = false;

  function changelog() {
    return window.TWAShadowChangelog || { version: '0.0.0', releases: [] };
  }

  function isDeveloper(person) {
    return person && person.id === 'marko';
  }

  function isActiveStatus(status) {
    return ACTIVE_STATUSES.includes(status);
  }

  function isArchiveStatus(status) {
    return ARCHIVE_STATUSES.includes(status);
  }

  function currentPagePath() {
    return location.pathname || '/';
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

  function ticketMatchesPage(ticket) {
    const path = currentPagePath();
    if (ticket.pagePath) return ticket.pagePath === path;
    if (ticket.pageUrl) {
      try {
        return new URL(ticket.pageUrl).pathname === path;
      } catch (e) {
        return false;
      }
    }
    return false;
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

  function saveModalPosition(key, top, left) {
    try {
      sessionStorage.setItem(STORAGE_MODAL_POS + key, JSON.stringify({ top, left }));
    } catch (e) {
      /* ignore */
    }
  }

  function clearModalPosition(key) {
    try {
      sessionStorage.removeItem(STORAGE_MODAL_POS + key);
    } catch (e) {
      /* ignore */
    }
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

  function centerModalCard(card) {
    card.style.position = 'fixed';
    card.style.margin = '0';
    requestAnimationFrame(() => {
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const pos = clampModalPosition((window.innerWidth - w) / 2, (window.innerHeight - h) / 2, card);
      card.style.left = pos.left + 'px';
      card.style.top = pos.top + 'px';
    });
  }

  function applyModalPosition(key, card) {
    const saved = getModalPosition(key);
    card.style.position = 'fixed';
    card.style.margin = '0';
    if (saved) {
      requestAnimationFrame(() => {
        const pos = clampModalPosition(saved.left, saved.top, card);
        card.style.left = pos.left + 'px';
        card.style.top = pos.top + 'px';
      });
      return;
    }
    centerModalCard(card);
  }

  function resetModalPosition(key, card) {
    clearModalPosition(key);
    centerModalCard(card);
    toast('Modal re-centred');
  }

  function initDraggableModals() {
    Object.entries(DRAGGABLE_MODALS).forEach(([key, id]) => {
      const modal = qs('#' + id);
      if (!modal) return;
      modal.classList.add('shadow-modal--floating');
      const card = qs('.shadow-modal-card', modal);
      const head = qs('.shadow-modal-head', modal);
      if (!card || !head) return;

      head.addEventListener('dblclick', (e) => {
        if (e.target.closest('.shadow-close')) return;
        resetModalPosition(key, card);
      });

      head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.shadow-close')) return;
        if (e.button !== 0) return;
        e.preventDefault();
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

        const onUp = () => {
          head.removeEventListener('pointermove', onMove);
          head.removeEventListener('pointerup', onUp);
          head.removeEventListener('pointercancel', onUp);
          modal.classList.remove('shadow-modal--dragging');
          if (dragged) {
            saveModalPosition(key, parseFloat(card.style.left), parseFloat(card.style.top));
          }
        };

        head.addEventListener('pointermove', onMove);
        head.addEventListener('pointerup', onUp);
        head.addEventListener('pointercancel', onUp);
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

  function closeAllModals() {
    ['person', 'inbox', 'detail', 'new', 'whatsnew'].forEach((key) => hide(key));
    clearHighlight();
    document.body.classList.remove('shadow-pick-mode');
    const toggle = qs('#shadow-pick-toggle');
    if (toggle) toggle.textContent = 'Pick element';
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
        'Log out of shadow review? You will need to sign in again with your email code.'
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
    if (tag === 'img' || isPlaceholderImage(el) || el.querySelector?.('img')) type = 'image';
    else if (tag === 'a' || tag === 'button' || el.classList?.contains('btn')) type = 'button';
    else if (/^h[1-6]$/.test(tag) || tag === 'p' || tag === 'span' || tag === 'li') type = 'text';
    else if (tag === 'a') type = 'link';

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

  function ensureUI() {
    if (qs('#shadow-review-root')) return;

    const root = document.createElement('div');
    root.id = 'shadow-review-root';
    root.innerHTML = `
      <button type="button" id="shadow-fab" class="shadow-fab" title="Review tickets">Tickets</button>

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
          <div id="shadow-inbox-tabs" class="shadow-inbox-tabs" role="tablist" aria-label="Ticket views"></div>
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
            <button type="submit" class="shadow-btn">Post comment</button>
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
          <p class="shadow-hint">Updates to shadow review tools. Live site is unchanged until Marko ships approved work.</p>
          <div id="shadow-whatsnew-body" class="shadow-whatsnew-body"></div>
          <div class="shadow-whatsnew-foot">
            <button type="button" id="shadow-whatsnew-dismiss" class="shadow-btn">Got it</button>
          </div>
        </div>
      </div>

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

    qs('#shadow-fab').addEventListener('click', () => {
      if (!getPerson()) show('person');
      else openInbox();
    });

    root.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => hide(btn.getAttribute('data-close')));
    });

    qs('#shadow-new-form').addEventListener('submit', onCreateTicket);
    qs('#shadow-comment-form').addEventListener('submit', onAddComment);
    qs('#shadow-whatsnew-dismiss').addEventListener('click', onWhatsNewDismiss);
    qs('#shadow-detail-body').addEventListener('click', onDetailActionClick);
    qs('#shadow-ticket-list').addEventListener('click', onInboxListClick);
    initDraggableModals();
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
      badge.setAttribute('title', 'Shadow review version');
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
    if (params.get('ticket')) {
      await handleTicketDeepLink();
      return;
    }
    openInbox();
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
    if (!whatsNewManual) openInbox();
    whatsNewManual = false;
  }

  function show(which) {
    const map = {
      person: 'shadow-person-modal',
      inbox: 'shadow-inbox-modal',
      detail: 'shadow-detail-modal',
      new: 'shadow-new-modal',
      whatsnew: 'shadow-whatsnew-modal'
    };
    Object.values(map).forEach((id) => {
      const el = qs('#' + id);
      if (el) el.hidden = true;
    });
    const el = qs('#' + map[which]);
    if (el) {
      el.hidden = false;
      if (DRAGGABLE_MODALS[which]) {
        const card = qs('.shadow-modal-card', el);
        if (card) applyModalPosition(which, card);
      }
    }
  }

  function hide(which) {
    const map = {
      person: 'shadow-person-modal',
      inbox: 'shadow-inbox-modal',
      detail: 'shadow-detail-modal',
      new: 'shadow-new-modal',
      whatsnew: 'shadow-whatsnew-modal'
    };
    const el = qs('#' + map[which]);
    if (el) el.hidden = true;
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

  async function loadTickets() {
    const data = await api('/api/tickets');
    ticketsCache = data.tickets || [];
    return ticketsCache;
  }

  function ticketsByTab(tab) {
    return ticketsCache.filter((t) =>
      tab === 'archive' ? isArchiveStatus(t.status) : isActiveStatus(t.status)
    );
  }

  function inboxTabCounts() {
    return {
      active: ticketsByTab('active').length,
      archive: ticketsByTab('archive').length
    };
  }

  function renderInboxTabs() {
    const tabsEl = qs('#shadow-inbox-tabs');
    if (!tabsEl) return;
    const counts = inboxTabCounts();
    tabsEl.innerHTML = '';
    [
      { id: 'active', label: 'Active' },
      { id: 'archive', label: 'Archive' }
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

  function renderInboxList() {
    const list = qs('#shadow-ticket-list');
    if (!list) return;
    renderInboxTabs();
    const visible = ticketsByTab(inboxTab)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!visible.length) {
      list.innerHTML =
        inboxTab === 'archive'
          ? '<p class="shadow-hint">No archived tickets yet.</p>'
          : '<p class="shadow-hint">No active tickets. Click any page element to create one.</p>';
      return;
    }
    list.innerHTML = '';
    visible.forEach((t) => {
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
        '</span><span class="shadow-ticket-meta">' +
        escapeHtml(formatDate(t.createdAt)) +
        ' · ' +
        escapeHtml(t.createdBy || 'Unknown') +
        ' · ' +
        escapeHtml(STATUS_LABELS[t.status] || t.status) +
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
      list.appendChild(row);
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
      (t) => isActiveStatus(t.status) && t.cssSelector && ticketMatchesPage(t)
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
            (STATUS_LABELS[ticket.status] || ticket.status) +
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

    if (['Open', 'Discussing', 'In progress'].includes(status)) {
      parts.push(
        '<button type="button" class="shadow-btn shadow-action" data-action="accepted">Accept</button>'
      );
    }
    if (status === 'Ready for review') {
      parts.push(
        '<button type="button" class="shadow-btn shadow-action" data-action="approved">Approve</button>'
      );
      parts.push(
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-action" data-action="discussing">Request changes</button>'
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
    toast('Status: ' + (STATUS_LABELS[status] || status));
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
      openDetail(id);
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
      title.textContent = t.id + ' · ' + (STATUS_LABELS[t.status] || t.status);
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

  async function onCreateTicket(event) {
    event.preventDefault();
    const person = getPerson();
    if (!person || !activeEl) return;
    const form = event.target;
    const meta = elementMeta(activeEl);
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

    clearHighlight();
    activeEl =
      event.target.closest(
        'img, [class*="placeholder-img"], a, button, h1, h2, h3, h4, p, li, section, article, .btn, [class*="card"], [class*="section"]'
      ) || event.target;
    if (activeEl === document.body || activeEl === document.documentElement) return;
    highlightEl = activeEl;
    highlightEl.classList.add('shadow-highlight');

    const meta = elementMeta(activeEl);
    qs('#shadow-new-target').textContent = meta.type + ': ' + (meta.label || meta.selector);
    updateStorycard(activeEl, meta);
    document.body.classList.remove('shadow-pick-mode');
    const toggle = qs('#shadow-pick-toggle');
    if (toggle) toggle.textContent = 'Pick element';
    show('new');
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
      '<span class="shadow-toolbar-label">Shadow review</span>' +
      '<span class="shadow-toolbar-version" id="shadow-version-badge" title="Shadow review version">v' +
      escapeHtml(changelog().version) +
      '</span>' +
      '<button type="button" id="shadow-whatsnew-btn" class="shadow-btn shadow-btn-small shadow-btn-secondary">What\'s new</button>' +
      '<button type="button" id="shadow-pick-toggle" class="shadow-btn shadow-btn-small">Pick element</button>' +
      '<a href="' +
      AUDIT_SHEET_URL +
      '" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-toolbar-link" target="_blank" rel="noopener">Open audit sheet</a>' +
      '<a href="' +
      ASSETS_FOLDER_URL +
      '" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-toolbar-link" target="_blank" rel="noopener">Open asset folder</a>' +
      '<span class="shadow-toolbar-hint">Or ⌘/Alt+click any element</span>' +
      '<span class="shadow-toolbar-spacer"></span>' +
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
    qs('#shadow-pick-toggle').addEventListener('click', () => {
      document.body.classList.toggle('shadow-pick-mode');
      const on = document.body.classList.contains('shadow-pick-mode');
      qs('#shadow-pick-toggle').textContent = on ? 'Cancel pick' : 'Pick element';
      toast(on ? 'Click an element to file a ticket' : 'Pick mode off');
    });
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
