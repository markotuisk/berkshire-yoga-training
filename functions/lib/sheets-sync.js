/**
 * Dual-write shadow tickets to Google Sheets via Apps Script web app.
 * Set Pages secret SHEETS_WEBHOOK_URL to the deployed script URL.
 * Failures are logged and never block the ticket API.
 */

export async function pushToSheets(env, payload) {
  const url = env && env.SHEETS_WEBHOOK_URL;
  if (!url) return { skipped: true, reason: 'SHEETS_WEBHOOK_URL not set' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 200) };
    }
    if (!res.ok) {
      console.error('Sheets sync HTTP', res.status, data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error('Sheets sync failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
