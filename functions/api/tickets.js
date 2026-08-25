import { listTickets, createTicket } from '../lib/shadow-store.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const author = url.searchParams.get('author') || '';
  const tickets = await listTickets(context.env, { author: author || undefined });
  return json({ tickets });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.createdBy || !body.summary) {
    return json({ error: 'createdBy and summary are required' }, 400);
  }
  const ticket = await createTicket(context.env, body);
  return json({ ticket }, 201);
}
