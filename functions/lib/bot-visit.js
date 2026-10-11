/**
 * Log AI / crawler HTML visits to Discord #twa-bots.
 * Fire-and-forget via waitUntil from middleware. No secrets in code.
 */

import { postDiscordEmbed, truncate } from './discord.js';
import { classifyVisitor } from './notify-http.js';

const STATIC_ASSET =
  /\.(css|js|mjs|md|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|webmanifest|pdf|map|txt|xml)$/i;

/**
 * @param {import('@cloudflare/workers-types').EventContext<any, any, any> | { request: Request, env: any, waitUntil: (p: Promise<any>) => void }} context
 */
export function maybeNotifyBotVisit(context) {
  const { request, env, waitUntil } = context;
  if (!env || !env.DISCORD_WEBHOOK_BOTS) return;
  if (!['GET', 'HEAD'].includes(request.method)) return;

  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname.startsWith('/api/')) return;
  if (pathname.startsWith('/.well-known/')) return;
  if (STATIC_ASSET.test(pathname)) return;

  const ua = request.headers.get('User-Agent') || '';
  const visitor = classifyVisitor(ua);
  if (visitor.kind !== 'bot') return;

  // Skip our own Discord unfurl bot to avoid loops / noise
  if (visitor.botName === 'Discordbot') return;

  const task = postDiscordEmbed(env, 'bots', {
    title: `Bot visit · ${visitor.botName || 'unknown'}`,
    description: `Crawler or AI agent fetched \`${pathname}\`.`,
    fields: [
      { name: 'Bot', value: visitor.botName || 'unknown', inline: true },
      { name: 'Method', value: request.method, inline: true },
      { name: 'Path', value: pathname + url.search, inline: false },
      { name: 'Full URL', value: url.href, inline: false },
      {
        name: 'Referrer',
        value: request.headers.get('Referer') || '(none)',
        inline: false
      },
      {
        name: 'Accept',
        value: truncate(request.headers.get('Accept') || '', 500) || '(none)',
        inline: false
      },
      {
        name: 'Accept-Language',
        value: truncate(request.headers.get('Accept-Language') || '', 200) || '(none)',
        inline: true
      },
      {
        name: 'Country',
        value: request.headers.get('CF-IPCountry') || '(unknown)',
        inline: true
      },
      {
        name: 'IP',
        value:
          request.headers.get('CF-Connecting-IP') ||
          request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
          '(unknown)',
        inline: true
      },
      {
        name: 'CF-Ray',
        value: request.headers.get('CF-Ray') || '(none)',
        inline: true
      },
      {
        name: 'CF colo',
        value: request.cf && request.cf.colo ? String(request.cf.colo) : '(none)',
        inline: true
      },
      {
        name: 'User-Agent',
        value: truncate(ua, 1000) || '(empty)',
        inline: false
      }
    ],
    footer: `TWA bots · ${url.hostname}`,
    url: url.href
  }).catch(() => {});

  if (typeof waitUntil === 'function') {
    waitUntil(task);
  }
}
