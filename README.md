# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Public site

| Audience | Link |
|----------|------|
| **Public** | [https://berkshireyogatraining.co.uk/](https://berkshireyogatraining.co.uk/) **LIVE** (Cloudflare) |
| **Preview** | [https://berkshire-yoga-training.pages.dev/](https://berkshire-yoga-training.pages.dev/) |
| **GitHub Pages** | [https://markotuisk.github.io/berkshire-yoga-training/](https://markotuisk.github.io/berkshire-yoga-training/) |

The full site is served at `/` on Cloudflare Pages (`index.html`). Owner preview copies remain at `/owners` and `/index-full` (not indexed).

## Site map

| Page | URL |
|------|-----|
| Home | `/` |
| About | `/about.html` |
| Team | `/team.html` |
| Services | `/services/` |
| Foundation Training | `/services/foundation-training/` |
| CPD | `/services/cpd/` |
| Workshops | `/services/workshops/` |
| Retreats | `/services/retreats/` |
| Research | `/research.html` |
| Journal | `/journal.html` |
| Contact | `/contact.html` |
| Join | `/join.html` |

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

See `DEPLOY.md` for deployment and Search Console setup.
