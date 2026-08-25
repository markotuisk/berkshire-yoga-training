import { addComment } from '../../../lib/shadow-store.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  const id = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.author || !body.message) {
    return json({ error: 'author and message are required' }, 400);
  }
  const result = await addComment(context.env, id, body);
  if (!result) return json({ error: 'Ticket not found' }, 404);
  return json(result, 201);
}
