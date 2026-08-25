# Shadow review site setup

Private review copy of Thames Wellness Academy.

- **Shadow URL (custom):** https://shadow.berkshireyogatraining.co.uk  
- **Shadow preview:** https://berkshire-yoga-training-shadow.pages.dev  
- **Live URL:** https://berkshireyogatraining.co.uk (unchanged)  
- **Agent:** Meridian  

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

1. Create a Google Sheet named e.g. `TWA Shadow review — Meridian`  
2. Create four tabs with headers from `docs/SHADOW-SHEETS-TEMPLATE.md`: `Tickets`, `Comments`, `Audit_Log`, `People`  
3. **Extensions → Apps Script** → paste `docs/shadow-sheets-apps-script.js` → Save  
4. **Deploy → New deployment → Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone** (Cloudflare posts server-side; URL stays secret)  
5. Copy the web app URL  
6. Set the Pages secret:

```bash
npx wrangler pages secret put SHEETS_WEBHOOK_URL --project-name=berkshire-yoga-training-shadow
# paste the Apps Script web app URL when prompted
```

7. Optional full resync after deploy: `POST https://berkshire-yoga-training-shadow.pages.dev/api/audit`  
   (or the custom domain once Access allows you through)

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

Middleware rewrites social meta on every HTML page:

- **Title:** Thames Wellness Academy · Shadow review  
- **Description:** A calm private Shadow review room to refine the Academy site together. Flag copy, images and details before anything goes live. For Katia, Raili and Marko only.  
- **Image:** `https://berkshireyogatraining.co.uk/assets/og-image.jpg`  
- **theme-color:** `#E8612E`

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
