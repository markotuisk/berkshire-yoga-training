# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Public vs owners

| Audience | Link |
|----------|------|
| **Public** (coming soon) | [https://berkshireyogatraining.co.uk/](https://berkshireyogatraining.co.uk/) **LIVE** (Cloudflare) |
| **Public** (pages.dev) | [https://berkshire-yoga-training.pages.dev/](https://berkshire-yoga-training.pages.dev/) |
| **Owners / dev** | [https://berkshireyogatraining.co.uk/owners](https://berkshireyogatraining.co.uk/owners) or `/index-full` on Cloudflare (`/index.html` cannot bypass coming soon on Cloudflare). Or [GitHub Pages](https://markotuisk.github.io/berkshire-yoga-training/) (full site at `/`). |

Cloudflare Pages uses `_redirects` so `/` serves `coming-soon.html`. GitHub Pages does **not** use `_redirects`, so the GitHub link is the simplest owner preview.

## Site map (full site)

| Page | URL |
|------|-----|
| Home (owners on Cloudflare) | `/owners` or `/index-full` |
| About | `/about.html` |
| Services | `/services/` |
| Foundation Training | `/services/foundation-training/` |
| CPD | `/services/cpd/` |
| Workshops | `/services/workshops/` |
| Retreats | `/services/retreats/` |
| Research | `/research.html` |
| Journal | `/journal.html` |
| Contact | `/contact.html` |
| Join | `/join.html` |

Coming soon page (also served at `/` on Cloudflare): `/coming-soon.html`

**Custom domain:** `berkshireyogatraining.co.uk` is **LIVE** on Cloudflare Pages (apex only; `www` is not configured). See `DEPLOY.md`.

Social previews use `assets/og-image.jpg` and Open Graph meta on every page. `og:url`, `canonical`, and `twitter:image` use `https://berkshireyogatraining.co.uk`.

**Test social previews** (paste a production URL, e.g. `https://berkshireyogatraining.co.uk/about.html`):

- [opengraph.xyz](https://www.opengraph.xyz/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

Example image URL: `https://berkshireyogatraining.co.uk/assets/og-image.jpg`

## Local preview

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`

## Deploy

- **GitHub Pages:** auto-deploys from `main` (full site at `/` for owners)
- **Cloudflare Pages:** push `main` or see `.github/workflows/deploy.yml` (needs API secrets)
- **Manual:** `npx wrangler pages deploy . --project-name=berkshire-yoga-training`

See `DEPLOY.md` and `DEPLOY-COMING-SOON.md` for coming soon vs full site behaviour.
