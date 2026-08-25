/**
 * Google Apps Script - paste into Code.gs on this Sheet:
 * https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit
 *
 * 1. Extensions -> Apps Script
 * 2. Replace ALL of Code.gs with this file (no backticks, no markdown)
 * 3. Project Settings -> enable "Chrome V8 runtime" (recommended)
 * 4. Save -> Deploy -> New deployment -> Web app
 *    Execute as: Me | Who has access: Anyone
 * 5. Copy script.google.com/macros/s/.../exec into SHEETS_WEBHOOK_URL
 *
 * Tabs: Tickets, Comments, Audit_Log, People (see SHADOW-SHEETS-TEMPLATE.md)
 */

var TICKETS = 'Tickets';
var COMMENTS = 'Comments';
var AUDIT = 'Audit_Log';
var PEOPLE = 'People';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action || 'sync';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'sync') {
      syncExport_(ss, body);
      return json_({ ok: true });
    }
    if (action === 'ticket_created') {
      appendTicket_(ss, body.ticket);
      appendAudit_(ss, body.audit);
      return json_({ ok: true });
    }
    if (action === 'comment_added') {
      appendComment_(ss, body.comment);
      appendAudit_(ss, body.audit);
      return json_({ ok: true });
    }
    if (action === 'status_changed') {
      updateTicketStatus_(ss, body.ticket);
      appendAudit_(ss, body.audit);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({
    service: 'Meridian shadow review Sheets bridge',
    status: 'ok',
    tabs: [TICKETS, COMMENTS, AUDIT, PEOPLE]
  });
}

function syncExport_(ss, body) {
  var tickets = body.tickets || [];
  var comments = body.comments || [];
  var audit = body.audit || [];
  var people = body.people || [];

  writeTable_(ss.getSheetByName(TICKETS) || ss.insertSheet(TICKETS), ticketHeaders_(), tickets.map(ticketRow_));
  writeTable_(ss.getSheetByName(COMMENTS) || ss.insertSheet(COMMENTS), commentHeaders_(), comments.map(commentRow_));
  writeTable_(ss.getSheetByName(AUDIT) || ss.insertSheet(AUDIT), auditHeaders_(), audit.map(auditRow_));
  writeTable_(
    ss.getSheetByName(PEOPLE) || ss.insertSheet(PEOPLE),
    ['Name', 'Email', 'Role', 'Active'],
    people.map(function (p) {
      return [p.name || '', p.email || '', p.role || '', p.active === false ? 'No' : 'Yes'];
    })
  );
}

function appendTicket_(ss, t) {
  if (!t) return;
  var sheet = ss.getSheetByName(TICKETS) || ss.insertSheet(TICKETS);
  ensureHeaders_(sheet, ticketHeaders_());
  sheet.appendRow(ticketRow_(t));
}

function appendComment_(ss, c) {
  if (!c) return;
  var sheet = ss.getSheetByName(COMMENTS) || ss.insertSheet(COMMENTS);
  ensureHeaders_(sheet, commentHeaders_());
  sheet.appendRow(commentRow_(c));
}

function appendAudit_(ss, a) {
  if (!a) return;
  var sheet = ss.getSheetByName(AUDIT) || ss.insertSheet(AUDIT);
  ensureHeaders_(sheet, auditHeaders_());
  sheet.appendRow(auditRow_(a));
}

function updateTicketStatus_(ss, t) {
  if (!t || !t.id) return;
  var sheet = ss.getSheetByName(TICKETS);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var headersLen = ticketHeaders_().length;
  var i;
  for (i = 1; i < data.length; i++) {
    if (String(data[i][0]) === t.id) {
      sheet.getRange(i + 1, 1, 1, headersLen).setValues([ticketRow_(t)]);
      return;
    }
  }
  appendTicket_(ss, t);
}

function ticketHeaders_() {
  return [
    'Ticket ID', 'Created at', 'Created by', 'Page URL', 'Page path', 'Element type',
    'Element label', 'CSS selector', 'Text snippet', 'Category', 'Priority', 'Status',
    'Summary', 'Assigned to', 'Shadow fix URL', 'Live shipped URL', 'Closed at',
    'Closed by', 'Last updated at', 'Last updated by'
  ];
}

function commentHeaders_() {
  return ['Comment ID', 'Ticket ID', 'Created at', 'Author', 'Message', 'Visibility'];
}

function auditHeaders_() {
  return [
    'Event ID', 'Timestamp', 'Actor', 'Action', 'Ticket ID', 'Comment ID',
    'From status', 'To status', 'Page URL', 'Details', 'Source'
  ];
}

function ticketRow_(t) {
  return [
    t.id, t.createdAt, t.createdBy, t.pageUrl, t.pagePath, t.elementType,
    t.elementLabel, t.cssSelector, t.textSnippet, t.category, t.priority, t.status,
    t.summary, t.assignedTo, t.shadowFixUrl, t.liveShippedUrl, t.closedAt,
    t.closedBy, t.lastUpdatedAt, t.lastUpdatedBy
  ];
}

function commentRow_(c) {
  return [
    c.commentId, c.ticketId, c.createdAt, c.author, c.message,
    c.visibility || 'Shared with partners'
  ];
}

function auditRow_(a) {
  return [
    a.eventId, a.timestamp, a.actor, a.action, a.ticketId || '', a.commentId || '',
    a.fromStatus || '', a.toStatus || '', a.pageUrl || '', a.details || '',
    a.source || 'Shadow UI'
  ];
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (!existing[0]) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
}

function writeTable_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
