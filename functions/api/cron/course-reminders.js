/**
 * GET|POST /api/cron/course-reminders
 * Daily automation: send 14 / 7 / 3 day reminders for Paid leads.
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  ?secret=<CRON_SECRET>
 *
 * Schedule externally (Cloudflare Cron Trigger / cron-job.org) for ~08:00 Europe/London.
 */

import { sendEmail, DEFAULT_FROM } from '../../lib/resend.js';
import { visitorReminderEmail, CONTACT_EMAIL } from '../../lib/email-templates.js';
import { listDueReminders, markReminderSent } from '../../lib/course-sheet.js';
import { json } from '../../lib/notify-http.js';

function authorised(request, env) {
  const secret = env && env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('Authorization') || '';
  if (auth === `Bearer ${secret}`) return true;
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('secret') === secret) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Today YYYY-MM-DD in Europe/London */
function todayLondon() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function run(context) {
  const { request, env } = context;
  if (!authorised(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const today = todayLondon();
  const listed = await listDueReminders(env, { today });
  if (listed.skipped) {
    return json({ ok: false, error: listed.reason, today }, 503);
  }
  if (!listed.ok) {
    return json({ ok: false, error: 'Sheet list failed', detail: listed, today }, 502);
  }

  const due = (listed.data && listed.data.due) || [];
  /** @type {object[]} */
  const sent = [];
  /** @type {object[]} */
  const errors = [];

  for (const lead of due) {
    const daysBefore = Number(lead.daysBefore);
    if (![14, 7, 3].includes(daysBefore)) continue;
    if (!lead.email) {
      errors.push({ lead, error: 'missing email' });
      continue;
    }

    const tpl = visitorReminderEmail({
      name: lead.name,
      courseTitle: lead.courseTitle,
      courseStartDate: lead.courseStartDate,
      venue: lead.venue || '',
      daysBefore: /** @type {14|7|3} */ (daysBefore)
    });

    const mail = await sendEmail(env, {
      from: DEFAULT_FROM,
      to: lead.email,
      replyTo: CONTACT_EMAIL,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text
    });

    if (!mail.ok) {
      errors.push({ email: lead.email, daysBefore, mail });
      continue;
    }

    const marked = await markReminderSent(env, {
      email: lead.email,
      courseSlug: lead.courseSlug || '',
      reminder: String(daysBefore)
    });
    sent.push({
      email: lead.email,
      daysBefore,
      messageId: mail.id,
      marked: !!(marked && marked.ok)
    });
  }

  return json({
    ok: true,
    today,
    dueCount: due.length,
    sent,
    errors
  });
}

export async function onRequestGet(context) {
  return run(context);
}

export async function onRequestPost(context) {
  return run(context);
}
