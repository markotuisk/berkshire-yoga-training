/**
 * Orchestrate visitor confirmation, staff alert, and Sheet upsert.
 * Failures are logged; callers should not fail the HTTP response solely on these.
 */

import { sendEmail, DEFAULT_FROM } from './resend.js';
import {
  visitorEnquiryEmail,
  staffLeadAlertEmail,
  STAFF_NOTIFY_TO,
  CONTACT_EMAIL
} from './email-templates.js';
import { appendFoundationApplication, upsertLead } from './course-sheet.js';

/**
 * @param {Record<string, string|undefined>} env
 * @param {{
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   topic?: string,
 *   slug?: string,
 *   courseTitle?: string,
 *   source?: string,
 *   message?: string,
 *   courses?: string,
 *   page?: string,
 *   notes?: string,
 *   foundationApplication?: Record<string, unknown> | null,
 *   isJournal?: boolean,
 *   isSuggest?: boolean
 * }} lead
 */
export async function runLeadEmailAutomation(env, lead) {
  /** @type {Record<string, unknown>} */
  const results = { visitor: null, staff: null, sheet: null, foundationSheet: null };

  const sheetLead = {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    courseSlug: lead.slug || '',
    courseTitle: lead.courseTitle || lead.topic || '',
    source: lead.source || '',
    message: lead.message || '',
    status: 'Interested',
    page: lead.page || '',
    notes: lead.notes
      || (lead.isJournal ? 'journal-subscribe' : lead.isSuggest ? 'suggest-course' : '')
  };

  // Order: visitor branded mail, then staff alert, then Sheet upsert
  const hasVisitorEmail = !!(lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email));
  if (!hasVisitorEmail) {
    results.visitor = { skipped: true, reason: 'no visitor email' };
  } else {
    const visitorTpl = visitorEnquiryEmail({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      topic: lead.topic,
      slug: lead.slug,
      courseTitle: lead.courseTitle,
      courses: lead.courses,
      message: lead.message,
      foundationNotes: lead.notes || '',
      source: lead.source,
      isJournal: lead.isJournal
    });
    results.visitor = await sendEmail(env, {
      from: DEFAULT_FROM,
      to: lead.email,
      replyTo: CONTACT_EMAIL,
      subject: visitorTpl.subject,
      html: visitorTpl.html,
      text: visitorTpl.text
    });
  }

  const staffTpl = staffLeadAlertEmail({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    topic: lead.topic,
    courseTitle: lead.courseTitle,
    courses: lead.courses,
    slug: lead.slug,
    source: lead.source,
    message: lead.message,
    foundationNotes: lead.notes || '',
    page: lead.page
  });
  results.staff = await sendEmail(env, {
    from: DEFAULT_FROM,
    to: STAFF_NOTIFY_TO,
    replyTo: lead.email || CONTACT_EMAIL,
    subject: staffTpl.subject,
    html: staffTpl.html,
    text: staffTpl.text
  });

  results.sheet = await upsertLead(env, sheetLead);

  if (lead.foundationApplication) {
    results.foundationSheet = await appendFoundationApplication(env, {
      name: lead.name || '',
      email: lead.email || '',
      values: lead.foundationApplication.values || lead.foundationApplication,
      interest: lead.topic || lead.courseTitle || '',
      phone: lead.phone || '',
      page: lead.page || ''
    });
  } else {
    results.foundationSheet = { skipped: true, reason: 'not a foundation application' };
  }

  return results;
}
