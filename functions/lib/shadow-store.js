/**
 * Shadow ticket store — KV when bound, otherwise in-memory (dev / first boot).
 * Schema mirrors Google Sheets Tabs: Tickets, Comments, Audit_Log.
 * Optionally dual-writes to Google Sheets when SHEETS_WEBHOOK_URL is set.
 */

import { pushToSheets } from './sheets-sync.js';

const META_KEY = 'shadow:meta';
const TICKETS_KEY = 'shadow:tickets';
const COMMENTS_KEY = 'shadow:comments';
const AUDIT_KEY = 'shadow:audit';

const memory = {
  meta: { nextTicket: 1, nextComment: 1, nextEvent: 1 },
  tickets: [],
  comments: [],
  audit: []
};

function kv(env) {
  return env && env.SHADOW_TICKETS ? env.SHADOW_TICKETS : null;
}

async function readJson(store, key, fallback) {
  if (!store) return structuredClone(fallback);
  const raw = await store.get(key);
  if (!raw) return structuredClone(fallback);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

async function writeJson(store, key, value) {
  if (!store) {
    if (key === META_KEY) memory.meta = value;
    if (key === TICKETS_KEY) memory.tickets = value;
    if (key === COMMENTS_KEY) memory.comments = value;
    if (key === AUDIT_KEY) memory.audit = value;
    return;
  }
  await store.put(key, JSON.stringify(value));
}

async function getState(env) {
  const store = kv(env);
  if (!store) {
    return {
      meta: memory.meta,
      tickets: memory.tickets,
      comments: memory.comments,
      audit: memory.audit,
      store: null
    };
  }
  const [meta, tickets, comments, audit] = await Promise.all([
    readJson(store, META_KEY, memory.meta),
    readJson(store, TICKETS_KEY, []),
    readJson(store, COMMENTS_KEY, []),
    readJson(store, AUDIT_KEY, [])
  ]);
  return { meta, tickets, comments, audit, store };
}

async function persist(state) {
  const { store } = state;
  await Promise.all([
    writeJson(store, META_KEY, state.meta),
    writeJson(store, TICKETS_KEY, state.tickets),
    writeJson(store, COMMENTS_KEY, state.comments),
    writeJson(store, AUDIT_KEY, state.audit)
  ]);
}

function nowIso() {
  return new Date().toISOString();
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

async function appendAudit(state, entry) {
  const id = 'E-' + pad(state.meta.nextEvent++, 4);
  const row = {
    eventId: id,
    timestamp: nowIso(),
    source: 'Shadow UI',
    ...entry
  };
  state.audit.push(row);
  return row;
}

export async function listTickets(env, { author } = {}) {
  const state = await getState(env);
  let tickets = state.tickets.slice();
  if (author) {
    tickets = tickets.filter((t) => t.createdBy === author);
  }
  return tickets;
}

export async function getTicket(env, id) {
  const state = await getState(env);
  const ticket = state.tickets.find((t) => t.id === id);
  if (!ticket) return null;
  const comments = state.comments.filter((c) => c.ticketId === id);
  return { ticket, comments };
}

export async function createTicket(env, payload) {
  const state = await getState(env);
  const id = 'TWA-' + pad(state.meta.nextTicket++, 3);
  const createdAt = nowIso();
  const ticket = {
    id,
    createdAt,
    createdBy: payload.createdBy,
    pageUrl: payload.pageUrl || '',
    pagePath: payload.pagePath || '',
    elementType: payload.elementType || 'other',
    elementLabel: payload.elementLabel || '',
    cssSelector: payload.cssSelector || '',
    textSnippet: payload.textSnippet || '',
    category: payload.category || 'Other',
    priority: payload.priority || 'Normal',
    status: payload.status || 'Open',
    summary: payload.summary || '',
    assignedTo: payload.assignedTo || 'Unassigned',
    shadowFixUrl: '',
    liveShippedUrl: '',
    closedAt: '',
    closedBy: '',
    lastUpdatedAt: createdAt,
    lastUpdatedBy: payload.createdBy
  };
  state.tickets.push(ticket);
  const audit = await appendAudit(state, {
    actor: payload.createdBy,
    action: 'ticket_created',
    ticketId: id,
    fromStatus: '',
    toStatus: ticket.status,
    pageUrl: ticket.pageUrl,
    details: ticket.summary
  });
  await persist(state);
  await pushToSheets(env, { action: 'ticket_created', ticket, audit });
  return ticket;
}

export async function addComment(env, ticketId, { author, message }) {
  const state = await getState(env);
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const id = 'C-' + pad(state.meta.nextComment++, 3);
  const createdAt = nowIso();
  const comment = {
    commentId: id,
    ticketId,
    createdAt,
    author,
    message,
    visibility: 'Shared with partners'
  };
  state.comments.push(comment);
  ticket.lastUpdatedAt = createdAt;
  ticket.lastUpdatedBy = author;
  const audit = await appendAudit(state, {
    actor: author,
    action: 'comment_added',
    ticketId,
    commentId: id,
    pageUrl: ticket.pageUrl,
    details: message.slice(0, 200)
  });
  await persist(state);
  await pushToSheets(env, { action: 'comment_added', ticket, comment, audit });
  return { ticket, comment };
}

export async function updateTicketStatus(env, ticketId, { status, actor }) {
  const state = await getState(env);
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  const from = ticket.status;
  ticket.status = status;
  ticket.lastUpdatedAt = nowIso();
  ticket.lastUpdatedBy = actor;
  if (['Shipped to live', "Won't fix", 'Duplicate'].includes(status)) {
    ticket.closedAt = ticket.lastUpdatedAt;
    ticket.closedBy = actor;
  }
  const audit = await appendAudit(state, {
    actor,
    action: 'status_changed',
    ticketId,
    fromStatus: from,
    toStatus: status,
    pageUrl: ticket.pageUrl,
    details: from + ' → ' + status
  });
  await persist(state);
  await pushToSheets(env, { action: 'status_changed', ticket, audit });
  return ticket;
}

export async function exportAudit(env) {
  const state = await getState(env);
  return {
    tickets: state.tickets,
    comments: state.comments,
    audit: state.audit,
    people: [
      { name: 'Katia Major', email: 'Katia.major@thameswellness.com', role: 'Owner', active: true },
      { name: 'Raili Maripuu', email: 'raili.maripuu@thameswellness.com', role: 'Owner', active: true },
      { name: 'Marko Tuisk', email: 'markotuisk@gmail.com', role: 'SEO & Dev', active: true },
      { name: 'Meridian', email: 'system', role: 'Agent', active: true }
    ]
  };
}

/** Full replace sync of all tabs to Sheets (manual / recovery). */
export async function syncAllToSheets(env) {
  const data = await exportAudit(env);
  return pushToSheets(env, { action: 'sync', ...data });
}

/** Upload replacement image to Drive via Apps Script; link on ticket.shadowFixUrl. */
export async function uploadAsset(env, payload) {
  const sheetsResult = await pushToSheets(env, {
    action: 'asset_upload',
    asset: {
      ticketId: payload.ticketId,
      locationId: payload.locationId,
      filename: payload.filename,
      mimeType: payload.mimeType,
      dataBase64: payload.dataBase64,
      pagePath: payload.pagePath || '',
      pageUrl: payload.pageUrl || '',
      cssSelector: payload.cssSelector || '',
      currentSrc: payload.currentSrc || '',
      elementLabel: payload.elementLabel || '',
      uploadedBy: payload.uploadedBy
    }
  });

  if (sheetsResult.skipped) {
    return { ok: false, error: 'SHEETS_WEBHOOK_URL is not set' };
  }
  if (!sheetsResult.ok) {
    return {
      ok: false,
      error: sheetsResult.data?.error || sheetsResult.error || 'Sheets upload failed',
      detail: sheetsResult
    };
  }

  const scriptBody = sheetsResult.data || {};
  if (!scriptBody.ok) {
    return { ok: false, error: scriptBody.error || 'Drive upload failed' };
  }

  const driveUrl = scriptBody.driveUrl || '';
  if (driveUrl && payload.ticketId) {
    const state = await getState(env);
    const ticket = state.tickets.find((t) => t.id === payload.ticketId);
    if (ticket) {
      ticket.shadowFixUrl = driveUrl;
      ticket.lastUpdatedAt = nowIso();
      ticket.lastUpdatedBy = payload.uploadedBy;
      await persist(state);
    }
  }

  return {
    ok: true,
    driveUrl,
    fileId: scriptBody.fileId,
    locationId: scriptBody.locationId || payload.locationId,
    filename: scriptBody.filename || payload.filename,
    assetId: scriptBody.assetId
  };
}
