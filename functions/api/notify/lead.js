/**
 * POST /api/notify/lead
 * Enquiry / apply / open-day / journal-subscribe / suggest-course form submissions → Discord.
 * Journal subscribe → #twa-journal-subscribers (primary) + #twa-leads (dual).
 * Suggest a course → #twa-suggest-a-course (primary) + #twa-leads (dual).
 * Other forms → #twa-leads (+ matching course channel when topic matches).
 * v1: rich embeds with full form + request context.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields we never forward into Discord (honeypot / noise). */
const SKIP_BODY_KEYS = new Set([
  'website',
  'company_url',
  'url',
  'password',
  'token',
  'csrf',
  'g-recaptcha-response'
]);

function slugFromBody(body) {
  const explicit = cleanText(body.slug || body.course || body.courseSlug, 80).toLowerCase();
  if (explicit) return explicit.replace(/\s+/g, '-');
  const topic = cleanText(body.topic || body.interest, 160);
  const courses = cleanText(body.courses, 400);
  return inferCourseSlug(`${topic} ${courses}`);
}

function isJournalSubscribeSource(source) {
  return /journal[-_]?subscribe/i.test(source) || source === 'journal';
}

/**
 * Dedicated Suggest a course form, or contact topic/slug marked as suggest.
 * @param {string} source
 * @param {string} topic
 * @param {string} slug
 */
function isSuggestCourse(source, topic, slug) {
  const s = String(source || '').toLowerCase();
  const t = String(topic || '').toLowerCase();
  const g = String(slug || '').toLowerCase();
  return (
    /suggest[-_]?course/.test(s) ||
    s === 'suggest' ||
    /suggest\s+a\s+course/.test(t) ||
    t === 'suggest' ||
    g === 'suggest-course' ||
    g === 'suggest'
  );
}

/**
 * Dump remaining form keys so founders see everything submitted.
 * @param {Record<string, unknown>} body
 * @param {Set<string>} used
 */
function extraFormFields(body, used) {
  /** @type {Array<{ name: string, value: string, inline?: boolean }>} */
  const fields = [];
  for (const [key, raw] of Object.entries(body || {})) {
    const k = String(key);
    if (used.has(k) || SKIP_BODY_KEYS.has(k.toLowerCase())) continue;
    const value = cleanText(raw, 900);
    if (!value) continue;
    fields.push({ name: `Form · ${k}`, value, inline: false });
  }
  return fields;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!isSameOrigin(request)) {
    return json({ error: 'Forbidden origin' }, 403);
  }

  // Soft abuse ceiling only (v1 prefers volume)
  const limit = await rateLimit(request, 'lead', 30, 60);
  if (!limit.allowed) {
    return json({ error: 'Too many requests. Please try again shortly.' }, 429);
  }

  let body;
  try {
    body = await parseBody(request);
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  // Honeypot: bots often fill hidden "website" fields
  if (cleanText(body.website || body.company_url, 20)) {
    return json({ ok: true, ignored: true });
  }

  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 200).toLowerCase();
  const phone = cleanText(body.phone, 60);
  const topic = cleanText(body.topic || body.interest, 200);
  const courses = cleanText(body.courses, 900);
  const message = cleanText(body.message || body.experience, 3500);
  const experience = cleanText(body.experience, 3500);
  const source = cleanText(body.source || body.form || 'enquiry', 60) || 'enquiry';
  const page = cleanText(body.page || body.pageUrl || '', 500);
  const ctaId = cleanText(body.cta || body.ctaId || body['data-cta'] || '', 80);
  const navItem = cleanText(body.nav || body.navItem || '', 120);
  const slug = slugFromBody(body);
  const meta = clientMeta(request, body);
  const isJournal = isJournalSubscribeSource(source);
  const isSuggest = !isJournal && isSuggestCourse(source, topic, slug);

  // Journal subscribe stays email-only. Other leads need email or phone (or both).
  if (isJournal) {
    if (!email || !EMAIL_RE.test(email)) {
      return json({ error: 'A valid email is required.' }, 400);
    }
  } else {
    if (email && !EMAIL_RE.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }
    if (!email && !phone) {
      return json(
        {
          error: 'Please leave an email or phone number so we can get back to you.'
        },
        400
      );
    }
    if (!name) {
      return json({ error: 'Please include your name.' }, 400);
    }
    if (!message && !topic && !experience) {
      return json({ error: 'Please include a topic or message.' }, 400);
    }
    if (isSuggest && !message) {
      return json({ error: 'Please describe the course you would like to suggest.' }, 400);
    }
  }

  const displayName =
    name || (email ? email.split('@')[0] : '') || (phone ? phone : '') || 'Subscriber';
  const journalTopic = topic || 'Journal subscribe';
  const suggestTopic = topic || 'Suggest a course';

  const usedKeys = new Set([
    'name',
    'email',
    'phone',
    'topic',
    'interest',
    'courses',
    'message',
    'experience',
    'source',
    'form',
    'page',
    'pageUrl',
    'slug',
    'course',
    'courseSlug',
    'cta',
    'ctaId',
    'data-cta',
    'nav',
    'navItem',
    'referrer',
    'referer',
    'path',
    'pathname',
    'website',
    'company_url',
    'url'
  ]);

  /** @type {Array<{ name: string, value: string, inline?: boolean }>} */
  const leadExtras = [{ name: 'Name', value: displayName, inline: true }];
  if (email) leadExtras.push({ name: 'Email', value: email, inline: true });
  if (phone) leadExtras.push({ name: 'Phone', value: phone, inline: true });
  if (isJournal || isSuggest || topic) {
    leadExtras.push({
      name: 'Topic / interest',
      value: isJournal ? journalTopic : isSuggest ? suggestTopic : topic,
      inline: true
    });
  }
  if (slug && !isJournal && !isSuggest) {
    leadExtras.push({ name: 'Course slug', value: slug, inline: true });
  }
  leadExtras.push({ name: 'Source form', value: source, inline: true });
  if (ctaId) leadExtras.push({ name: 'CTA id', value: ctaId, inline: true });
  if (navItem) leadExtras.push({ name: 'Nav item', value: navItem, inline: true });
  if (courses) leadExtras.push({ name: 'Courses of interest', value: courses, inline: false });
  if (message) leadExtras.push({ name: 'Message', value: message, inline: false });
  if (experience && experience !== message) {
    leadExtras.push({ name: 'Experience', value: experience, inline: false });
  }
  for (const f of extraFormFields(body, usedKeys)) {
    leadExtras.push(f);
  }

  const fields = contextFields(meta, leadExtras);
  /** @type {object[]} */
  const routed = [];

  if (isJournal) {
    const journalDescription = [
      'New journal newsletter subscriber from the Academy website.',
      `Visitor: ${meta.visitorKind}${meta.botName ? ` (${meta.botName})` : ''}.`,
      meta.referrer ? `Came from: ${meta.referrer}` : ''
    ]
      .filter(Boolean)
      .join(' ');

    const journalResult = await postDiscordEmbed(env, 'journal', {
      title: `Journal subscriber${displayName ? `: ${displayName}` : ''}`,
      description: journalDescription,
      fields,
      footer: `TWA journal · ${meta.host} · ${source}`,
      url: page || meta.pageUrl || undefined
    });
    routed.push(journalResult);

    // Dual-post to founders leads (documented; low friction)
    const leadMirror = await postDiscordEmbed(env, 'leads', {
      title: `Journal subscriber${displayName ? `: ${displayName}` : ''}`,
      description: 'Journal newsletter signup. Also posted to #twa-journal-subscribers when that webhook is set.',
      fields,
      footer: `TWA leads · journal · ${meta.host}`,
      url: page || meta.pageUrl || undefined
    });
    routed.push(leadMirror);

    const anyOk = routed.some((r) => r.ok);
    const allSkipped = routed.every((r) => r.skipped);

    if (allSkipped) {
      return json(
        {
          ok: false,
          error: 'Discord journal webhook is not configured yet.',
          hint: 'Set DISCORD_WEBHOOK_JOURNAL (and optionally DISCORD_WEBHOOK_LEADS) on berkshire-yoga-training.',
          routed
        },
        503
      );
    }

    return json(
      {
        ok: anyOk,
        routed,
        message: anyOk
          ? 'Thank you. You are on the journal updates list.'
          : 'We could not save your subscription. Please email info@thameswellnessacademy.co.uk.'
      },
      anyOk ? 200 : 502
    );
  }

  if (isSuggest) {
    const suggestDescription = [
      'Course suggestion from the Academy website.',
      `Visitor: ${meta.visitorKind}${meta.botName ? ` (${meta.botName})` : ''}.`,
      meta.referrer ? `Came from: ${meta.referrer}` : ''
    ]
      .filter(Boolean)
      .join(' ');

    const suggestResult = await postDiscordEmbed(env, 'suggest_course', {
      title: `Course suggestion${displayName ? `: ${displayName}` : ''}`,
      description: suggestDescription,
      fields,
      footer: `TWA suggest a course · ${meta.host} · ${source}`,
      url: page || meta.pageUrl || undefined
    });
    routed.push(suggestResult);

    // Dual-post to founders leads (documented)
    const leadMirror = await postDiscordEmbed(env, 'leads', {
      title: `Course suggestion${displayName ? `: ${displayName}` : ''}`,
      description:
        'Course suggestion. Also posted to #twa-suggest-a-course when that webhook is set.',
      fields,
      footer: `TWA leads · suggest-course · ${meta.host}`,
      url: page || meta.pageUrl || undefined
    });
    routed.push(leadMirror);

    const anyOk = routed.some((r) => r.ok);
    const allSkipped = routed.every((r) => r.skipped);

    if (allSkipped) {
      return json(
        {
          ok: false,
          error: 'Discord suggest-course webhook is not configured yet.',
          hint: 'Set DISCORD_WEBHOOK_SUGGEST_COURSE (and optionally DISCORD_WEBHOOK_LEADS) on berkshire-yoga-training.',
          routed
        },
        503
      );
    }

    return json(
      {
        ok: anyOk,
        routed,
        message: anyOk
          ? 'Thank you. Your course suggestion has been sent to the Academy team.'
          : 'We could not deliver your suggestion. Please email info@thameswellnessacademy.co.uk.'
      },
      anyOk ? 200 : 502
    );
  }

  const isCallback =
    slug === 'callback' ||
    /callback/i.test(topic) ||
    /callback/i.test(source);
  const title = isCallback
    ? `Callback request${name ? `: ${name}` : ''}`
    : `New ${source} lead${topic ? `: ${topic}` : ''}`;
  const description = [
    isCallback
      ? 'Callback request received from the Academy website. Prefer a phone follow-up when a number is present.'
      : 'Enquiry received from the Academy website.',
    `Visitor: ${meta.visitorKind}${meta.botName ? ` (${meta.botName})` : ''}.`,
    meta.referrer ? `Came from: ${meta.referrer}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const leadResult = await postDiscordEmbed(env, 'leads', {
    title,
    description,
    fields,
    footer: `TWA leads · ${meta.host} · ${source}`,
    url: page || meta.pageUrl || undefined
  });
  routed.push(leadResult);

  const courseChannel = courseChannelForSlug(slug);
  if (courseChannel) {
    // Same richness for teachers in v1 (founders can trim later)
    const courseResult = await postDiscordEmbed(env, courseChannel, {
      title: `Course interest · ${topic || slug}`,
      description: 'Shared with course teachers. Also posted to #twa-leads.',
      fields,
      footer: `TWA course alert · ${slug}`,
      url: page || meta.pageUrl || undefined
    });
    routed.push(courseResult);
  }

  const anyOk = routed.some((r) => r.ok);
  const allSkipped = routed.every((r) => r.skipped);

  if (allSkipped) {
    return json(
      {
        ok: false,
        error: 'Discord leads webhook is not configured yet.',
        hint: 'Set DISCORD_WEBHOOK_LEADS on the berkshire-yoga-training Pages project.',
        routed
      },
      503
    );
  }

  return json(
    {
      ok: anyOk,
      routed,
      message: anyOk
        ? 'Thank you. Your enquiry has been sent to the Academy team.'
        : 'We could not deliver the alert. Please email info@thameswellnessacademy.co.uk.'
    },
    anyOk ? 200 : 502
  );
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
