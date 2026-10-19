/**
 * Branded HTML/text email templates for Thames Wellness Academy.
 * Colours: parchment #f4efe6, ink #1c1915, gold #c9a227, woodland #2f3b2e.
 * British English. No em dashes.
 */

import { resolveCourse, ACADEMY_CONTACTS, SITE_URL } from './course-catalog.js';
import {
  googleCalendarUrl,
  icsDownloadUrl,
  appleCalendarUrl,
  qrImageUrl,
  academyVcardUrl
} from './calendar-links.js';

const LOGO_URL = `${SITE_URL}/assets/logo-twa.png`;
const CONTACT = ACADEMY_CONTACTS.email;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{ title: string, preheader?: string, bodyHtml: string }} opts
 */
export function wrapBrandedEmail(opts) {
  const title = escapeHtml(opts.title || 'Thames Wellness Academy');
  const preheader = escapeHtml(opts.preheader || '');
  const bodyHtml = opts.bodyHtml || '';

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#ebe4d8;color:#1c1915;font-family:Figtree,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe4d8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f4efe6;border:1px solid rgba(28,25,21,0.12);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;border-bottom:1px solid rgba(201,162,39,0.35);">
              <img src="${LOGO_URL}" width="56" height="56" alt="Thames Wellness Academy" style="display:block;margin:0 auto 12px;border:0;">
              <p style="margin:0;font-family:Archivo,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.02em;color:#1c1915;">Thames Wellness Academy</p>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b6358;">Berkshire · Reading</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:16px;line-height:1.65;color:#3a342c;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 28px;border-top:1px solid rgba(28,25,21,0.1);font-size:13px;line-height:1.5;color:#6b6358;text-align:center;">
              <p style="margin:0 0 8px;">Academy inbox: <a href="mailto:${CONTACT}" style="color:#4a5a45;">${CONTACT}</a></p>
              <p style="margin:0;"><a href="${SITE_URL}" style="color:#4a5a45;">thameswellnessacademy.co.uk</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function interestLabel(lead) {
  return lead.courseTitle || lead.topic || lead.slug || lead.source || 'your enquiry';
}

/**
 * Shared course card: link + key details.
 * @param {ReturnType<typeof resolveCourse>} course
 */
function courseBlockHtml(course) {
  if (!course) return '';
  const details = (course.details || [])
    .map(
      (line) =>
        `<li style="margin:0 0 6px;color:#3a342c;">${escapeHtml(line)}</li>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid rgba(28,25,21,0.12);border-radius:10px;background:#ffffff;overflow:hidden;">
    <tr>
      <td style="padding:16px 18px;border-bottom:1px solid rgba(201,162,39,0.35);">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8841c;font-weight:600;">Your course</p>
        <p style="margin:0;font-family:Archivo,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#1c1915;">${escapeHtml(course.title)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;">
        <p style="margin:0 0 12px;font-size:15px;color:#3a342c;">${escapeHtml(course.summary)}</p>
        ${details ? `<ul style="margin:0 0 14px;padding-left:18px;">${details}</ul>` : ''}
        <a href="${escapeHtml(course.url)}" style="display:inline-block;padding:10px 16px;background:#c9a227;color:#1c1915;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View course page</a>
      </td>
    </tr>
  </table>`;
}

function courseBlockText(course) {
  if (!course) return '';
  const lines = [
    `Course: ${course.title}`,
    course.summary,
    ...(course.details || []),
    `Link: ${course.url}`
  ];
  return `\n${lines.join('\n')}\n`;
}

/**
 * Founders + generic company email.
 */
function contactsBlockHtml() {
  const founders = ACADEMY_CONTACTS.founders
    .map(
      (f) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(28,25,21,0.08);">
          <strong style="color:#1c1915;">${escapeHtml(f.name)}</strong>
          <span style="color:#6b6358;"> · ${escapeHtml(f.role)}</span><br>
          <a href="mailto:${escapeHtml(f.email)}" style="color:#4a5a45;">${escapeHtml(f.email)}</a>
        </td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td style="padding:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8841c;font-weight:600;">Academy contacts</td></tr>
    ${founders}
    <tr>
      <td style="padding:10px 0 0;">
        <strong style="color:#1c1915;">Academy inbox</strong><br>
        <a href="mailto:${CONTACT}" style="color:#4a5a45;">${CONTACT}</a>
      </td>
    </tr>
  </table>`;
}

function contactsBlockText() {
  const lines = ACADEMY_CONTACTS.founders.map(
    (f) => `${f.name} (${f.role}): ${f.email}`
  );
  lines.push(`Academy inbox: ${CONTACT}`);
  return `\nAcademy contacts\n${lines.join('\n')}\n`;
}

/**
 * Apple + Android/Google calendar buttons + dual QR codes.
 * @param {ReturnType<typeof resolveCourse>} course
 */
function calendarAndQrBlockHtml(course) {
  if (!course || !course.startDate) {
    // Still show contact QR even without a dated event
    const vcard = academyVcardUrl();
    const contactQr = qrImageUrl(vcard, 132);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid rgba(28,25,21,0.12);border-radius:10px;background:#fff;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8841c;font-weight:600;">Save our contact</p>
        <p style="margin:0 0 12px;font-size:14px;color:#3a342c;">Scan to save Thames Wellness Academy (and founder emails) to your phone.</p>
        <img src="${escapeHtml(contactQr)}" width="132" height="132" alt="QR code to save Academy contact" style="display:block;border:0;border-radius:8px;">
        <p style="margin:10px 0 0;font-size:12px;"><a href="${escapeHtml(vcard)}" style="color:#4a5a45;">Download contact card (.vcf)</a></p>
      </td></tr>
    </table>`;
  }

  const ics = icsDownloadUrl({
    slug: course.slug,
    startDate: course.startDate,
    title: course.title
  });
  const apple = appleCalendarUrl(ics);
  const google = googleCalendarUrl({
    title: course.title,
    startDate: course.startDate,
    endDate: course.endDate || course.startDate,
    startTime: course.startTime,
    endTime: course.endTime,
    description: `${course.summary}\n${course.url}`,
    location: course.locationLabel || course.venue,
    url: course.url
  });
  const vcard = academyVcardUrl();
  const contactQr = qrImageUrl(vcard, 120);
  const calendarQr = qrImageUrl(ics, 120);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid rgba(28,25,21,0.12);border-radius:10px;background:#fff;overflow:hidden;">
    <tr>
      <td style="padding:16px 18px;border-bottom:1px solid rgba(28,25,21,0.08);">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8841c;font-weight:600;">Add to your calendar</p>
        <p style="margin:0 0 14px;font-size:14px;color:#3a342c;">Starts ${escapeHtml(course.startDate)}${course.startTime ? ` · ${escapeHtml(course.startTime)}` : ''} (UK time).</p>
        <a href="${escapeHtml(apple)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border:1px solid rgba(28,25,21,0.18);border-radius:8px;text-decoration:none;color:#1c1915;font-weight:700;font-size:13px;background:#f4efe6;">Apple Calendar</a>
        <a href="${escapeHtml(google)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border:1px solid rgba(28,25,21,0.18);border-radius:8px;text-decoration:none;color:#1c1915;font-weight:700;font-size:13px;background:#f4efe6;">Google / Android</a>
        <a href="${escapeHtml(ics)}" style="display:inline-block;margin:0 0 8px 0;padding:10px 14px;border:1px solid rgba(28,25,21,0.18);border-radius:8px;text-decoration:none;color:#1c1915;font-weight:700;font-size:13px;background:#f4efe6;">Download .ics</a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8841c;font-weight:600;">Scan with your phone</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" valign="top" style="padding-right:8px;text-align:center;">
              <img src="${escapeHtml(contactQr)}" width="120" height="120" alt="QR code to save Academy contact" style="display:block;margin:0 auto 8px;border:0;border-radius:8px;">
              <p style="margin:0;font-size:12px;color:#3a342c;font-weight:600;">Save contact</p>
              <p style="margin:4px 0 0;font-size:11px;color:#6b6358;">Academy address &amp; emails</p>
            </td>
            <td width="50%" valign="top" style="padding-left:8px;text-align:center;">
              <img src="${escapeHtml(calendarQr)}" width="120" height="120" alt="QR code to add course to calendar" style="display:block;margin:0 auto 8px;border:0;border-radius:8px;">
              <p style="margin:0;font-size:12px;color:#3a342c;font-weight:600;">Add event</p>
              <p style="margin:4px 0 0;font-size:11px;color:#6b6358;">Open calendar file</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function calendarAndQrBlockText(course) {
  if (!course) return '';
  const vcard = academyVcardUrl();
  if (!course.startDate) {
    return `\nSave contact card: ${vcard}\n`;
  }
  const ics = icsDownloadUrl({
    slug: course.slug,
    startDate: course.startDate,
    title: course.title
  });
  const google = googleCalendarUrl({
    title: course.title,
    startDate: course.startDate,
    endDate: course.endDate || course.startDate,
    startTime: course.startTime,
    endTime: course.endTime,
    description: course.summary,
    location: course.venue,
    url: course.url
  });
  return `\nAdd to calendar (Apple / .ics): ${ics}\nGoogle / Android: ${google}\nSave contact: ${vcard}\n`;
}

/**
 * @param {Record<string, unknown>} lead
 */
function courseFromLead(lead) {
  return resolveCourse(lead.slug || lead.courseSlug || '', {
    courseTitle: lead.courseTitle || lead.topic || '',
    courseStartDate: lead.courseStartDate || '',
    venue: lead.venue || ''
  });
}

/**
 * Echo of the visitor's submitted fields (copy for their inbox).
 * @param {Record<string, string>} lead
 */
function submissionEchoHtml(lead) {
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Topic', lead.topic || lead.courseTitle],
    ['Phone', lead.phone],
    ['Courses of interest', lead.courses],
    ['Message', lead.message]
  ].filter(([, v]) => v && String(v).trim());

  if (!rows.length) return '';

  const items = rows
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;color:#5c564c;font-size:13px;width:38%;">${escapeHtml(k)}</td>
          <td style="padding:8px 0;vertical-align:top;color:#1c1915;font-size:14px;white-space:pre-wrap;">${escapeHtml(v)}</td>
        </tr>`
    )
    .join('');

  return `<div style="margin:0 0 20px;padding:16px 18px;background:#fff;border:1px solid rgba(28,25,21,0.1);border-radius:10px;">
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#8a8174;">What you sent us</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
    </div>`;
}

/**
 * @param {Record<string, string>} lead
 */
function submissionEchoText(lead) {
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Topic', lead.topic || lead.courseTitle],
    ['Phone', lead.phone],
    ['Courses of interest', lead.courses],
    ['Message', lead.message]
  ].filter(([, v]) => v && String(v).trim());
  if (!rows.length) return '';
  return `\nWhat you sent us\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`;
}

/**
 * Visitor confirmation after a website form submit.
 */
export function visitorEnquiryEmail(lead) {
  const first = (lead.name || 'there').split(' ')[0];
  const interest = interestLabel(lead);
  const isJournal = !!lead.isJournal;
  const course = !isJournal ? courseFromLead(lead) : null;
  const hasCoursePage = !!(course && course.slug);

  const subject = isJournal
    ? 'You are on the Thames Wellness Academy journal list'
    : hasCoursePage
      ? `We have received your enquiry · ${course.title}`
      : 'We have received your enquiry | Thames Wellness Academy';

  let bodyHtml;
  let text;

  if (isJournal) {
    bodyHtml = `<p style="margin:0 0 16px;">Hello ${escapeHtml(first)},</p>
       <p style="margin:0 0 16px;">Thank you for subscribing to Journal updates from Thames Wellness Academy. We will send occasional articles and programme notes to this address.</p>
       ${submissionEchoHtml(lead)}
       ${contactsBlockHtml()}
       ${calendarAndQrBlockHtml(null)}
       <p style="margin:16px 0 0;">If you did not mean to subscribe, email <a href="mailto:${CONTACT}" style="color:#4a5a45;">${CONTACT}</a>.</p>`;
    text = `Hello ${first},\n\nThank you for subscribing to Journal updates.\n${submissionEchoText(lead)}${contactsBlockText()}\nSave contact: ${academyVcardUrl()}\n`;
  } else {
    bodyHtml = `<p style="margin:0 0 16px;">Hello ${escapeHtml(first)},</p>
       <p style="margin:0 0 16px;">Thank you for contacting Thames Wellness Academy. We have received your message about <strong style="color:#1c1915;">${escapeHtml(interest)}</strong>.</p>
       <p style="margin:0 0 16px;">A member of the team will review your enquiry and reply within two working days. A copy of what you submitted is below.</p>
       ${submissionEchoHtml(lead)}
       ${hasCoursePage ? courseBlockHtml(course) : ''}
       ${contactsBlockHtml()}
       ${calendarAndQrBlockHtml(hasCoursePage ? course : null)}
       <p style="margin:16px 0 0;">Warm regards,<br>Katia Major and Raili Maripuu<br>Co-founders, Thames Wellness Academy</p>`;
    text = `Hello ${first},\n\nThank you for contacting Thames Wellness Academy about ${interest}.\nWe will reply within two working days.\n${submissionEchoText(lead)}${hasCoursePage ? courseBlockText(course) : ''}${contactsBlockText()}${hasCoursePage ? calendarAndQrBlockText(course) : `\nSave contact: ${academyVcardUrl()}\n`}\nKatia Major and Raili Maripuu\nCo-founders\n`;
  }

  return {
    subject,
    html: wrapBrandedEmail({
      title: subject,
      preheader: isJournal
        ? 'You are subscribed to Academy journal updates.'
        : 'Course details, contacts, and calendar links inside.',
      bodyHtml
    }),
    text
  };
}

/**
 * Staff alert to Raili and Katia after a form submit.
 */
export function staffLeadAlertEmail(lead) {
  const subject = `New website lead: ${lead.name || lead.email || 'Visitor'} · ${interestLabel(lead)}`;
  const course = courseFromLead(lead);
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Interest / topic', lead.topic || lead.courseTitle],
    ['Course slug', lead.slug],
    ['Course URL', course && course.slug ? course.url : ''],
    ['Source form', lead.source],
    ['Page', lead.page],
    ['Message', lead.message]
  ].filter(([, v]) => v);

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid rgba(28,25,21,0.08);font-size:13px;color:#6b6358;width:34%;">${escapeHtml(k)}</td><td style="padding:8px 10px;border-bottom:1px solid rgba(28,25,21,0.08);font-size:14px;color:#1c1915;">${escapeHtml(v)}</td></tr>`
    )
    .join('');

  const bodyHtml = `<p style="margin:0 0 16px;">A new submission arrived from the Academy website. The visitor has been sent a branded confirmation with course link, founder contacts, and calendar options where a date is known.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(28,25,21,0.1);border-radius:8px;background:#fff;overflow:hidden;">${tableRows}</table>`;

  const text = `New website lead\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`;

  return {
    subject,
    html: wrapBrandedEmail({
      title: subject,
      preheader: 'New lead from thameswellnessacademy.co.uk',
      bodyHtml
    }),
    text
  };
}

/**
 * Payment confirmation to participant (Status = Paid).
 */
export function visitorPaymentEmail(lead) {
  const first = (lead.name || 'there').split(' ')[0];
  const course = courseFromLead(lead);
  const subject = `Payment received · ${course.title} | Thames Wellness Academy`;
  const bodyHtml = `<p style="margin:0 0 16px;">Hello ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;">Thank you. We have recorded your payment. Your place is held with Thames Wellness Academy.</p>
    ${courseBlockHtml(course)}
    ${contactsBlockHtml()}
    ${calendarAndQrBlockHtml(course)}
    <p style="margin:16px 0 0;">We will send short reminders before the course begins.</p>
    <p style="margin:16px 0 0;">Warm regards,<br>Katia Major and Raili Maripuu<br>Co-founders, Thames Wellness Academy</p>`;
  const text = `Hello ${first},\n\nThank you. Payment recorded. Your place is held.\n${courseBlockText(course)}${contactsBlockText()}${calendarAndQrBlockText(course)}\n`;
  return {
    subject,
    html: wrapBrandedEmail({
      title: subject,
      preheader: 'Your place is held. Course link and calendar inside.',
      bodyHtml
    }),
    text
  };
}

/**
 * Course reminder (−14 / −7 / −3 days).
 */
export function visitorReminderEmail(lead) {
  const first = (lead.name || 'there').split(' ')[0];
  const course = courseFromLead({
    ...lead,
    courseStartDate: lead.courseStartDate,
    venue: lead.venue
  });
  const days = lead.daysBefore;

  const subject =
    days === 14
      ? `Two weeks to go · ${course.title}`
      : days === 7
        ? `One week to go · ${course.title}`
        : `Three days to go · ${course.title}`;

  const opener =
    days === 14
      ? 'Your course begins in 14 days.'
      : days === 7
        ? 'Your course begins in 7 days.'
        : 'Your course begins in 3 days.';

  const bodyHtml = `<p style="margin:0 0 16px;">Hello ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;">${escapeHtml(opener)} This is a friendly reminder from Thames Wellness Academy.</p>
    ${courseBlockHtml(course)}
    ${contactsBlockHtml()}
    ${calendarAndQrBlockHtml(course)}
    <p style="margin:16px 0 0;">Please arrive ready to practise and bring any notes from your joining pack.</p>
    <p style="margin:16px 0 0;">Warm regards,<br>Katia Major and Raili Maripuu<br>Co-founders</p>`;

  const text = `Hello ${first},\n\n${opener}\n${courseBlockText(course)}${contactsBlockText()}${calendarAndQrBlockText(course)}\n`;

  return {
    subject,
    html: wrapBrandedEmail({
      title: subject,
      preheader: opener,
      bodyHtml
    }),
    text
  };
}

export const STAFF_NOTIFY_TO = [
  'raili.maripuu@thameswellness.com',
  'Katia.major@thameswellness.com'
];

export const CONTACT_EMAIL = CONTACT;
