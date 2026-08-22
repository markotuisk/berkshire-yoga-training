# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Public vs owners

| Audience | Link |
|----------|------|
| **Public** (coming soon) | [https://berkshireyogatraining.co.uk/](https://berkshireyogatraining.co.uk/) (Cloudflare; needs DNS) |
| **Public** (pages.dev) | [https://berkshire-yoga-training.pages.dev/](https://berkshire-yoga-training.pages.dev/) |
| **Owners / dev** | [https://berkshireyogatraining.co.uk/index-full](https://berkshireyogatraining.co.uk/index-full) on Cloudflare, or [https://markotuisk.github.io/berkshire-yoga-training/](https://markotuisk.github.io/berkshire-yoga-training/) (full site at `/`, no `_redirects`) |

Cloudflare Pages uses `_redirects` so `/` serves `coming-soon.html`. GitHub Pages does **not** use `_redirects`, so the GitHub link is the simplest owner preview.

## Site map (full site)

| Page | URL |
|------|-----|
| Home (owners on Cloudflare) | `/index-full` |
| About | `/about.html` |
| Foundation Training | `/foundation-training.html` |
| CPD | `/cpd.html` |
| Workshops | `/workshops.html` |
| Retreats | `/retreats.html` |
| Research | `/research.html` |
| Journal | `/journal.html` |
| Contact | `/contact.html` |
| Join | `/join.html` |

Coming soon page (also served at `/` on Cloudflare): `/coming-soon.html`

Custom domain DNS: see `DEPLOY.md`.

Social previews use `assets/og-image.jpg` and Open Graph meta on every page. `og:url` and `og:image` use the GitHub Pages host until the custom domain is live.

**Test social previews** (paste the GitHub Pages URL):

- [opengraph.xyz](https://www.opengraph.xyz/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

Example image URL: `https://markotuisk.github.io/berkshire-yoga-training/assets/og-image.jpg`

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
