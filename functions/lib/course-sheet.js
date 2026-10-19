/**
 * Course leads Google Sheet via Apps Script web app.
 * Secrets: COURSE_SHEETS_WEBHOOK_URL, COURSE_SHEETS_SECRET
 */

/**
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, unknown>} payload
 */
export async function courseSheetRequest(env, payload) {
  const url = env && env.COURSE_SHEETS_WEBHOOK_URL;
  if (!url) {
    return { skipped: true, reason: 'COURSE_SHEETS_WEBHOOK_URL not set' };
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
