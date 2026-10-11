/**
 * Discord webhook helpers for TWA founder / teacher alerts.
 * Secrets are Cloudflare Pages env vars (never commit webhook URLs).
 */

/**
 * @typedef {'leads' | 'activity' | 'bots' | 'courses' | 'foundation' | 'pregnancy' | 'functional_anatomy' | 'yoga_nidra' | 'soundbath' | 'journal' | 'suggest_course'} DiscordChannel
 */

const WEBHOOK_ENV = {
  leads: 'DISCORD_WEBHOOK_LEADS',
  activity: 'DISCORD_WEBHOOK_ACTIVITY',
  bots: 'DISCORD_WEBHOOK_BOTS',
  courses: 'DISCORD_WEBHOOK_COURSES',
  foundation: 'DISCORD_WEBHOOK_FOUNDATION',
  pregnancy: 'DISCORD_WEBHOOK_PREGNANCY',
  functional_anatomy: 'DISCORD_WEBHOOK_FUNCTIONAL_ANATOMY',
  yoga_nidra: 'DISCORD_WEBHOOK_YOGA_NIDRA',
  soundbath: 'DISCORD_WEBHOOK_SOUNDBATH',
  journal: 'DISCORD_WEBHOOK_JOURNAL',
  suggest_course: 'DISCORD_WEBHOOK_SUGGEST_COURSE'
};

/** Dedicated course channels fall back to #twa-course-alerts when their secret is unset. */
const COURSE_DEDICATED_CHANNELS = new Set([
  'foundation',
  'pregnancy',
  'functional_anatomy',
  'yoga_nidra',
  'soundbath'
]);

/**
 * Form data-slug / path aliases → Discord course channel.
 * Named trainings get dedicated channels; open-day CPD / workshops / retreats / generic CPD use courses fallback.
 */
const COURSE_CHANNEL_BY_SLUG = {
  'foundation-200': 'foundation',
  'foundation-training': 'foundation',
  'foundation-yoga-training': 'foundation',
  'foundation-yoga': 'foundation',
  foundation: 'foundation',
  '200-hour': 'foundation',
  '200hr': 'foundation',
  'foundation-tt': 'foundation',
  'open-day-foundation': 'foundation',
  'open-day-200': 'foundation',
  'pregnancy-yoga': 'pregnancy',
  pregnancy: 'pregnancy',
  'functional-anatomy': 'functional_anatomy',
  anatomy: 'functional_anatomy',
  'yoga-nidra': 'yoga_nidra',
  nidra: 'yoga_nidra',
  soundbath: 'soundbath',
  'sound-bath': 'soundbath',
  'soundbath-training': 'soundbath',
  'sound-facilitator': 'soundbath',
  // Umbrella / non-dedicated programmes
  'open-day-cpd': 'courses',
  'cpd-open-day': 'courses',
  cpd: 'courses',
  workshops: 'courses',
  retreats: 'courses'
};

/** @deprecated use COURSE_CHANNEL_BY_SLUG — kept for any older imports */
const TEACHER_SHARED_SLUGS = new Set(Object.keys(COURSE_CHANNEL_BY_SLUG));

const COLOURS = {
  leads: 0xc9a227,
  activity: 0x4a5a45,
  bots: 0x6b6358,
  courses: 0x2f3b2e,
  foundation: 0x2f3b2e,
  pregnancy: 0x2f3b2e,
  functional_anatomy: 0x2f3b2e,
  yoga_nidra: 0x2f3b2e,
  soundbath: 0x2f3b2e,
  journal: 0xc9a227,
  suggest_course: 0xc9a227
};

/**
 * @param {Record<string, string | undefined> | undefined} env
 * @param {DiscordChannel} channel
 */
export function resolveWebhook(env, channel) {
  if (!env) return '';
  const primary = String(env[WEBHOOK_ENV[channel]] || '').trim();
  if (primary) return primary;
  // Dedicated course webhooks fall back to the shared courses channel
  if (COURSE_DEDICATED_CHANNELS.has(channel)) {
    return String(env.DISCORD_WEBHOOK_COURSES || '').trim();
  }
  return '';
}

/**
 * @param {string} slug
 * @returns {DiscordChannel | null}
 */
export function courseChannelForSlug(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!key) return null;
  return COURSE_CHANNEL_BY_SLUG[key] || null;
}

/**
 * Infer a course slug from free text (topic / interest / courses fields).
 * @param {string} text
 */
export function inferCourseSlug(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return '';
  if (/sound\s*bath|soundbath|sound\s*facilitator/.test(t)) return 'soundbath';
  if (/pregnancy/.test(t)) return 'pregnancy-yoga';
  if (/nidra/.test(t)) return 'yoga-nidra';
  if (/anatomy/.test(t)) return 'functional-anatomy';
  if (/open\s*day.*cpd|cpd.*open\s*day/.test(t)) return 'open-day-cpd';
  if (/open\s*day/.test(t)) return 'open-day-foundation';
  if (/200|foundation/.test(t)) return 'foundation-200';
  if (/\bcpd\b/.test(t)) return 'cpd';
  if (/workshop/.test(t)) return 'workshops';
  if (/retreat/.test(t)) return 'retreats';
  return '';
}

/**
 * @param {Record<string, string | undefined> | undefined} env
 * @param {DiscordChannel} channel
 * @param {{
 *   title: string,
 *   description?: string,
 *   fields?: Array<{ name: string, value: string, inline?: boolean }>,
 *   footer?: string,
 *   url?: string
 * }} embed
 */
export async function postDiscordEmbed(env, channel, embed) {
  const webhook = resolveWebhook(env, channel);
  if (!webhook) {
    return { ok: false, skipped: true, reason: 'webhook_not_configured', channel };
  }

  const body = {
    username: 'TWA Alerts',
    embeds: [
      {
        title: truncate(embed.title, 256),
        description: embed.description ? truncate(embed.description, 4000) : undefined,
        color: COLOURS[channel] || COLOURS.activity,
        url: embed.url || undefined,
        fields: (embed.fields || [])
          .filter((f) => f && f.name && f.value)
          .slice(0, 25)
          .map((f) => ({
            name: truncate(f.name, 256),
            value: truncate(f.value, 1024),
            inline: !!f.inline
          })),
        footer: embed.footer ? { text: truncate(embed.footer, 2048) } : undefined,
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        skipped: false,
        reason: `discord_http_${res.status}`,
        channel,
        detail: truncate(detail, 200)
      };
    }
    return { ok: true, skipped: false, channel };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      reason: 'discord_fetch_failed',
      channel,
      detail: truncate(err && err.message ? err.message : String(err), 200)
    };
  }
}

/**
 * @param {string} value
 * @param {number} max
 */
export function truncate(value, max) {
  const s = String(value == null ? '' : value).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Strip control chars; keep useful lead text.
 * @param {unknown} value
 * @param {number} [max]
 */
export function cleanText(value, max = 2000) {
  return truncate(
    String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
      .replace(/\s+/g, ' '),
    max
  );
}

export { WEBHOOK_ENV, COURSE_CHANNEL_BY_SLUG, COURSE_DEDICATED_CHANNELS, TEACHER_SHARED_SLUGS };
