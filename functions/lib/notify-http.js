/**
 * Shared HTTP helpers for /api/notify/* endpoints.
 * v1 policy: capture as much useful context as possible; trim noise later.
 */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export function isSameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }
  // Allow non-browser form POSTs without Origin (rare); still require POST body checks
  return true;
}

/**
 * Soft per-IP rate limit (abuse only). Limits are intentionally high for v1.
 * @param {Request} request
 * @param {string} bucket
 * @param {number} limit
 * @param {number} windowSeconds
 */
export async function rateLimit(request, bucket, limit, windowSeconds) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const keyUrl = `https://twa-rate-limit.internal/${bucket}/${ip}/${windowId}`;
  try {
    const cache = caches.default;
    const hit = await cache.match(keyUrl);
    let count = 0;
    if (hit) {
      count = Number(await hit.text()) || 0;
    }
    count += 1;
    const res = new Response(String(count), {
      headers: {
        'Cache-Control': `max-age=${windowSeconds}`,
        'Content-Type': 'text/plain'
      }
    });
    await cache.put(keyUrl, res);
    return { allowed: count <= limit, count, ip };
  } catch {
    return { allowed: true, count: 0, ip };
  }
}

/**
 * Parse JSON or form-urlencoded body into a plain object.
 * @param {Request} request
 */
export async function parseBody(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await request.formData();
    /** @type {Record<string, string>} */
    const out = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  }
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/** Known AI / search / preview crawler patterns (UA substring match). */
const BOT_PATTERNS = [
  { name: 'GPTBot', re: /GPTBot|ChatGPT-User|OAI-SearchBot/i },
  { name: 'ClaudeBot', re: /ClaudeBot|anthropic-ai|Claude-Web/i },
  { name: 'PerplexityBot', re: /PerplexityBot|Perplexity/i },
  { name: 'Google-Extended', re: /Google-Extended|GoogleOther/i },
  { name: 'Googlebot', re: /Googlebot/i },
  { name: 'Bingbot', re: /bingbot|BingPreview/i },
  { name: 'Bytespider', re: /Bytespider/i },
  { name: 'CCBot', re: /CCBot/i },
  { name: 'Applebot', re: /Applebot/i },
  { name: 'Amazonbot', re: /Amazonbot/i },
  { name: 'meta-externalagent', re: /meta-externalagent|FacebookBot|facebookexternalhit/i },
  { name: 'LinkedInBot', re: /LinkedInBot/i },
  { name: 'Twitterbot', re: /Twitterbot/i },
  { name: 'Slackbot', re: /Slackbot|Slack-ImgProxy/i },
  { name: 'Discordbot', re: /Discordbot/i },
  { name: 'WhatsApp', re: /WhatsApp/i },
  { name: 'DuckDuckBot', re: /DuckDuckBot/i },
  { name: 'Yandex', re: /YandexBot|Yandex/i },
  { name: 'SemrushBot', re: /SemrushBot|AhrefsBot|DotBot|MJ12bot|PetalBot/i },
  { name: 'generic-bot', re: /\bbot\b|\bcrawler\b|\bspider\b|HeadlessChrome|puppeteer|playwright/i }
];

/**
 * @param {string} userAgent
 * @returns {{ kind: 'bot' | 'human_guess', botName: string, matched: string }}
 */
export function classifyVisitor(userAgent) {
  const ua = String(userAgent || '');
  for (const pattern of BOT_PATTERNS) {
    if (pattern.re.test(ua)) {
      return { kind: 'bot', botName: pattern.name, matched: pattern.name };
    }
  }
  if (!ua) {
    return { kind: 'bot', botName: 'empty-ua', matched: 'empty-ua' };
  }
  return { kind: 'human_guess', botName: '', matched: '' };
}

/**
 * Rich request context for Discord embeds (no cookies / tokens).
 * @param {Request} request
 * @param {Record<string, unknown>} [body]
 */
export function clientMeta(request, body = {}) {
  const url = new URL(request.url);
  const ua = request.headers.get('User-Agent') || '';
  const visitor = classifyVisitor(ua);
  const bodyReferrer = String(body.referrer || body.referer || '').trim();
  const headerReferrer = request.headers.get('Referer') || '';
  const pageUrl = String(body.page || body.pageUrl || body.url || '').trim();
  let pagePath = String(body.path || body.pathname || '').trim();
  let pageHost = '';
  if (pageUrl) {
    try {
      const parsed = new URL(pageUrl, url.origin);
      pagePath = pagePath || parsed.pathname + parsed.search + parsed.hash;
      pageHost = parsed.hostname;
    } catch {
      /* keep raw */
    }
  }

  return {
    requestPath: url.pathname,
    host: url.hostname,
    pageUrl: pageUrl || `${url.origin}${pagePath || ''}`,
    pagePath: pagePath || url.pathname,
    pageHost: pageHost || url.hostname,
    referrer: bodyReferrer || headerReferrer,
    headerReferrer,
    origin: request.headers.get('Origin') || '',
    ip:
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      '',
    country: request.headers.get('CF-IPCountry') || '',
    colo: request.cf && request.cf.colo ? String(request.cf.colo) : '',
    ray: request.headers.get('CF-Ray') || '',
    acceptLanguage: (request.headers.get('Accept-Language') || '').slice(0, 120),
    ua: ua.slice(0, 350),
    visitorKind: visitor.kind,
    botName: visitor.botName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Turn meta + optional extras into Discord embed fields (verbose v1).
 * Reserves room for core request context even when extras are long.
 * @param {ReturnType<typeof clientMeta>} meta
 * @param {Array<{ name: string, value: string, inline?: boolean }>} [extra]
 */
export function contextFields(meta, extra = []) {
  /** @type {Array<{ name: string, value: string, inline?: boolean }>} */
  const core = [];
  const pushCore = (name, value, inline = false) => {
    const v = String(value == null ? '' : value).trim();
    if (!v) return;
    core.push({ name, value: v.slice(0, 1024), inline });
  };

  pushCore('Page URL', meta.pageUrl, false);
  pushCore('Path', meta.pagePath, true);
  pushCore('Referrer', meta.referrer || '(none)', false);
  pushCore(
    'Visitor',
    meta.visitorKind === 'bot' ? `bot (${meta.botName || 'unknown'})` : 'human (guess)',
    true
  );
  pushCore('Country', meta.country || '(unknown)', true);
  pushCore('IP', meta.ip || '(unknown)', true);
  pushCore('CF colo', meta.colo, true);
  pushCore('CF-Ray', meta.ray, true);
  pushCore('Host', meta.host, true);
  pushCore('Accept-Language', meta.acceptLanguage, false);
  pushCore('User-Agent', meta.ua || '(empty)', false);
  pushCore('Timestamp', meta.timestamp, true);
  if (meta.origin) pushCore('Origin', meta.origin, true);
  if (meta.headerReferrer && meta.headerReferrer !== meta.referrer) {
    pushCore('Header Referer', meta.headerReferrer, false);
  }

  const reserve = Math.min(core.length, 12);
  const extraRoom = Math.max(0, 25 - reserve);
  const extras = (extra || [])
    .filter((f) => f && f.name && String(f.value || '').trim())
    .slice(0, extraRoom)
    .map((f) => ({
      name: String(f.name).slice(0, 256),
      value: String(f.value).slice(0, 1024),
      inline: !!f.inline
    }));

  return [...extras, ...core].slice(0, 25);
}

export { BOT_PATTERNS };
