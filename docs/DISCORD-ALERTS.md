# Discord alerts for Thames Wellness Academy

Practical founder alerts for Raili Maripuu and Katia Major. Site plumbing posts rich Discord embeds from Cloudflare Pages Functions. **v1 policy: maximum useful context now; trim noise later.**

Project: Cloudflare Pages **`berkshire-yoga-training`**  
Live site: `https://thameswellnessacademy.co.uk`

## Channel map

| Channel | Access | Purpose | What is posted | Env secret |
|---------|--------|---------|----------------|------------|
| `#twa-leads` | Founders only | Real enquiries + lead-intent engagement | Contact, Apply, Open Day form submits (name, email, phone, topic, courses, message/experience, page URL, referrer, UA, country, IP, CF-Ray, timestamp, course slug). Also Academy mailto / “Open email”, WhatsApp clicks, and Callback request intents (dual-posted with activity). Journal newsletter signups are dual-posted here as well | `DISCORD_WEBHOOK_LEADS` |
| `#twa-journal-subscribers` | Founders only | Journal newsletter list | Email (+ optional name) from the Journal page subscribe form (`form=journal-subscribe`). Primary destination for journal signups | `DISCORD_WEBHOOK_JOURNAL` |
| `#twa-suggest-a-course` | Founders only | Course idea inbox | Name, email, optional phone, and suggestion text from the Contact page Suggest a course form (`form=suggest-course`, `#suggest-course`). Also when Contact enquiry topic is Suggest a course. Dual-posted to `#twa-leads` | `DISCORD_WEBHOOK_SUGGEST_COURSE` |
| `#twa-activity` | Founders only | Human engagement | Page visits, `[data-cta]` clicks, Apply / course CTAs, Contact nav, mailto / WhatsApp / callback intents, FAQ opens, form start/focus. Rich context (URL, referrer, CTA id, label, viewport, session id, UA) | `DISCORD_WEBHOOK_ACTIVITY` |
| `#twa-bots` | Founders only | AI / crawler fetches | Middleware logs bot HTML visits (GPTBot, ClaudeBot, Googlebot, etc.) with path, Accept, UA, country, IP. Discord’s own unfurl bot is skipped | `DISCORD_WEBHOOK_BOTS` |
| `#twa-foundation` | Founders + Foundation teachers | Foundation / 200-hour interest | Leads and course signals for Foundation Training, 200-hour TT, and Foundation Open Day | `DISCORD_WEBHOOK_FOUNDATION` |
| `#twa-pregnancy` | Founders + Pregnancy Yoga teachers | Pregnancy Yoga Training | Leads and course signals for Pregnancy Yoga | `DISCORD_WEBHOOK_PREGNANCY` |
| `#twa-functional-anatomy` | Founders + Functional Anatomy teachers | Functional Anatomy Training | Leads and course signals for Functional Anatomy | `DISCORD_WEBHOOK_FUNCTIONAL_ANATOMY` |
| `#twa-yoga-nidra` | Founders + Yoga Nidra teachers | Yoga Nidra Training | Leads and course signals for Yoga Nidra | `DISCORD_WEBHOOK_YOGA_NIDRA` |
| `#twa-soundbath` | Founders + SoundBath teachers | SoundBath Training | Leads and course signals for SoundBath / Sound Facilitator | `DISCORD_WEBHOOK_SOUNDBATH` |
| `#twa-course-alerts` | Founders + relevant teachers | Fallback / other programmes | CPD Open Day, generic CPD, Workshops, Retreats, and any dedicated course whose own webhook secret is not set yet | `DISCORD_WEBHOOK_COURSES` |

If a dedicated course webhook is missing, that course falls back to `#twa-course-alerts`. If that is also missing, the course fan-out is skipped (founder `#twa-leads` / `#twa-activity` still fire when configured).

### What not to log (still)

- Cookies, auth tokens, passwords, Turnstile / captcha secrets
- Raw pageviews of every static asset
- Discordbot unfurls (avoids loops)

Everything else useful for founders is intentionally verbose in v1.

## Routing rules

1. Form submit (`POST /api/notify/lead`) with `source` / `form` **`journal-subscribe`** → primary `#twa-journal-subscribers`, dual-post `#twa-leads`. Email required; name optional; no topic/message required. No course fan-out. UI: prominent form on `/journal.html` (`#journal-subscribe`, after the hero); light “Get Journal updates” prompts in that page footer and on journal article / authors pages (link back to the form).
2. Form submit with `source` / `form` **`suggest-course`**, topic **Suggest a course**, or slug `suggest-course` → primary `#twa-suggest-a-course`, dual-post `#twa-leads`. Name, email, and suggestion message required. No course fan-out. UI: dedicated form on `/contact` (`#suggest-course`); homepage hero CTA uses `/contact?course=suggest-course#form` (topic preselected on the enquiry form). Contact enquiry form also offers Suggest a course as a topic (same routing).
3. Other form submits (`POST /api/notify/lead`) → always `#twa-leads`. Topic **Callback request** uses title `Callback request`. If course slug maps to a programme → also the matching course channel (or `#twa-course-alerts` fallback).
4. Client beacon (`POST /api/notify/event`) → always `#twa-activity`. **Lead-intent** events also dual-post to `#twa-leads`:
   - Academy inbox mailto (`contact@thameswellness.com`, contact email/chat CTAs, form mailto fallback)
   - WhatsApp / `wa.me` / `api.whatsapp.com` clicks (detector is live; **no WhatsApp links on the public site yet**)
   - Callback: `data-cta="contact-call"`, `#call`, mailto subject “Callback request”, or form topic Callback
5. Course-related CTAs / visits also fan out to the course channel when slug matches.
6. Server middleware bot visit → `#twa-bots` only (no sampling in v1).
7. If a webhook secret is missing, that channel is skipped. Lead / journal / suggest form returns HTTP 503 (or 5xx) and the browser falls back to mailto so the visitor is not blocked; the fallback also beacons a lead-intent mailto/callback event.

### Course slug → channel

| Form `data-slug` / inferred slug | Discord channel | Secret (preferred) |
|----------------------------------|-----------------|--------------------|
| `foundation-200`, `foundation-training`, `open-day-foundation` | `#twa-foundation` | `DISCORD_WEBHOOK_FOUNDATION` |
| `pregnancy-yoga` | `#twa-pregnancy` | `DISCORD_WEBHOOK_PREGNANCY` |
| `functional-anatomy` | `#twa-functional-anatomy` | `DISCORD_WEBHOOK_FUNCTIONAL_ANATOMY` |
| `yoga-nidra` | `#twa-yoga-nidra` | `DISCORD_WEBHOOK_YOGA_NIDRA` |
| `soundbath` | `#twa-soundbath` | `DISCORD_WEBHOOK_SOUNDBATH` |
| `open-day-cpd`, `cpd`, `workshops`, `retreats` | `#twa-course-alerts` | `DISCORD_WEBHOOK_COURSES` |
| `suggest-course`, `suggest` | `#twa-suggest-a-course` (via suggest routing, not course fan-out) | `DISCORD_WEBHOOK_SUGGEST_COURSE` |
| `callback`, `other`, unknown | (no course fan-out) | — |

## Code map

| File | Role |
|------|------|
| `functions/lib/discord.js` | Webhook resolve + embed POST + course slug → channel map |
| `functions/lib/notify-http.js` | Body parse, rate limit, visitor classify, rich context fields |
| `functions/lib/bot-visit.js` | Middleware bot → Discord |
| `functions/api/notify/lead.js` | `POST /api/notify/lead` |
| `functions/api/notify/event.js` | `POST /api/notify/event` |
| `functions/_middleware.js` | Calls `maybeNotifyBotVisit` |
| `js/main.js` | Visit / CTA / FAQ / form beacons + form POST to lead API |

## Setup for Raili and Katia

### 1. Create Discord channels

In the TWA Discord server, create:

1. `#twa-leads` (private, founders)
2. `#twa-journal-subscribers` (private, founders)
3. `#twa-suggest-a-course` (private, founders; course idea inbox)
4. `#twa-activity` (private, founders)
5. `#twa-bots` (private, founders)
6. `#twa-foundation` (invite Foundation teachers)
7. `#twa-pregnancy` (invite Pregnancy Yoga teachers)
8. `#twa-functional-anatomy` (invite Functional Anatomy teachers)
9. `#twa-yoga-nidra` (invite Yoga Nidra teachers)
10. `#twa-soundbath` (invite SoundBath teachers)
11. `#twa-course-alerts` (fallback for CPD Open Day / workshops / retreats / generic CPD; also temporary home until a dedicated secret is set)

### 2. Create webhooks

For each channel:

1. Channel settings → Integrations → Webhooks → New Webhook
2. Name e.g. `TWA Alerts`
3. Copy the webhook URL (starts with `https://discord.com/api/webhooks/…`)
4. Keep the URL private. Do not paste it into git, HTML, or chat logs

### 3. Set Cloudflare Pages secrets

In [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → **berkshire-yoga-training** → Settings → Environment variables → **Production** (and Preview if you want test alerts):

| Variable name | Value |
|---------------|--------|
| `DISCORD_WEBHOOK_LEADS` | Webhook URL for `#twa-leads` |
| `DISCORD_WEBHOOK_JOURNAL` | Webhook URL for `#twa-journal-subscribers` |
| `DISCORD_WEBHOOK_SUGGEST_COURSE` | Webhook URL for `#twa-suggest-a-course` |
| `DISCORD_WEBHOOK_ACTIVITY` | Webhook URL for `#twa-activity` |
| `DISCORD_WEBHOOK_BOTS` | Webhook URL for `#twa-bots` |
| `DISCORD_WEBHOOK_FOUNDATION` | Webhook URL for `#twa-foundation` |
| `DISCORD_WEBHOOK_PREGNANCY` | Webhook URL for `#twa-pregnancy` |
| `DISCORD_WEBHOOK_FUNCTIONAL_ANATOMY` | Webhook URL for `#twa-functional-anatomy` |
| `DISCORD_WEBHOOK_YOGA_NIDRA` | Webhook URL for `#twa-yoga-nidra` |
| `DISCORD_WEBHOOK_SOUNDBATH` | Webhook URL for `#twa-soundbath` |
| `DISCORD_WEBHOOK_COURSES` | Webhook URL for `#twa-course-alerts` (fallback) |

Mark each as **Encrypted** / secret.

Or via Wrangler (interactive; do not put the URL in the shell history on purpose):

```bash
npx wrangler pages secret put DISCORD_WEBHOOK_LEADS --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_JOURNAL --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_SUGGEST_COURSE --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_ACTIVITY --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_BOTS --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_FOUNDATION --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_PREGNANCY --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_FUNCTIONAL_ANATOMY --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_YOGA_NIDRA --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_SOUNDBATH --project-name=berkshire-yoga-training
npx wrangler pages secret put DISCORD_WEBHOOK_COURSES --project-name=berkshire-yoga-training
```

Secrets apply to the next deployment of Functions. After setting secrets, redeploy (or wait for the next `main` deploy).

### 4. Smoke test

1. Open the live site, click Apply / a Contact nav item → message in `#twa-activity`
2. Submit Contact or Apply with a test name/email → `#twa-leads`
3. Submit Journal subscribe on `/journal.html` (`#journal-subscribe`, below the hero) with a test email → `#twa-journal-subscribers` and `#twa-leads`
4. Submit Suggest a course on `/contact.html` (`#suggest-course`) → `#twa-suggest-a-course` and `#twa-leads`
5. Submit with SoundBath as topic → also `#twa-soundbath` (or `#twa-course-alerts` if SoundBath secret unset)
6. Submit with Foundation 200 hours → also `#twa-foundation`
7. Submit CPD Open Day / Workshops → `#twa-course-alerts`
8. Open an FAQ item → `#twa-activity`
9. Confirm no webhook URLs appear in page source or the git repo

## Privacy note

Lead channel includes name, email, phone, and message so founders can act. Activity and bots channels include IP and user-agent in v1 for debugging. Reduce those fields later if Discord access widens.

## Later trim list (when ready)

- Drop per-page `visit` beacons; keep CTA / FAQ / form only
- Sample `#twa-bots` (e.g. one summary per bot per hour)
- Remove IP from activity embeds
- Stop `form_focus` events; keep `form_start` only
