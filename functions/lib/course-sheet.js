/**
 * Course leads Google Sheet.
 *
 * Preferred: Google Sheets API via service account
 *   COURSE_SHEETS_SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON
 *
 * Fallback: Apps Script web app
 *   COURSE_SHEETS_WEBHOOK_URL + COURSE_SHEETS_SECRET
 */

import { getGoogleAccessToken, isGoogleConfigured } from './google-auth.js';

const LEADS = 'Leads';
const COURSES = 'Courses';

const LEAD_HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'CourseSlug',
  'CourseTitle',
  'Source',
  'Message',
  'Status',
  'CourseStartDate',
  'Reminder14Sent',
  'Reminder7Sent',
  'Reminder3Sent',
  'PaidAt',
  'Notes',
  'Page'
];

const COURSE_HEADERS = ['Slug', 'Title', 'StartDate', 'Venue'];
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} payload
 */
export async function courseSheetRequest(env, payload) {
  if (env && env.COURSE_SHEETS_SPREADSHEET_ID && isGoogleConfigured(env)) {
    return sheetsApiRequest(env, payload);
  }
  return appsScriptRequest(env, payload);
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} payload
 */
async function appsScriptRequest(env, payload) {
  const url = env && env.COURSE_SHEETS_WEBHOOK_URL;
  if (!url) {
    return {
      skipped: true,
      reason: 'COURSE_SHEETS_SPREADSHEET_ID (or COURSE_SHEETS_WEBHOOK_URL) not set'
    };
  }

  const body = {
    ...payload,
    secret: env.COURSE_SHEETS_SECRET || ''
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 300) };
    }
    if (!res.ok) {
      console.error('Course sheet HTTP', res.status, data);
      return { ok: false, status: res.status, data };
    }
    if (data && data.ok === false) {
      console.error('Course sheet rejected', data);
      return { ok: false, data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error('Course sheet failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} payload
 */
async function sheetsApiRequest(env, payload) {
  const token = await getGoogleAccessToken(env, SHEETS_SCOPE);
  if (!token.ok) {
    return { ok: false, error: token.error || 'Google auth failed', detail: token.detail };
  }

  const spreadsheetId = env.COURSE_SHEETS_SPREADSHEET_ID;
  const action = payload.action || '';

  try {
    await ensureTabs_(token.accessToken, spreadsheetId);

    if (action === 'lead_upsert') {
      return leadUpsert_(token.accessToken, spreadsheetId, payload.lead || {});
    }
    if (action === 'mark_paid') {
      return markPaid_(token.accessToken, spreadsheetId, payload);
    }
    if (action === 'list_due_reminders') {
      return listDueReminders_(token.accessToken, spreadsheetId, payload.today || '');
    }
    if (action === 'mark_reminder_sent') {
      return markReminderSent_(token.accessToken, spreadsheetId, payload);
    }
    return { ok: false, error: 'Unknown action' };
  } catch (err) {
    console.error('Sheets API course sheet failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} lead
 */
export function upsertLead(env, lead) {
  return courseSheetRequest(env, { action: 'lead_upsert', lead });
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} payload
 */
export function markPaid(env, payload) {
  return courseSheetRequest(env, { action: 'mark_paid', ...payload });
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {{ today?: string }} opts
 */
export function listDueReminders(env, opts = {}) {
  return courseSheetRequest(env, { action: 'list_due_reminders', today: opts.today || '' });
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {{ email: string, courseSlug?: string, reminder: '14'|'7'|'3' }} opts
 */
export function markReminderSent(env, opts) {
  return courseSheetRequest(env, {
    action: 'mark_reminder_sent',
    email: opts.email,
    courseSlug: opts.courseSlug || '',
    reminder: opts.reminder
  });
}

async function sheetsFetch(accessToken, path, init = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    const err = new Error(`Sheets API ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function ensureTabs_(accessToken, spreadsheetId) {
  const meta = await sheetsFetch(accessToken, `/${spreadsheetId}?fields=sheets.properties`);
  const titles = (meta.sheets || []).map((s) => s.properties && s.properties.title);
  const requests = [];

  if (!titles.includes(LEADS)) {
    requests.push({ addSheet: { properties: { title: LEADS } } });
  }
  if (!titles.includes(COURSES)) {
    requests.push({ addSheet: { properties: { title: COURSES } } });
  }

  // Rename lone default Sheet1 → Leads when Leads missing and Sheet1 exists empty-ish
  if (!titles.includes(LEADS) && titles.includes('Sheet1')) {
    const sheet1 = (meta.sheets || []).find((s) => s.properties.title === 'Sheet1');
    if (sheet1) {
      requests.length = 0;
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: sheet1.properties.sheetId, title: LEADS },
          fields: 'title'
        }
      });
      if (!titles.includes(COURSES)) {
        requests.push({ addSheet: { properties: { title: COURSES } } });
      }
    }
  }

  // Also handle "Rimender Automations" tab name if present as only sheet
  if (!titles.includes(LEADS)) {
    const other = (meta.sheets || []).find(
      (s) => s.properties && s.properties.title !== COURSES && s.properties.title !== LEADS
    );
    if (other && titles.length === 1) {
      requests.length = 0;
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: other.properties.sheetId, title: LEADS },
          fields: 'title'
        }
      });
      requests.push({ addSheet: { properties: { title: COURSES } } });
    }
  }

  if (requests.length) {
    await sheetsFetch(accessToken, `/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }

  await ensureHeaderRow_(accessToken, spreadsheetId, LEADS, LEAD_HEADERS);
  await ensureHeaderRow_(accessToken, spreadsheetId, COURSES, COURSE_HEADERS);
}

async function ensureHeaderRow_(accessToken, spreadsheetId, tab, headers) {
  const range = encodeURIComponent(`${tab}!A1:${colLetter(headers.length)}1`);
  const existing = await sheetsFetch(
    accessToken,
    `/${spreadsheetId}/values/${range}`
  );
  const row = (existing.values && existing.values[0]) || [];
  const needs =
    row.length < headers.length || headers.some((h, i) => String(row[i] || '') !== h);
  if (!needs) return;

  await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [headers] })
  });
}

function colLetter(n) {
  let s = '';
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || 'A';
}

async function readLeads_(accessToken, spreadsheetId) {
  const range = encodeURIComponent(`${LEADS}!A:${colLetter(LEAD_HEADERS.length)}`);
  const data = await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}`);
  return data.values || [];
}

function findLeadRow_(data, email, slug) {
  for (let i = 1; i < data.length; i += 1) {
    const rowEmail = String(data[i][2] || '')
      .trim()
      .toLowerCase();
    const rowSlug = String(data[i][4] || '')
      .trim()
      .toLowerCase();
    if (email && rowEmail === email && rowSlug === slug) return i;
    if (email && rowEmail === email && !slug && !rowSlug) return i;
  }
  return -1;
}

function leadFromRow_(row) {
  return {
    name: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    courseSlug: row[4] || '',
    courseTitle: row[5] || '',
    source: row[6] || '',
    message: row[7] || '',
    status: row[8] || '',
    courseStartDate: formatDateCell_(row[9]),
    reminder14Sent: row[10] || '',
    reminder7Sent: row[11] || '',
    reminder3Sent: row[12] || '',
    paidAt: row[13] || '',
    notes: row[14] || '',
    page: row[15] || ''
  };
}

function formatDateCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function parseDateOnly_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return startOfDay_(value);
  }
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return startOfDay_(d);
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween_(from, to) {
  const ms = startOfDay_(to).getTime() - startOfDay_(from).getTime();
  return Math.round(ms / 86400000);
}

async function writeLeadRow_(accessToken, spreadsheetId, rowIndex1Based, row) {
  const range = encodeURIComponent(
    `${LEADS}!A${rowIndex1Based}:${colLetter(LEAD_HEADERS.length)}${rowIndex1Based}`
  );
  await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [row] })
  });
}

async function appendLeadRow_(accessToken, spreadsheetId, row) {
  const range = encodeURIComponent(`${LEADS}!A:${colLetter(LEAD_HEADERS.length)}`);
  await sheetsFetch(
    accessToken,
    `/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] })
    }
  );
}

async function leadUpsert_(accessToken, spreadsheetId, lead) {
  const email = String(lead.email || '')
    .trim()
    .toLowerCase();
  const slug = String(lead.courseSlug || lead.slug || '')
    .trim()
    .toLowerCase();
  if (!email && !lead.phone) {
    return { ok: false, error: 'email or phone required' };
  }

  const data = await readLeads_(accessToken, spreadsheetId);
  const rowIndex = findLeadRow_(data, email, slug);
  const now = new Date().toISOString();
  const row = [
    now,
    lead.name || '',
    email,
    lead.phone || '',
    slug,
    lead.courseTitle || '',
    lead.source || '',
    lead.message || '',
    lead.status || 'Interested',
    lead.courseStartDate || '',
    '',
    '',
    '',
    lead.paidAt || '',
    lead.notes || '',
    lead.page || ''
  ];

  if (rowIndex > 0) {
    const existing = data[rowIndex];
    if (!lead.status) row[8] = existing[8] || 'Interested';
    if (!lead.courseStartDate) row[9] = existing[9] || '';
    row[10] = existing[10] || '';
    row[11] = existing[11] || '';
    row[12] = existing[12] || '';
    if (!lead.paidAt) row[13] = existing[13] || '';
    if (!lead.notes && existing[14]) row[14] = existing[14];
    row[0] = existing[0] || now;
    await writeLeadRow_(accessToken, spreadsheetId, rowIndex + 1, row);
    return { ok: true, updated: true, row: rowIndex + 1, via: 'sheets_api' };
  }

  await appendLeadRow_(accessToken, spreadsheetId, row);
  return { ok: true, created: true, via: 'sheets_api' };
}

async function markPaid_(accessToken, spreadsheetId, body) {
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const slug = String(body.courseSlug || body.slug || '')
    .trim()
    .toLowerCase();
  const data = await readLeads_(accessToken, spreadsheetId);
  const rowIndex = findLeadRow_(data, email, slug);
  if (rowIndex < 1) {
    return { ok: false, error: 'Lead not found' };
  }
  const row = data[rowIndex].slice();
  while (row.length < LEAD_HEADERS.length) row.push('');
  row[8] = 'Paid';
  if (body.courseStartDate) row[9] = body.courseStartDate;
  if (body.courseTitle) row[5] = body.courseTitle;
  row[13] = body.paidAt || new Date().toISOString();
  if (body.notes) row[14] = body.notes;
  await writeLeadRow_(accessToken, spreadsheetId, rowIndex + 1, row);
  return { ok: true, lead: leadFromRow_(row), via: 'sheets_api' };
}

async function listDueReminders_(accessToken, spreadsheetId, todayIso) {
  const data = await readLeads_(accessToken, spreadsheetId);
  const today = parseDateOnly_(todayIso) || startOfDay_(new Date());
  const due = [];
  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    if (String(row[8] || '').toLowerCase() !== 'paid') continue;
    const start = parseDateOnly_(row[9]);
    if (!start) continue;
    const days = daysBetween_(today, start);
    const lead = leadFromRow_(row);
    lead.row = i + 1;
    if (days === 14 && !String(row[10] || '').trim()) {
      lead.daysBefore = 14;
      due.push(lead);
    } else if (days === 7 && !String(row[11] || '').trim()) {
      lead.daysBefore = 7;
      due.push(lead);
    } else if (days === 3 && !String(row[12] || '').trim()) {
      lead.daysBefore = 3;
      due.push(lead);
    }
  }
  return {
    ok: true,
    today: today.toISOString().slice(0, 10),
    due,
    via: 'sheets_api'
  };
}

async function markReminderSent_(accessToken, spreadsheetId, body) {
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const slug = String(body.courseSlug || body.slug || '')
    .trim()
    .toLowerCase();
  const reminder = String(body.reminder || '');
  const data = await readLeads_(accessToken, spreadsheetId);
  const rowIndex = findLeadRow_(data, email, slug);
  if (rowIndex < 1) return { ok: false, error: 'Lead not found' };
  const col = reminder === '14' ? 11 : reminder === '7' ? 12 : reminder === '3' ? 13 : 0;
  if (!col) return { ok: false, error: 'Invalid reminder' };
  const range = encodeURIComponent(`${LEADS}!${colLetter(col)}${rowIndex + 1}`);
  await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[new Date().toISOString()]] })
  });
  return { ok: true, row: rowIndex + 1, reminder, via: 'sheets_api' };
}
