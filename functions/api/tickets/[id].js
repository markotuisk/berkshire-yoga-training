import { getTicket, updateTicketStatus } from '../../lib/shadow-store.js';

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
  const id = context.params.id;
  const result = await getTicket(context.env, id);
  if (!result) return json({ error: 'Ticket not found' }, 404);
  return json(result);
}

export async function onRequestPatch(context) {
  const id = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.status || !body.actor) {
    return json({ error: 'status and actor are required' }, 400);
  }
  const ticket = await updateTicketStatus(context.env, id, body);
  if (!ticket) return json({ error: 'Ticket not found' }, 404);
  return json({ ticket });
}
