/**
 * Google Apps Script for TWA course leads Sheet.
 *
 * Setup:
 * 1. Create a Google Sheet (Drive) with tabs Leads and Courses (optional).
 * 2. Extensions -> Apps Script -> paste this entire file into Code.gs
 * 3. Project Settings -> Script properties:
 *      COURSE_SHEETS_SECRET = (same value as Pages secret COURSE_SHEETS_SECRET)
 * 4. Deploy -> New deployment -> Web app
 *    Execute as: Me | Who has access: Anyone
 * 5. Copy the /exec URL into Pages secret COURSE_SHEETS_WEBHOOK_URL
 *
 * Leads columns (row 1 headers):
 * Timestamp | Name | Email | Phone | CourseSlug | CourseTitle | Source | Message |
 * Status | CourseStartDate | Reminder14Sent | Reminder7Sent | Reminder3Sent | PaidAt | Notes | Page
 */

var LEADS = 'Leads';
var COURSES = 'Courses';

var LEAD_HEADERS = [
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

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('COURSE_SHEETS_SECRET') || '';
    if (expected && String(body.secret || '') !== expected) {
      return json_({ ok: false, error: 'Unauthorized' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = body.action || '';

    if (action === 'lead_upsert') {
      return json_(leadUpsert_(ss, body.lead || {}));
    }
    if (action === 'mark_paid') {
      return json_(markPaid_(ss, body));
    }
    if (action === 'list_due_reminders') {
      return json_(listDueReminders_(ss, body.today || ''));
    }
    if (action === 'mark_reminder_sent') {
      return json_(markReminderSent_(ss, body));
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({
    service: 'TWA course leads Sheets bridge',
    status: 'ok',
    tabs: [LEADS, COURSES]
  });
}

function leadUpsert_(ss, lead) {
  var sheet = ensureLeads_(ss);
  var email = String(lead.email || '')
    .trim()
    .toLowerCase();
  var slug = String(lead.courseSlug || lead.slug || '')
    .trim()
    .toLowerCase();
  if (!email && !lead.phone) {
    return { ok: false, error: 'email or phone required' };
  }

  var data = sheet.getDataRange().getValues();
  var rowIndex = findLeadRow_(data, email, slug);
  var now = new Date().toISOString();
  var row = [
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
    var existing = data[rowIndex];
    // Preserve status / reminder / paid fields unless explicitly provided
    if (!lead.status) row[8] = existing[8] || 'Interested';
    if (!lead.courseStartDate) row[9] = existing[9] || '';
    row[10] = existing[10] || '';
    row[11] = existing[11] || '';
    row[12] = existing[12] || '';
    if (!lead.paidAt) row[13] = existing[13] || '';
    if (!lead.notes && existing[14]) row[14] = existing[14];
    row[0] = existing[0] || now;
    sheet.getRange(rowIndex + 1, 1, 1, LEAD_HEADERS.length).setValues([row]);
    return { ok: true, updated: true, row: rowIndex + 1 };
  }

  sheet.appendRow(row);
  return { ok: true, created: true, row: sheet.getLastRow() };
}

function markPaid_(ss, body) {
  var sheet = ensureLeads_(ss);
  var email = String(body.email || '')
    .trim()
    .toLowerCase();
  var slug = String(body.courseSlug || body.slug || '')
    .trim()
    .toLowerCase();
  var data = sheet.getDataRange().getValues();
  var rowIndex = findLeadRow_(data, email, slug);
  if (rowIndex < 1) {
    return { ok: false, error: 'Lead not found' };
  }
  var row = data[rowIndex].slice();
  while (row.length < LEAD_HEADERS.length) row.push('');
  row[8] = 'Paid';
  if (body.courseStartDate) row[9] = body.courseStartDate;
  if (body.courseTitle) row[5] = body.courseTitle;
  row[13] = body.paidAt || new Date().toISOString();
  if (body.notes) row[14] = body.notes;
  sheet.getRange(rowIndex + 1, 1, 1, LEAD_HEADERS.length).setValues([row]);
  return {
    ok: true,
    lead: leadFromRow_(row)
  };
}

function listDueReminders_(ss, todayIso) {
  var sheet = ensureLeads_(ss);
  var data = sheet.getDataRange().getValues();
  var today = parseDateOnly_(todayIso) || startOfDay_(new Date());
  var due = [];
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[8] || '').toLowerCase() !== 'paid') continue;
    var start = parseDateOnly_(row[9]);
    if (!start) continue;
    var days = daysBetween_(today, start);
    var lead = leadFromRow_(row);
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
  return { ok: true, today: today.toISOString().slice(0, 10), due: due };
}

function markReminderSent_(ss, body) {
  var sheet = ensureLeads_(ss);
  var email = String(body.email || '')
    .trim()
    .toLowerCase();
  var slug = String(body.courseSlug || body.slug || '')
    .trim()
    .toLowerCase();
  var reminder = String(body.reminder || '');
  var data = sheet.getDataRange().getValues();
  var rowIndex = findLeadRow_(data, email, slug);
  if (rowIndex < 1) return { ok: false, error: 'Lead not found' };
  var col = reminder === '14' ? 11 : reminder === '7' ? 12 : reminder === '3' ? 13 : 0;
  if (!col) return { ok: false, error: 'Invalid reminder' };
  sheet.getRange(rowIndex + 1, col).setValue(new Date().toISOString());
  return { ok: true, row: rowIndex + 1, reminder: reminder };
}

function ensureLeads_(ss) {
  var sheet = ss.getSheetByName(LEADS) || ss.insertSheet(LEADS);
  ensureHeaders_(sheet, LEAD_HEADERS);
  if (!ss.getSheetByName(COURSES)) {
    var courses = ss.insertSheet(COURSES);
    ensureHeaders_(courses, ['Slug', 'Title', 'StartDate', 'Venue']);
  }
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var i;
  for (i = 0; i < headers.length; i++) {
    if (String(existing[i] || '') !== headers[i]) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      return;
    }
  }
}

function findLeadRow_(data, email, slug) {
  var i;
  for (i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][2] || '')
      .trim()
      .toLowerCase();
    var rowSlug = String(data[i][4] || '')
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

function parseDateOnly_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return startOfDay_(value);
  }
  var s = String(value).trim();
  if (!s) return null;
  // YYYY-MM-DD
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  var d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return startOfDay_(d);
}

function formatDateCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween_(from, to) {
  var ms = startOfDay_(to).getTime() - startOfDay_(from).getTime();
  return Math.round(ms / 86400000);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
