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
    'In progress': 'In progress',
    'Ready for review': 'Ready for review',
    Approved: 'Approved',
    'Shipped to live': 'Shipped to live',
    "Won't fix": "Won't fix",
    Duplicate: 'Duplicate',
    Blocked: 'Blocked'
  };

  const STORAGE_PERSON = 'twa_shadow_person';

  let ticketsCache = [];
  let activeEl = null;
  let highlightEl = null;

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

  function elementMeta(el) {
    const tag = el.tagName.toLowerCase();
    let type = 'section';
    if (tag === 'img' || el.querySelector?.('img')) type = 'image';
    else if (tag === 'a' || tag === 'button' || el.classList?.contains('btn')) type = 'button';
    else if (/^h[1-6]$/.test(tag) || tag === 'p' || tag === 'span' || tag === 'li') type = 'text';
    else if (tag === 'a') type = 'link';

    const text = (el.innerText || el.alt || el.getAttribute?.('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const label = text || tag + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    return { type, label, selector: cssPath(el), snippet: text };
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
            <h2>Your tickets</h2>
            <button type="button" class="shadow-close" data-close="inbox" aria-label="Close">&times;</button>
          </div>
          <p class="shadow-hint">Shadow site only. Live site is unchanged. Meridian tracks tickets with Marko.</p>
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
        openInbox();
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
  }

  function show(which) {
    const map = {
      person: 'shadow-person-modal',
      inbox: 'shadow-inbox-modal',
      detail: 'shadow-detail-modal',
      new: 'shadow-new-modal'
    };
    Object.values(map).forEach((id) => {
      const el = qs('#' + id);
      if (el) el.hidden = true;
    });
    const el = qs('#' + map[which]);
    if (el) el.hidden = false;
  }

  function hide(which) {
    const map = {
      person: 'shadow-person-modal',
      inbox: 'shadow-inbox-modal',
      detail: 'shadow-detail-modal',
      new: 'shadow-new-modal'
    };
    const el = qs('#' + map[which]);
    if (el) el.hidden = true;
    clearHighlight();
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
    const person = getPerson();
    const q = person ? '?author=' + encodeURIComponent(person.name) : '';
    const data = await api('/api/tickets' + q);
    ticketsCache = data.tickets || [];
    return ticketsCache;
  }

  async function openInbox() {
    show('inbox');
    const list = qs('#shadow-ticket-list');
    list.innerHTML = '<p class="shadow-hint">Loading…</p>';
    try {
      await loadTickets();
      if (!ticketsCache.length) {
        list.innerHTML = '<p class="shadow-hint">No tickets yet. Click any page element to create one.</p>';
        return;
      }
      list.innerHTML = '';
      ticketsCache
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .forEach((t) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'shadow-ticket-row';
          row.innerHTML =
            '<span class="shadow-ticket-id">' +
            escapeHtml(t.id) +
            '</span><span class="shadow-ticket-meta">' +
            escapeHtml(formatDate(t.createdAt)) +
            ' · ' +
            escapeHtml(STATUS_LABELS[t.status] || t.status) +
            '</span><span class="shadow-ticket-summary">' +
            escapeHtml(t.summary || '') +
            '</span>';
          row.addEventListener('click', () => openDetail(t.id));
          list.appendChild(row);
        });
    } catch (err) {
      list.innerHTML = '<p class="shadow-hint">Could not load tickets: ' + escapeHtml(err.message) + '</p>';
    }
  }

  async function openDetail(id) {
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
      title.textContent = t.id + ' — ' + (STATUS_LABELS[t.status] || t.status);
      body.innerHTML =
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
        '</dd></dl>' +
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
      hide('new');
      clearHighlight();
      toast('Ticket ' + data.ticket.id + ' created');
      form.reset();
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

  function onPageClick(event) {
    if (event.defaultPrevented) return;
    if (event.target.closest('#shadow-review-root')) return;
    if (event.target.closest('.shadow-toolbar')) return;

    const interactive = event.target.closest('a, button, input, textarea, select, label');
    if (interactive && !event.altKey && !document.body.classList.contains('shadow-pick-mode')) return;

    if (!event.altKey && !document.body.classList.contains('shadow-pick-mode')) return;

    event.preventDefault();
    event.stopPropagation();

    if (!getPerson()) {
      show('person');
      return;
    }

    clearHighlight();
    activeEl =
      event.target.closest(
        'img, a, button, h1, h2, h3, h4, p, li, section, article, .btn, [class*="card"], [class*="section"]'
      ) || event.target;
    if (activeEl === document.body || activeEl === document.documentElement) return;
    highlightEl = activeEl;
    highlightEl.classList.add('shadow-highlight');

    const meta = elementMeta(activeEl);
    qs('#shadow-new-target').textContent = meta.type + ': ' + (meta.label || meta.selector);
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
      '<button type="button" id="shadow-pick-toggle" class="shadow-btn shadow-btn-small">Pick element</button>' +
      '<span class="shadow-toolbar-hint">Or Alt+click any element</span>';
    document.body.appendChild(bar);
    qs('#shadow-pick-toggle').addEventListener('click', () => {
      document.body.classList.toggle('shadow-pick-mode');
      const on = document.body.classList.contains('shadow-pick-mode');
      qs('#shadow-pick-toggle').textContent = on ? 'Cancel pick' : 'Pick element';
      toast(on ? 'Click an element to file a ticket' : 'Pick mode off');
    });
  }

  function init() {
    ensureUI();
    addToolbar();
    document.addEventListener('click', onPageClick, true);

    if (!getPerson()) show('person');
    else openInbox();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
