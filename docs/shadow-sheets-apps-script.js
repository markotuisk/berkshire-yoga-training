/**
 * Google Apps Script — paste into Extensions → Apps Script on the Meridian shadow Sheet.
 * Deploy as Web app: Execute as Me, Who has access: Anyone with the link.
 * Set Cloudflare Pages secret SHEETS_WEBHOOK_URL to the web app URL.
 *
 * Sheet tabs required: Tickets, Comments, Audit_Log, People (headers from SHADOW-SHEETS-TEMPLATE.md)
 */

const TICKETS = 'Tickets';
const COMMENTS = 'Comments';
const AUDIT = 'Audit_Log';
const PEOPLE = 'People';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'sync';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

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
    return json_({ ok: false, error: 'Unknown action' }, 400);
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
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
  const tickets = body.tickets || [];
  const comments = body.comments || [];
  const audit = body.audit || [];
  const people = body.people || [];

  writeTable_(ss.getSheetByName(TICKETS) || ss.insertSheet(TICKETS), ticketHeaders_(), tickets.map(ticketRow_));
  writeTable_(ss.getSheetByName(COMMENTS) || ss.insertSheet(COMMENTS), commentHeaders_(), comments.map(commentRow_));
  writeTable_(ss.getSheetByName(AUDIT) || ss.insertSheet(AUDIT), auditHeaders_(), audit.map(auditRow_));
  writeTable_(ss.getSheetByName(PEOPLE) || ss.insertSheet(PEOPLE), ['Name', 'Email', 'Role', 'Active'], people.map(function (p) {
    return [p.name || '', p.email || '', p.role || '', p.active === false ? 'No' : 'Yes'];
  }));
}

function appendTicket_(ss, t) {
  if (!t) return;
  const sheet = ss.getSheetByName(TICKETS) || ss.insertSheet(TICKETS);
  ensureHeaders_(sheet, ticketHeaders_());
  sheet.appendRow(ticketRow_(t));
}

function appendComment_(ss, c) {
  if (!c) return;
  const sheet = ss.getSheetByName(COMMENTS) || ss.insertSheet(COMMENTS);
  ensureHeaders_(sheet, commentHeaders_());
  sheet.appendRow(commentRow_(c));
}

function appendAudit_(ss, a) {
  if (!a) return;
  const sheet = ss.getSheetByName(AUDIT) || ss.insertSheet(AUDIT);
  ensureHeaders_(sheet, auditHeaders_());
  sheet.appendRow(auditRow_(a));
}

function updateTicketStatus_(ss, t) {
  if (!t || !t.id) return;
  const sheet = ss.getSheetByName(TICKETS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === t.id) {
      sheet.getRange(i + 1, 1, 1, ticketHeaders_().length).setValues([ticketRow_(t)]);
      return;
    }
  }
  appendTicket_(ss, t);
}

function ticketHeaders_() {
  return ['Ticket ID', 'Created at', 'Created by', 'Page URL', 'Page path', 'Element type', 'Element label', 'CSS selector', 'Text snippet', 'Category', 'Priority', 'Status', 'Summary', 'Assigned to', 'Shadow fix URL', 'Live shipped URL', 'Closed at', 'Closed by', 'Last updated at', 'Last updated by'];
}

function commentHeaders_() {
  return ['Comment ID', 'Ticket ID', 'Created at', 'Author', 'Message', 'Visibility'];
}

function auditHeaders_() {
  return ['Event ID', 'Timestamp', 'Actor', 'Action', 'Ticket ID', 'Comment ID', 'From status', 'To status', 'Page URL', 'Details', 'Source'];
}

function ticketRow_(t) {
  return [t.id, t.createdAt, t.createdBy, t.pageUrl, t.pagePath, t.elementType, t.elementLabel, t.cssSelector, t.textSnippet, t.category, t.priority, t.status, t.summary, t.assignedTo, t.shadowFixUrl, t.liveShippedUrl, t.closedAt, t.closedBy, t.lastUpdatedAt, t.lastUpdatedBy];
}

function commentRow_(c) {
  return [c.commentId, c.ticketId, c.createdAt, c.author, c.message, c.visibility || 'Shared with partners'];
}

function auditRow_(a) {
  return [a.eventId, a.timestamp, a.actor, a.action, a.ticketId || '', a.commentId || '', a.fromStatus || '', a.toStatus || '', a.pageUrl || '', a.details || '', a.source || 'Shadow UI'];
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  else {
    const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (!existing[0]) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function writeTable_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function json_(obj, status) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
