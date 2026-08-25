import { uploadAsset } from '../lib/shadow-store.js';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function estimateBytesFromBase64(b64) {
  if (!b64) return 0;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const required = ['ticketId', 'uploadedBy', 'filename', 'mimeType', 'dataBase64', 'locationId'];
  for (const key of required) {
    if (!body[key]) return json({ error: `${key} is required` }, 400);
  }

  if (!ALLOWED_MIME.has(body.mimeType)) {
    return json({ error: 'Unsupported image type. Use JPEG, PNG, WebP or GIF.' }, 400);
  }

  const size = estimateBytesFromBase64(body.dataBase64);
  if (size > MAX_BYTES) {
    return json({ error: 'Image too large. Maximum size is 8 MB.' }, 400);
  }

  try {
    const result = await uploadAsset(context.env, body);
    if (!result.ok) {
      return json({ ok: false, error: result.error || 'Upload failed', detail: result }, 502);
    }
    return json({ ok: true, ...result });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) }, 500);
  }
}
