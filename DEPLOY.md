# Deployment: thameswellnessacademy.co.uk

## Custom domain status

| Domain | Status |
|--------|--------|
| `thameswellnessacademy.co.uk` | **Primary** — Cloudflare Pages custom domain (HTTPS) |
| `www.thameswellnessacademy.co.uk` | Pages custom domain (CNAME → same project) |
| `berkshireyogatraining.co.uk` | Legacy — path-preserving **301** to matching `thameswellnessacademy.co.uk` URLs |

## Cloudflare Pages

- **Account:** Markotuisk (`bc3f6c1145456bef0f781f62744c74ed`)
- **Project:** `berkshire-yoga-training`
- **Production URL:** https://thameswellnessacademy.co.uk/
- **DNS zone for new domain:** Raili.maripuu account (`a40062723d2f712d6608f25f92a855f2`), zone `aa4cbc2d35767a2d305d684e6a8bbdb3` — proxied CNAMEs to `berkshire-yoga-training.pages.dev`
- **Legacy zone:** `berkshireyogatraining.co.uk` in Marko account — Single Redirect rule (301, path + query preserved)

## Deploy

```bash
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
```

Optional Pages env (backup to zone redirect rule):

```bash
npx wrangler pages secret put ENABLE_DOMAIN_MIGRATION_REDIRECTS --project-name=berkshire-yoga-training
# value: 1
```

Middleware in `functions/_middleware.js` 301s old hosts when that env is `1`.

## Domain migration (SEO cutover)

Primary public hostname: `https://thameswellnessacademy.co.uk`

### Done
- Absolute canonicals, Open Graph, JSON-LD, sitemap, robots, and agent files use `thameswellnessacademy.co.uk`.
- New domain serves the same Pages project (same paths).
- Old zone Single Redirect: old host `/*` → `https://thameswellnessacademy.co.uk` + path (301, preserve query).

### Search Console
1. Verify `sc-domain:thameswellnessacademy.co.uk` (or URL-prefix).
2. Submit `https://thameswellnessacademy.co.uk/sitemap.xml`.
3. On the old property: **Change of Address** → new domain (after 301s work).
4. Spot-check URL Inspection on home, foundation 200-hour, team pages.

Keep the old domain registered and redirecting for at least 180 days (prefer 12+ months).


### Search Console / DNS status (2026-10-14)

- Verified Domain + URL-prefix for thames; legacy berkshire Domain + URL-prefix kept.
- Sitemap submitted on URL-prefix: `/sitemap.xml` → Success (43 pages).
- URL Inspection + indexing requested for home, foundation 200-hour, Katia.
- Change of Address: filed (old property Settings shows move to `thameswellnessacademy.co.uk`; Cancel move available).
- Live DNS stays on Raili’s zone (NS gerald/pearl). Google MX + SPF + soft DMARC (`p=none`) added via Raili API token (Keychain: `cloudflare-api-token-thameswellnessacademy` / `raili-maripuu`).
- Marko duplicate pending zone (jamie/yahir) removed — do not switch registrar NS.
- Still needed from Google Admin: DKIM TXT (`google._domainkey`) after Workspace domain verification.
- Keep old domain 301s for 180+ days.

### Email addresses (policy)

| Role | Address / domain | Use |
|------|------------------|-----|
| Website → people (automated) | `noreply@thameswellnessacademy.co.uk` | All site-originated outbound to visitors/applicants (confirmations, form receipts, system notices). **Send-only.** Never shown as a contact address on the site. |
| Teachers + company (human) | `@thameswellness.com` (e.g. `contact@thameswellness.com`, staff mailboxes) | Visible contact, mailto, schema, `security.txt`, form fallbacks, teacher and company correspondence |

- Split is intentional: academy domain for machine mail from the website; `thameswellness.com` for people.
- `noreply@…` is not a public inbox; do not publish it on pages.
- Google MX/SPF/DMARC (and pending Workspace DKIM) on `thameswellnessacademy.co.uk` support Google domain auth for that host.
- **Resend (live):** domain `thameswellnessacademy.co.uk` verified in `eu-west-1` (id `31f80f57-7590-4413-ae6a-35befd29dcba`). Send From: `noreply@thameswellnessacademy.co.uk`. Keychain: `resend-api-key-thameswellnessacademy` / `thameswellnessacademy`. DNS on Raili’s zone: `resend._domainkey` (TXT), `send` + `rsend` (CNAME) — all verified. Do not enable Cloudflare Email Routing on this apex (would conflict with Google MX).

### Course email automation (forms → Resend → Sheet → reminders)

Form posts to `/api/notify/lead` still hit Discord, then:

1. Branded confirmation to the visitor (if email present)
2. Staff alert to `raili.maripuu@thameswellness.com` and `Katia.major@thameswellness.com`
3. Upsert row on the course **Leads** Google Sheet (`Status=Interested`)

Daily cron `/api/cron/course-reminders` sends −14 / −7 / −3 day reminders for rows with `Status=Paid` and a `CourseStartDate`. Mark paid + payment email: `POST /api/course/mark-paid`.

**Pages secrets (berkshire-yoga-training):**

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Send all automated mail |
| `COURSE_SHEETS_SPREADSHEET_ID` | Live leads Sheet id |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets API writes (Editor on the Sheet) |
| `COURSE_SHEETS_SECRET` | Auth for mark-paid (+ optional Apps Script) |
| `COURSE_SHEETS_WEBHOOK_URL` | Optional Apps Script `/exec` fallback |
| `CRON_SECRET` | Auth for `/api/cron/course-reminders` |

```bash
npx wrangler pages secret put RESEND_API_KEY --project-name=berkshire-yoga-training
npx wrangler pages secret put COURSE_SHEETS_SPREADSHEET_ID --project-name=berkshire-yoga-training
npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_JSON --project-name=berkshire-yoga-training
npx wrangler pages secret put COURSE_SHEETS_SECRET --project-name=berkshire-yoga-training
npx wrangler pages secret put CRON_SECRET --project-name=berkshire-yoga-training
```

Live Sheet: https://docs.google.com/spreadsheets/d/1RpJ-Opimnhr4-khVEDNgM8ZWkVUYsSNiRHG8gAQpLg8/edit  
Setup and columns: [`docs/COURSE-EMAIL-SHEET.md`](docs/COURSE-EMAIL-SHEET.md). Apps Script source (fallback): [`docs/course-sheets-apps-script.js`](docs/course-sheets-apps-script.js).

Visitor emails include course link + key details, founder contacts (Katia / Raili + `contact@thameswellness.com`), Apple and Google/Android calendar buttons, and QR codes for contact vCard (`/api/contacts/academy`) and calendar ICS (`/api/calendar/course`).
