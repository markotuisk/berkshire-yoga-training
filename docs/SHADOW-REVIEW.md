# Shadow review site setup

Private review copy of Thames Wellness Academy.

- **Shadow URL:** https://shadow.berkshireyogatraining.co.uk  
- **Live URL:** https://berkshireyogatraining.co.uk (unchanged)  
- **Agent:** Meridian  

## Team

| Name | Role |
|------|------|
| Katia Major | Business owner |
| Raili Maripuu | Business owner |
| Marko Tuisk | SEO and development |
| Meridian | Implementation agent |

## How partners use it

1. Open the shadow site (Cloudflare Access login).
2. Choose your name (Katia / Raili / Marko).
3. Ticket inbox opens with your tickets (ID, date, status).
4. Click **Pick element** (or Alt+click) on any text, image, or button.
5. Add category + comment → ticket created.
6. Open a ticket to read the thread and add further comments.

Statuses: Open → In progress → Ready for review → Approved → Shipped to live.

## Deploy shadow (Marko / Meridian)

```bash
git checkout shadow
npx wrangler pages project create berkshire-yoga-training-shadow   # once
npx wrangler pages deploy . --project-name=berkshire-yoga-training-shadow --branch=shadow --commit-dirty=true
```

### Custom domain

1. Cloudflare Dashboard → Pages → `berkshire-yoga-training-shadow` → Custom domains  
2. Add `shadow.berkshireyogatraining.co.uk`  
3. DNS CNAME `shadow` → `berkshire-yoga-training-shadow.pages.dev` (or follow dashboard)

### Cloudflare Access

1. Zero Trust → Access → Applications → Add application → Self-hosted  
2. Application domain: `shadow.berkshireyogatraining.co.uk`  
3. Policy: Allow emails for Marko, Katia, Raili  
4. Save and test in a private window

## Ticket storage

API stores tickets in memory per isolate by default, or Cloudflare KV when bound as `SHADOW_TICKETS`.

### Optional KV (persistent)

```bash
npx wrangler kv namespace create SHADOW_TICKETS
```

Bind in Pages project settings: Settings → Functions → KV namespace bindings → `SHADOW_TICKETS`.

### Google Sheets (audit export)

1. Create a Google Sheet with tabs: `Tickets`, `Comments`, `Audit_Log`, `People`  
2. Export JSON for sync: `GET /api/audit` on the shadow site (while logged in / from Wrangler preview)  
3. Paste into Sheets, or wire a service account later (see plan Step 3–4)

Column reference matches the workbook design in the project plan (full audit trail).

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tickets` | List tickets (`?author=Name`) |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/:id` | Ticket + comments |
| POST | `/api/tickets/:id/comments` | Add comment |
| PATCH | `/api/tickets/:id` | Update status (`status`, `actor`) |
| GET | `/api/audit` | Full export for Sheets |

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
