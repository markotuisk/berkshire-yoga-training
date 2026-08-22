# Deploy coming soon page

Use this when **berkshireyogatraining.co.uk** should show the holding page while the full site remains in the repo for development.

## Preview locally

Open `/coming-soon.html` in the browser before going live.

| URL | What you see |
|-----|----------------|
| `/coming-soon.html` | Coming soon landing (always) |
| `/index.html` | Full multi-page site (dev preview) |

## Production options

Choose **one** approach. The full `index.html` is never deleted; `index-full.html` is an additional backup of the homepage.

### Option A: Cloudflare Pages rewrite (recommended)

Add or enable `_redirects` at the repo root (already included):

```
/ /coming-soon.html 200
```

This serves `coming-soon.html` at the domain root while keeping the full site at `/index.html` for preview. Remove or comment out the rule when the full site should be live at `/`.

Deploy by pushing to `main` (GitHub Actions) or `npx wrangler pages deploy . --project-name=berkshire-yoga-training`.

### Option B: Swap files on the server

```bash
# Backup full homepage (if not already done)
cp index.html index-full.html

# Go live with coming soon at root
mv index.html index-dev.html
cp coming-soon.html index.html
# Also copy styles: cp coming-soon.css coming-soon.css stays linked from index.html

git add -A && git commit -m "Pre-launch: coming soon as index"
git push
```

Restore the full site:

```bash
mv index-dev.html index.html
git add -A && git commit -m "Go live: restore full site"
git push
```

### Option C: Cloudflare dashboard redirect

In Cloudflare → Rules → Redirect Rules (or Page Rules), redirect `berkshireyogatraining.co.uk/` to `/coming-soon.html`. No file changes required; remove the rule at go-live.

## Email sign-up form

The subscribe form in `coming-soon.html` is **markup only** (no backend). To collect emails you need one of:

- **Formspree / Netlify Forms / Cloudflare Workers** — set `action` on the form
- **Mailchimp / Buttondown** embed
- **mailto fallback** — footer link `info@thameswellnessacademy.co.uk` works today

Until connected, the note under the form tells visitors to email directly.

## File map

| File | Role |
|------|------|
| `coming-soon.html` | Standalone coming soon page |
| `coming-soon.css` | Scoped styles (not `css/styles.css`) |
| `index.html` | Full site homepage (production when not using rewrite) |
| `index-full.html` | Backup copy of full homepage |
| `_redirects` | Optional Cloudflare Pages root → coming soon |

## Typography and brand

- **Figtree** only (no Cormorant on this page)
- Golden accent `#F5BF03`, hover `#E0AD03`, text on gold `#1D1D1F`
- British English, no em dashes in copy
- Layout reference: [LearnBuddy coming soon](https://learnbuddytemplate.webflow.io/landing-pages/coming-soon)
