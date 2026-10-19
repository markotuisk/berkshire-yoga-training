/**
 * Thin Resend HTTP client for Pages Functions.
 * Secret: RESEND_API_KEY
 */

export const DEFAULT_FROM = 'Thames Wellness Academy <noreply@thameswellnessacademy.co.uk>';

/**
 * @param {Record<string, string|undefined>} env
 * @param {{
 *   from?: string,
 *   to: string|string[],
 *   subject: string,
 *   html?: string,
 *   text?: string,
 *   replyTo?: string|string[]
 * }} opts
 */
export async function sendEmail(env, opts) {
  const key = env && env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, skipped: true, reason: 'RESEND_API_KEY not set' };
  }

  const to = Array.isArray(opts.to) ? opts.to.filter(Boolean) : [opts.to].filter(Boolean);
  if (!to.length) {
    return { ok: false, skipped: true, reason: 'no recipients' };
  }

  const body = {
    from: opts.from || DEFAULT_FROM,
    to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text
  };
  if (opts.replyTo) {
    body.reply_to = opts.replyTo;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
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
      console.error('Resend send failed', res.status, data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, id: data && data.id, data };
  } catch (err) {
    console.error('Resend send error', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
