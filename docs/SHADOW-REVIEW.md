# Shadow review site setup

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
3. Ticket inbox opens with your tickets (ID, date, status).
4. Click **Pick element** (or ⌘/Alt+click) on any text, image, or button.
5. Add category + comment → ticket created (stored in KV and mirrored to Google Sheets).
6. Open a ticket to read the thread and add further comments.

Statuses: Open → In progress → Ready for review → Approved → Shipped to live.

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
2. Application name: `TWA Shadow review`  
3. Domain: `shadow.berkshireyogatraining.co.uk` (also add `berkshire-yoga-training-shadow.pages.dev` so the preview URL is gated)  
4. Identity: **One-time PIN** (simplest) and/or Google  
5. Policy **Allow**: emails for Marko (`markotuisk@gmail.com`), Katia (`Katia.major@thameswellness.com`), and Raili (`raili.maripuu@thameswellness.com`)  
6. Save → test in a private window  

#### Access login branding

1. Zero Trust → **Reusable components** → **Custom pages** → Access login page → **Manage**  
2. Organisation name: **Thames Wellness Academy**  
3. Logo + header **Shadow review** · footer **Partners only · not the public site**  
4. Brand orange `#E8612E` where colour fields allow  

### C. Google Sheet + Apps Script

**Spreadsheet (already created):**  
https://docs.google.com/spreadsheets/d/12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY/edit  
ID: `12syDpdZwS0ZtDPqKXLedHHfie0xyhGvJ3HFc_oEUDwY`

Do **not** put the spreadsheet edit URL into `SHEETS_WEBHOOK_URL`. That secret must be the Apps Script **web app** URL (`https://script.google.com/macros/s/.../exec`).

1. Open **this** Sheet (link above).  
2. Ensure four tabs exist with headers from `docs/SHADOW-SHEETS-TEMPLATE.md`: `Tickets`, `Comments`, `Audit_Log`, `People` (seed People rows from the template).  
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

**2. Shadow review** (normal pages after you are logged in)

- **Title:** Thames Wellness Academy · Shadow review  
- **Description:** A calm private Shadow review room…  
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
| GET | `/api/tickets` | List tickets (`?author=Name`) |
| POST | `/api/tickets` | Create ticket (+ Sheets `ticket_created`) |
| GET | `/api/tickets/:id` | Ticket + comments |
| POST | `/api/tickets/:id/comments` | Add comment (+ Sheets `comment_added`) |
| PATCH | `/api/tickets/:id` | Update status (+ Sheets `status_changed`) |
| GET | `/api/audit` | Full JSON export |
| POST | `/api/audit` | Full replace sync to Sheets |

## Meridian workflow

1. Partners comment only on shadow.  
2. Meridian implements on `shadow` branch, sets status Ready for review.  
3. Katia / Raili approve in the ticket thread.  
4. Marko + Meridian port the change to `main` and deploy live.  
5. Status → Shipped to live.

Never merge shadow-review overlay files onto live `main` without stripping them.

## Isolation rules

- Live project: `berkshire-yoga-training` ← `main` only  
- Shadow project: `berkshire-yoga-training-shadow` ← `shadow` only  
- Shadow pages send `noindex` via middleware  
