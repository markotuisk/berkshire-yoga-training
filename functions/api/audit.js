import { exportAudit } from '../lib/shadow-store.js';

export async function onRequestGet(context) {
  const data = await exportAudit(context.env);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
