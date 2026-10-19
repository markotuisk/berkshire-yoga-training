/**
 * POST /api/course/mark-paid
 * Mark a lead as Paid in the course Sheet and send branded payment email.
 * Auth: Authorization: Bearer <COURSE_SHEETS_SECRET>  or body.secret
 *
 * Body: { email, courseSlug?, courseTitle?, courseStartDate?, name?, notes? }
 */

import { sendEmail, DEFAULT_FROM } from '../../lib/resend.js';
import { visitorPaymentEmail, CONTACT_EMAIL } from '../../lib/email-templates.js';
import { markPaid } from '../../lib/course-sheet.js';
import { json, parseBody } from '../../lib/notify-http.js';

function authorised(request, env, body) {
  const secret = env && env.COURSE_SHEETS_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('Authorization') || '';
  if (auth === `Bearer ${secret}`) return true;
  if (body && body.secret === secret) return true;
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await parseBody(request);
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  if (!authorised(request, env, body)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  if (!email) {
    return json({ error: 'email required' }, 400);
  }

  const sheet = await markPaid(env, {
    email,
    courseSlug: body.courseSlug || body.slug || '',
    courseTitle: body.courseTitle || '',
    courseStartDate: body.courseStartDate || '',
    notes: body.notes || '',
    paidAt: new Date().toISOString()
  });

  if (sheet.skipped) {
    return json({ ok: false, error: sheet.reason }, 503);
  }
  if (!sheet.ok) {
    return json({ ok: false, error: 'Sheet mark_paid failed', detail: sheet }, 502);
  }

  const lead = (sheet.data && sheet.data.lead) || {};
  const name = body.name || lead.name || '';
  const courseTitle = body.courseTitle || lead.courseTitle || '';
  const courseStartDate = body.courseStartDate || lead.courseStartDate || '';

  const tpl = visitorPaymentEmail({ name, courseTitle, courseStartDate });
  const mail = await sendEmail(env, {
    from: DEFAULT_FROM,
    to: email,
    replyTo: CONTACT_EMAIL,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });

  return json({
    ok: true,
    sheet,
    email: mail
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
