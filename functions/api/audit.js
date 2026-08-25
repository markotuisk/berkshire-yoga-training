import { exportAudit, syncAllToSheets } from '../lib/shadow-store.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestGet(context) {
  const data = await exportAudit(context.env);
  return json(data);
}

/** POST /api/audit — push full KV export to Google Sheets (action: sync). */
export async function onRequestPost(context) {
  const result = await syncAllToSheets(context.env);
  if (result.skipped) {
    return json(
      {
        ok: false,
        error: 'SHEETS_WEBHOOK_URL is not set on this Pages project',
        hint: 'Create the Sheet + Apps Script, then: npx wrangler pages secret put SHEETS_WEBHOOK_URL --project-name=berkshire-yoga-training-shadow'
      },
      503
    );
  }
  if (!result.ok) {
    return json({ ok: false, result }, 502);
  }
  return json({ ok: true, result });
}
