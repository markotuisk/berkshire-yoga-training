/**
 * POST /api/notify/event
 * Visitor activity beacons → Discord #twa-activity (+ course channels when relevant).
 * v1: verbose payloads; do not strip fields aggressively.
 */

import {
  cleanText,
  courseChannelForSlug,
  inferCourseSlug,
  postDiscordEmbed
} from '../../lib/discord.js';
import {
  clientMeta,
  contextFields,
  isSameOrigin,
  json,
  parseBody,
  rateLimit
} from '../../lib/notify-http.js';

const ALLOWED_TYPES = new Set([
  'cta',
  'contact_nav',
  'mailto',
  'whatsapp',
  'callback',
  'faq',
  'apply',
  'course_cta',
  'form_focus',
  'form_start',
  'nav',
  'page_engage',
  'header_cta',
  'visit'
]);

const ACADEMY_MAIL_RE =
  /(?:info@thameswellnessacademy\.co\.uk|info@berkshireyogatraining\.co\.uk)/i;
const WHATSAPP_RE = /(?:wa\.me\/|api\.whatsapp\.com\/|whatsapp\.com\/send)/i;

/**
 * Lead-intent beacons dual-post to #twa-leads (founders) as well as activity.
 * @param {string} type
 * @param {Record<string, string>} parts
 */
function isLeadIntentEvent(type, parts) {
  if (type === 'whatsapp' || type === 'callback') return true;
  if (parts.leadIntent === '1' || parts.leadIntent === 'true') return true;
  if (parts.intent === 'callback' || parts.intent === 'whatsapp' || parts.intent === 'academy_email') {
    return true;
  }
  if (parts.intent === 'form_mailto_fallback') return true;
  if (type === 'mailto' && ACADEMY_MAIL_RE.test(`${parts.href} ${parts.mailtoTo}`)) return true;
  if (type === 'mailto' && /callback/i.test(`${parts.mailtoSubject} ${parts.label} ${parts.href}`)) {
    return true;
  }
  if (ctaIsLeadContact(parts.ctaId) && (type === 'mailto' || type === 'contact_nav' || type === 'callback')) {
    return true;
  }
  if (WHATSAPP_RE.test(parts.href)) return true;
  return false;
}

function ctaIsLeadContact(ctaId) {
  return /^(contact-email|contact-chat|contact-call)$/i.test(String(ctaId || ''));
}

/**
 * @param {string} type
 * @param {Record<string, string>} parts
 */
function activityTitle(type, parts) {
  if (type === 'faq') return `FAQ opened: ${parts.faq || parts.label}`;
  if (type === 'callback') return `Callback request: ${parts.label || 'contact'}`;
  if (type === 'whatsapp') return `WhatsApp intent: ${parts.label}`;
  if (type === 'mailto') return `Email intent: ${parts.label}`;
  if (type === 'visit') return `Visit: ${parts.pagePath || parts.label}`;
  return `Activity: ${parts.label}`;
}

/**
 * @param {string} type
 * @param {Record<string, string>} parts
 */
function leadsTitle(type, parts) {
  if (type === 'callback' || parts.intent === 'callback' || /callback/i.test(parts.mailtoSubject)) {
    return 'Callback request';
  }
  if (type === 'whatsapp' || parts.intent === 'whatsapp') {
    return `WhatsApp engagement: ${parts.label || 'click'}`;
  }
  if (parts.intent === 'form_mailto_fallback') {
    return `Email backup (form fallback): ${parts.label || 'enquiry'}`;
  }
  if (type === 'mailto' || parts.intent === 'academy_email') {
    return `Email engagement: ${parts.mailtoSubject || parts.label || 'Academy inbox'}`;
  }
  if (ctaIsLeadContact(parts.ctaId)) {
    return `Contact intent: ${parts.ctaId}`;
  }
  return `Lead engagement: ${parts.label || type}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!isSameOrigin(request)) {
    return json({ error: 'Forbidden origin' }, 403);
  }

  // High ceiling: protect against runaway loops, not normal browsing
  const limit = await rateLimit(request, 'event', 120, 60);
  if (!limit.allowed) {
    return json({ ok: true, ignored: true, reason: 'rate_limited' });
  }

  let body;
  try {
    body = await parseBody(request);
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const type = cleanText(body.type || body.event || 'cta', 40).toLowerCase();
  if (!ALLOWED_TYPES.has(type)) {
    return json({ error: 'Unsupported event type', type }, 400);
  }

  const label = cleanText(body.label || body.cta || body.id || type, 200);
  const ctaId = cleanText(body.ctaId || body.cta || body.id || '', 120);
  const href = cleanText(body.href || '', 500);
  const page = cleanText(body.page || body.path || '', 500);
  const faq = cleanText(body.faq || body.question || '', 300);
  const faqSection = cleanText(body.faqSection || body.section || '', 200);
  const navItem = cleanText(body.nav || body.navItem || body.navLabel || '', 200);
  const elementText = cleanText(body.text || body.elementText || '', 300);
  const elementTag = cleanText(body.tag || body.elementTag || '', 40);
  const viewport = cleanText(body.viewport || '', 80);
  const sessionId = cleanText(body.sessionId || body.session || '', 80);
  const mailtoTo = cleanText(body.mailtoTo || '', 200);
  const mailtoSubject = cleanText(body.mailtoSubject || '', 300);
  const intent = cleanText(body.intent || '', 80).toLowerCase();
  const leadIntentFlag = cleanText(body.leadIntent || '', 20).toLowerCase();
  const fallbackReason = cleanText(body.fallbackReason || '', 200);
  let slug = cleanText(body.slug || body.course || '', 80)
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!slug) slug = inferCourseSlug(`${label} ${href} ${page} ${faq} ${elementText}`);
  if ((type === 'callback' || intent === 'callback') && !slug) slug = 'callback';

  const meta = clientMeta(request, body);
  const parts = {
    label,
    ctaId,
    href,
    faq,
    mailtoTo,
    mailtoSubject,
    intent,
    leadIntent: leadIntentFlag,
    pagePath: meta.pagePath
  };

  /** @type {Array<{ name: string, value: string, inline?: boolean }>} */
  const extras = [
    { name: 'Event type', value: type, inline: true },
    { name: 'Label', value: label || '(none)', inline: true }
  ];
  if (ctaId) extras.push({ name: 'CTA id', value: ctaId, inline: true });
  if (intent) extras.push({ name: 'Intent', value: intent, inline: true });
  if (navItem) extras.push({ name: 'Nav item', value: navItem, inline: true });
  if (slug) extras.push({ name: 'Course slug', value: slug, inline: true });
  if (mailtoTo) extras.push({ name: 'Mailto to', value: mailtoTo, inline: true });
  if (mailtoSubject) extras.push({ name: 'Mailto subject', value: mailtoSubject, inline: false });
  if (fallbackReason) extras.push({ name: 'Fallback reason', value: fallbackReason, inline: false });
  if (href) extras.push({ name: 'Href', value: href, inline: false });
  if (faq) extras.push({ name: 'FAQ question', value: faq, inline: false });
  if (faqSection) extras.push({ name: 'FAQ section', value: faqSection, inline: true });
  if (elementText) extras.push({ name: 'Element text', value: elementText, inline: false });
  if (elementTag) extras.push({ name: 'Element tag', value: elementTag, inline: true });
  if (viewport) extras.push({ name: 'Viewport', value: viewport, inline: true });
  if (sessionId) extras.push({ name: 'Session id', value: sessionId, inline: true });

  // Forward any other client keys (verbose v1)
  const reserved = new Set([
    'type',
    'event',
    'label',
    'cta',
    'ctaId',
    'id',
    'href',
    'page',
    'path',
    'pathname',
    'pageUrl',
    'faq',
    'question',
    'faqSection',
    'section',
    'nav',
    'navItem',
    'navLabel',
    'text',
    'elementText',
    'tag',
    'elementTag',
    'viewport',
    'sessionId',
    'session',
    'slug',
    'course',
    'referrer',
    'referer',
    'url',
    'mailtoTo',
    'mailtoSubject',
    'intent',
    'leadIntent',
    'fallbackReason',
    'title',
    'timestamp'
  ]);
  for (const [key, raw] of Object.entries(body || {})) {
    if (reserved.has(key)) continue;
    const value = cleanText(raw, 900);
    if (!value) continue;
    extras.push({ name: `Client · ${key}`, value, inline: false });
  }

  const fields = contextFields(meta, extras);
  const title = activityTitle(type, parts);
  const description = [
    `Event \`${type}\` on the Academy site.`,
    `Visitor: ${meta.visitorKind}${meta.botName ? ` (${meta.botName})` : ''}.`,
    meta.referrer ? `Referrer: ${meta.referrer}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const pageUrl = (page.startsWith('http') ? page : meta.pageUrl) || undefined;

  const activityResult = await postDiscordEmbed(env, 'activity', {
    title,
    description,
    fields,
    footer: `TWA activity · ${meta.host}`,
    url: pageUrl
  });

  /** @type {object[]} */
  const routed = [activityResult];

  // Real lead-intent engagement → also #twa-leads (verbose founder info)
  if (isLeadIntentEvent(type, parts)) {
    const leadResult = await postDiscordEmbed(env, 'leads', {
      title: leadsTitle(type, parts),
      description: [
        'Visitor engagement that looks like a real enquiry path (not a completed form).',
        type === 'callback' || intent === 'callback'
          ? 'They chose a callback path — follow up by phone when details arrive.'
          : type === 'whatsapp' || intent === 'whatsapp'
            ? 'They clicked a WhatsApp link — check the href for the chat target.'
            : 'They opened an Academy email / mailto backup path.',
        `Visitor: ${meta.visitorKind}${meta.botName ? ` (${meta.botName})` : ''}.`
      ]
        .filter(Boolean)
        .join(' '),
      fields,
      footer: `TWA leads · engagement · ${meta.host}`,
      url: pageUrl
    });
    routed.push(leadResult);
  }

  const courseChannel = courseChannelForSlug(slug);
  const courseWorthy =
    courseChannel &&
    (type === 'course_cta' ||
      type === 'apply' ||
      type === 'cta' ||
      type === 'mailto' ||
      type === 'whatsapp' ||
      type === 'callback' ||
      type === 'header_cta' ||
      type === 'visit' ||
      /join\.html|course=|\/courses\//i.test(`${href} ${page} ${label}`));

  if (courseWorthy && courseChannel) {
    const courseResult = await postDiscordEmbed(env, courseChannel, {
      title: `Course signal · ${slug}`,
      description: `${type}: ${label}`,
      fields,
      footer: `TWA course alert · ${slug}`,
      url: meta.pageUrl || undefined
    });
    routed.push(courseResult);
  }

  return json({
    ok: true,
    routed,
    configured: routed.some((r) => !r.skipped),
    leadIntent: isLeadIntentEvent(type, parts)
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
