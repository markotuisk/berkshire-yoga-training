# Shadow mode site setup

Private review copy of Thames Wellness Academy.

- **Shadow URL (custom):** https://shadow.berkshireyogatraining.co.uk  
- **Shadow preview:** https://berkshire-yoga-training-shadow.pages.dev  
- **Live URL:** https://berkshireyogatraining.co.uk (unchanged)  
- **Agent:** Meridian  
- **Shadow tickets Sheet:** https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit  
  ID: `12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY`  
  (mirror via Apps Script web app → `SHEETS_WEBHOOK_URL`; not the Sheet edit URL)

## Team

| Name | Role | Access email |
|------|------|----------------|
| Katia Major | Business owner | Katia.major@thameswellness.com |
| Raili Maripuu | Business owner | raili.maripuu@thameswellness.com |
| Marko Tuisk | SEO and development | markotuisk@gmail.com |
| Meridian | Implementation agent | — |

Partners do **not** need Cloudflare accounts. Access only needs their emails on an allow policy.

## How partners use it

1. Open the shadow site (Cloudflare Access login → one-time email code or Google).
2. Choose your name (Katia / Raili / Marko).
3. **What's new** on login when there are unread partner updates (ticket inbox does not auto-open).
4. **Review** toolbox FAB (bottom right) opens the **Curator's desk**: categories explode into Insights, SEO, Design and Pick. SEO and Design show **grouped catalogues** (Foundation, Content, Links, Technical). Each activity opens as its own draggable popup. **Open activities** appear as pills above the toolbar (click to focus, × to close). **Link graph** is in Insights only. **Pick** toggles element selection immediately (or use ⌘/Alt+click).
5. **Insights** covers page summary, Search Console, GA4 traffic, and link graph. **SEO** and **Design** sections open from grouped toolbox menus. **Pick** toggles element selection (or use ⌘/Alt+click).
6. **Tickets** in the toolbar opens the ticket inbox.
7. **Settings** (gear icon, before your name) opens environment options — connect Google for Search Console and Analytics insights, see connection status, and view Shadow version.
8. **Open** tab (default) lists tickets that still need attention; **Closed** holds finished items (Approved, Shipped to live, Won't fix, Duplicate).
9. Orange **TWA-xxx** markers appear on page elements with open tickets — click to open the thread and jump to the element.
10. **Show on page** in a ticket (or **Locate** in the inbox) scrolls to the linked element and highlights it. Drag ticket windows by the six-dot grip; drag any corner to resize.
11. For images or placeholders, the **Storycard** section lets you upload a replacement file (optional).
12. Add category + comment → ticket created (stored in KV and mirrored to Google Sheets).
13. Open a ticket to read the thread and add further comments.
14. **SEO** panel shows overview score, meta, headings, images, links, JSON-LD, and technical checks from the current page DOM. **Links** tab can check broken links on the page or crawl the site from `sitemap.xml`. **Link graph** (Insights only) maps inbound and outbound internal links across sitemap pages. **Summary** tab shows the graph as a mini preview plus Search Console and GA4 metrics when configured. **Technical** tab reports canonical mismatch, mixed content, DOM size, and load timing. **Structured data** tab validates required schema fields. **Highlight on page** labels headings and marks images missing alt.

**Open tab** (default inbox + on-page markers): Open, Discussing, Accepted, On shadow, In progress, Ready for review, Blocked.

**Closed tab**: Approved, Shipped to live, Won't fix, Duplicate.

Partners use **Comment** to discuss, **Accept** to agree with the proposed direction (ticket stays Open), and **Done** when a shadow change looks right (moves to Closed). Marko uses developer actions to mark work on shadow, send for review, and ship to live.

## Review tools UX (v1.17.0)

**Curator's desk** blends a folio-inspired toolbox with Apple-style clarity:

- **Grouped sub-menus** — SEO sections in Foundation, Content, Links and Technical; Design in Summary, Visual and Quality (no flat 12-item list).
- **Activity dock** — pills above the toolbar list open popups; click to bring forward, × to close; "+N more" when many are open.
- **Single link graph** — full graph in Insights only (removed from SEO sub-menu to avoid duplicate entry).
- **Pick** — immediate toggle from the toolbox fan, not a sub-menu.
- **Open indicators** — orange stamp dot on sub-menu items whose popup is already open; reopening focuses the existing card instead of duplicating.

**UX audit notes (v1.16.0 → 1.17.0):** flat SEO sub-menu did not scale; link graph duplicated in SEO and Insights; multiple popups stacked without a dock; sub-menu competed visually with popups; Pick behaved like a category with a redundant sub-menu; Insights and SEO overlapped on link graph; mobile explosion + sub-menu + popups felt cramped; inconsistent borders and radii; no indicator when a section was already open.

## Version and What's new

Shadow mode tools are versioned in `js/shadow-changelog.js` (loaded before `js/shadow-seo.js` and `js/shadow-review.js`).

When shipping partner-facing changes:

1. Bump `version` in `js/shadow-changelog.js`
2. Bump `SHADOW_ASSET_VERSION` in `functions/_middleware.js` to the same value (cache-busts injected CSS/JS)
3. Add a release entry with `user` bullets (Katia and Raili) and optional `dev` bullets (Marko only)
4. Deploy shadow branch

On next login, partners see a **What's new** popup for any release newer than their last seen version (stored in browser localStorage). Marko also sees `dev` items. Toolbar shows **vX.Y.Z** with an orange badge when updates are unread. **What's new** in the toolbar reopens the changelog any time.

**Log out** in the toolbar ends the Cloudflare Access session (sign-in required again). **Switch user** clears the reviewer name only. Sessions end automatically after **1 hour** with no mouse, keyboard, scroll, or touch activity.

```text
js/shadow-changelog.js   version + release notes
js/shadow-links.js         link checker (page + sitemap crawl)
js/shadow-graph.js         site link graph (sitemap crawl + radial SVG)
js/shadow-seo.js           client-side SEO audit panel
js/shadow-design.js        fonts, colours, accessibility and design mismatch audit
js/shadow-settings.js      environment settings and Google OAuth connect UI
js/shadow-review.js        overlay UI
css/shadow-review.css      overlay styles
functions/api/insights.js  GSC + GA4 page insights (Workers)
functions/api/auth/google/ OAuth start, callback, status, disconnect
functions/lib/google-oauth.js  OAuth helpers and token refresh
```

**Design audit:** Toolbox → **Design** → choose a section (Summary, Typography, Colours, Accessibility, Issues). Each opens as its own popup scanning the page for font families, sizes, weights, line heights, colours and accessibility (images, headings, contrast, links, buttons, form fields, landmarks). **Issues** merges design mismatches with accessibility findings. **⋯** row menus offer **Locate on page** and **Request change**, matching the SEO panel.

---

## Marko checklist (finish auth + Sheets)

Do these once. Code for dual-write and the overlay is already on the `shadow` branch.

### A. Custom domain + DNS

1. Cloudflare Dashboard → **Workers & Pages** → `berkshire-yoga-training-shadow` → **Custom domains** → Add `shadow.berkshireyogatraining.co.uk`
2. DNS for zone `berkshireyogatraining.co.uk`: CNAME `shadow` → `berkshire-yoga-training-shadow.pages.dev` (proxied / orange cloud)

Wrangler OAuth cannot create DNS (`zone:read` only). Use the dashboard or an API token with **Zone → DNS → Edit**.

Optional one-shot (DNS + Access) if you create a token with DNS Edit + Access Apps Edit:

```bash
export CLOUDFLARE_API_TOKEN=...   # DNS Edit + Access: Apps and Policies Edit
chmod +x docs/shadow-setup-access.sh
./docs/shadow-setup-access.sh
```

Allowlist in that script: Marko, Katia (`Katia.major@thameswellness.com`), Raili (`raili.maripuu@thameswellness.com`).

### B. Cloudflare Access (login)

1. **Zero Trust** → **Access** → **Applications** → **Add** → Self-hosted  
2. Application name: `TWA Shadow mode`  
3. Domain: `shadow.berkshireyogatraining.co.uk` (also add `berkshire-yoga-training-shadow.pages.dev` so the preview URL is gated)  
4. Identity: **One-time PIN** (simplest) and/or Google  
5. Policy **Allow**: emails for Marko (`markotuisk@gmail.com`), Katia (`Katia.major@thameswellness.com`), and Raili (`raili.maripuu@thameswellness.com`)  
6. Save → test in a private window  

#### Access login branding

1. Zero Trust → **Reusable components** → **Custom pages** → Access login page → **Manage**  
2. Organisation name: **Thames Wellness Academy**  
3. Logo + header **Shadow mode** · footer **Partners only · not the public site**  
4. Brand orange `#E8612E` where colour fields allow  

### C. Google Sheet + Apps Script

**Spreadsheet (already created):**  
https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit  
ID: `12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY`

Do **not** put the spreadsheet edit URL into `SHEETS_WEBHOOK_URL`. That secret must be the Apps Script **web app** URL (`https://script.google.com/macros/s/.../exec`).

1. Open **this** Sheet (link above).  
2. Ensure five tabs exist with headers from `docs/SHADOW-SHEETS-TEMPLATE.md`: `Tickets`, `Comments`, `Audit_Log`, `People`, `Assets` (seed People rows from the template).  
3. In **this** Sheet: **Extensions → Apps Script** → delete any stub code → paste the full contents of `docs/shadow-sheets-apps-script.js` → **Save** (disk icon).  
4. **Deploy → New deployment** → type **Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone** (Cloudflare posts server-side; URL stays secret)  
   - Deploy → authorize if prompted → **Copy** the web app URL  
5. Set the Pages secret (paste the `script.google.com/macros/s/.../exec` URL when prompted — not the docs.google.com Sheet link):

```bash
npx wrangler pages secret put SHEETS_WEBHOOK_URL --project-name=berkshire-yoga-training-shadow
```

6. Full resync after the secret is set: `POST https://berkshire-yoga-training-shadow.pages.dev/api/audit`  
   (or the custom domain once Access allows you through). Expect `{ ok: true }` — not `SHEETS_WEBHOOK_URL is not set`.

People tab emails: Katia `Katia.major@thameswellness.com`, Raili `raili.maripuu@thameswellness.com`, Marko `markotuisk@gmail.com`.

### D. KV binding (tickets must persist)

Pages → `berkshire-yoga-training-shadow` → Settings → Functions → KV bindings:

| Variable name | Namespace |
|---------------|-----------|
| `SHADOW_TICKETS` | id `7b1eff8921fc46cdaed5e5fffd57ab38` (also in `wrangler.toml`) |

### E. Storycard uploads (Google Drive)

When a partner picks an **image** or **placeholder** on the shadow site, the New ticket modal shows a **Storycard** section with an optional file upload. After the ticket is created, the image is sent to Google Drive via Apps Script.

**Drive folder (upload destination):**  
https://drive.google.com/drive/folders/1TIhmFeB7LanKDhNCfiCm83ZZQTYjQKhF  
Folder ID: `1TIhmFeB7LanKDhNCfiCm83ZZQTYjQKhF`

**Filename pattern:** `TWA-xxx__pageSlug__assetKey.ext` (e.g. `TWA-0042__about__hero-banner.jpg`)

**Marko must redeploy Apps Script** after pulling the latest `shadow` branch:

1. Open the Sheet → **Extensions → Apps Script**
2. Replace all code with the full contents of `docs/shadow-sheets-apps-script.js` (not just a snippet)
3. **Save** → **Deploy → Manage deployments** → edit existing web app → **New version** → Deploy
4. Ensure the script owner account has **Editor** access to the Drive folder above
5. Add an **Assets** tab to the Sheet if missing (headers in `docs/SHADOW-SHEETS-TEMPLATE.md`)

No new Pages secret is required. Uploads use the existing `SHEETS_WEBHOOK_URL` with action `asset_upload`.

**Limits:** JPEG, PNG, WebP or GIF only; maximum 8 MB per file.

Uploaded assets appear in the Sheet **Assets** tab and on the ticket detail view as **Open in Drive** (stored in KV as `shadowFixUrl`).

---

## Deploy shadow (Marko / Meridian)

```bash
git checkout shadow
npx wrangler pages deploy . --project-name=berkshire-yoga-training-shadow --branch=shadow --commit-dirty=true
```

### Link preview (Open Graph)

Two separate OG sets (middleware on the `shadow` branch):

**1. Shadow Access** (link unfurls before login — WhatsApp, iMessage, Slack crawlers)

- **Title:** Thames Wellness Academy · Shadow Access  
- **Description:** Private partner login for the TWA Shadow review site. One-time email code. For Katia, Raili and Marko only. Not the public Academy site.  
- **Image:** `https://berkshireyogatraining.co.uk/assets/og-image.jpg`

**2. Shadow mode** (normal pages after you are logged in)

- **Title:** Thames Wellness Academy · Shadow mode  
- **Description:** A calm private Shadow mode room…  
- **theme-color:** `#E8612E`

Access blocks crawlers by default, so they never reach our HTML. Add a **second policy** on the `shadow` Access app (order **above** Partners allowlist):

1. Zero Trust → Access → Applications → **shadow** → Policies  
2. **Create new policy** → name `Link preview crawlers` → Action **Bypass**  
3. Include → **User Agent** (or equivalent) matching e.g.  
   `.*facebookexternalhit.*|.*Twitterbot.*|.*LinkedInBot.*|.*Slackbot.*|.*WhatsApp.*|.*Discordbot.*|.*TelegramBot.*|.*Applebot.*`  
4. Save. Keep **Partners allowlist** as Allow for the three emails. 

Humans still hit Access login; only those bots see **Shadow Access** OG.

## Ticket storage

1. **Primary:** Cloudflare KV (`SHADOW_TICKETS`)  
2. **Mirror:** Google Sheets via `SHEETS_WEBHOOK_URL` (create / comment / status + optional full `sync`)

Without the secret, tickets still work in KV; Sheets stays empty until the webhook is set.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tickets` | List all tickets |
| POST | `/api/tickets` | Create ticket (+ Sheets `ticket_created`) |
| GET | `/api/tickets/:id` | Ticket + comments |
| POST | `/api/tickets/:id/comments` | Add comment (+ Sheets `comment_added`) |
| PATCH | `/api/tickets/:id` | Update status (+ Sheets `status_changed`) |
| POST | `/api/assets` | Upload replacement image to Drive (+ Sheets `asset_upload`) |
| GET | `/api/audit` | Full JSON export |
| POST | `/api/audit` | Full replace sync to Sheets |
| GET | `/api/insights?path=/services/` | Page insights — GSC + GA4 (28 days); link graph stays client-side |
| GET | `/api/auth/google/start` | Start Google OAuth (redirect to consent) |
| GET | `/api/auth/google/callback` | OAuth callback (stores tokens in KV) |
| GET | `/api/auth/google/status` | Connection status (Google account, GSC, GA4) |
| POST | `/api/auth/google/disconnect` | Clear stored OAuth tokens |

## Google OAuth (partner connect — v1.18.2)

Partners connect their own Google account from **Settings** in the toolbar. Tokens are stored in Cloudflare KV (`SHADOW_TICKETS`, keys prefixed `oauth:tokens:`). The insights API tries the partner OAuth token first, then falls back to the service account if configured.

### 1. Create an OAuth client (Google Cloud Console)

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Web application**
3. **Authorised redirect URIs** (both required):

   - `https://shadow.berkshireyogatraining.co.uk/api/auth/google/callback`
   - `https://berkshire-yoga-training-shadow.pages.dev/api/auth/google/callback`

4. Copy **Client ID** and **Client secret** (secret never goes to the browser)

### 2. OAuth consent screen

- User type: **External** (or Internal if all partners are in the same Workspace)
- Scopes used by Shadow:

  - `https://www.googleapis.com/auth/webmasters.readonly`
  - `https://www.googleapis.com/auth/analytics.readonly`
  - `openid`, `email`

Partners must have Search Console and GA4 access on the Berkshire Yoga Training properties.

### 3. Wrangler secrets

```bash
npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID --project-name=berkshire-yoga-training-shadow
npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_SECRET --project-name=berkshire-yoga-training-shadow
```

Redeploy after setting secrets. Without them, Settings shows *Connect unavailable — ask Marko to configure OAuth client*.

### 4. Session identity

- Cookie `shadow_oauth_sid` (random UUID) when Cloudflare Access email header is absent
- When `Cf-Access-Authenticated-User-Email` is present, tokens are keyed by partner email (persists across devices)

### 5. Insights auth order

1. Valid OAuth token for the current session / Access email  
2. Else `GOOGLE_SERVICE_ACCOUNT_JSON` (service account JWT)  
3. Else not configured — hints in Insights and Settings

`GA4_PROPERTY_ID` and `GSC_SITE_URL` remain environment variables (Marko). OAuth grants API access; property ID and preferred GSC site URL are still read from env, or the first verified Search Console site from the partner account when `GSC_SITE_URL` is unset.

## Google Search Console and GA4 (Page insights)

Page insights open from **Insights** in the toolbox (Summary, Search, Traffic, Link graph). `/api/insights?path=…` powers GSC and GA4 cards. The **link graph** works without any Google credentials (client-side sitemap crawl only).

### 1. Create a Google Cloud service account

1. Google Cloud Console → **IAM & Admin** → **Service accounts** → **Create**
2. Grant no project roles required for read-only APIs (API access is via Search Console / GA4 property sharing)
3. **Keys** → **Add key** → JSON — download the key file (keep private)

### 2. Enable APIs

In the same GCP project, enable:

- **Google Search Console API**
- **Google Analytics Data API**

### 3. Share properties with the service account email

- **Search Console:** Property → **Settings** → **Users and permissions** → Add the service account email (e.g. `…@….iam.gserviceaccount.com`) as **Full** or **Restricted** with read access
- **GA4:** Admin → **Property access management** → Add the service account email as **Viewer**

Note the **GSC property URL** format:

- Domain property: `sc-domain:berkshireyogatraining.co.uk`
- URL-prefix property: `https://berkshireyogatraining.co.uk/`

Note the **GA4 numeric Property ID** (Admin → Property settings).

### 4. Wrangler secrets (berkshire-yoga-training-shadow)

Paste the **entire** JSON key file contents for the service account secret (single-line JSON string):

```bash
npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_JSON --project-name=berkshire-yoga-training-shadow
# paste full JSON when prompted

npx wrangler pages secret put GSC_SITE_URL --project-name=berkshire-yoga-training-shadow
# e.g. sc-domain:berkshireyogatraining.co.uk

npx wrangler pages secret put GA4_PROPERTY_ID --project-name=berkshire-yoga-training-shadow
# e.g. 123456789
```

Redeploy the `shadow` branch after setting secrets. Without secrets, Summary shows **Not configured** cards and setup hints — no errors.

Response shape when configured: GSC clicks, impressions, CTR, position, top queries, page rank by clicks; GA4 sessions, users, engagement rate, avg engagement time, rank by sessions, vs site averages.

## Meridian workflow

1. Partners comment only on shadow. Use **Comment**, **Accept**, or **Done** on each ticket.
2. Meridian implements on `shadow` branch, sets status **On shadow**, then **Ready for review**.
3. Katia / Raili use **Done** in the ticket thread when a shadow change looks right.
4. Marko ports the change to `main` and deploys live.
5. Status → **Shipped to live**.

Never merge shadow-review overlay files onto live `main` without stripping them.

## Isolation rules

- Live project: `berkshire-yoga-training` ← `main` only  
- Shadow project: `berkshire-yoga-training-shadow` ← `shadow` only  
- Shadow pages send `noindex` via middleware  
