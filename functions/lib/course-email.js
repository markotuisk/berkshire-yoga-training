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
import { upsertLead } from './course-sheet.js';

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
 *   isJournal?: boolean,
 *   isSuggest?: boolean
 * }} lead
 */
export async function runLeadEmailAutomation(env, lead) {
  /** @type {Record<string, unknown>} */
  const results = { visitor: null, staff: null, sheet: null };

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
    notes: lead.isJournal ? 'journal-subscribe' : lead.isSuggest ? 'suggest-course' : ''
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

  return results;
}
