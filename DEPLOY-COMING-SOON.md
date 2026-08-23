# Deploy coming soon page

Use this when **berkshireyogatraining.co.uk** should show the holding page at `/` while the full site remains in the repo for owners and developers.

## URLs (current setup)

| Audience | URL |
|----------|-----|
| Public | [https://berkshireyogatraining.co.uk/](https://berkshireyogatraining.co.uk/) |
| Owners on custom domain (Cloudflare) | [https://berkshireyogatraining.co.uk/owners](https://berkshireyogatraining.co.uk/owners) |
| Owners on GitHub Pages (full site at `/`, no `_redirects`) | [https://markotuisk.github.io/berkshire-yoga-training/](https://markotuisk.github.io/berkshire-yoga-training/) |
| Cloudflare pages.dev (same rewrite as custom domain) | [https://berkshire-yoga-training.pages.dev/](https://berkshire-yoga-training.pages.dev/) → coming soon; full homepage at `/owners` (`/index.html` redirects to `/` on Cloudflare) |

## Preview locally

Open `/coming-soon.html` in the browser before going live.

| URL | What you see |
|-----|----------------|
| `/coming-soon.html` | Coming soon landing (always) |
| `/index.html` | Full multi-page site (dev preview) |

## Production options

Choose **one** approach. The full `index.html` is never deleted; `full-home.html` is an additional backup of the homepage.

### Option A: Cloudflare Pages rewrite (recommended, active)

`_redirects` at the repo root:

```
/ /coming-soon.html 200
```

Cloudflare Pages serves `coming-soon.html` at `/` with a 200 rewrite. The full homepage is at `/owners` (`full-home.html`). Other HTML pages are unchanged. `/index.html` is redirected to `/` by Pages, so it shows coming soon. **GitHub Pages ignores `_redirects`**, so the GitHub Pages URL still shows the full site at `/`.

Deploy by pushing to `main` (GitHub Actions) or:

```bash
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
```

Remove or comment out the rule when the full site should be public at `/`.

### Option B: Swap files on the server

```bash
# Backup full homepage (if not already done)
cp index.html full-home.html

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

- **Formspree / Netlify Forms / Cloudflare Workers**: set `action` on the form
- **Mailchimp / Buttondown** embed
- **mailto fallback**: footer link `info@thameswellnessacademy.co.uk` works today

Until connected, the note under the form tells visitors to email directly.

## File map

| File | Role |
|------|------|
| `coming-soon.html` | Standalone coming soon page |
| `coming-soon.css` | Scoped styles (not `css/styles.css`) |
| `index.html` | Full site homepage |
| `full-home.html` | Backup copy of full homepage |
| `_redirects` | Cloudflare Pages root → coming soon (not used on GitHub Pages) |

## Typography and brand

- **Figtree** only (no Cormorant on this page)
- Golden accent `#F5BF03`, hover `#E0AD03`, text on gold `#1D1D1F`
- British English, no em dashes in copy
- Layout reference: [LearnBuddy coming soon](https://learnbuddytemplate.webflow.io/landing-pages/coming-soon)
