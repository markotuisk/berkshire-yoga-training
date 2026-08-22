# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Share with partners (full site)

The **entire site** is live at the root URL (home, programmes, about, team, journal, contact). Coming soon is **not** shown at `/`.

**Share this link now:**

**https://markotuisk.github.io/berkshire-yoga-training/**

| Page | URL |
|------|-----|
| Home | `/` |
| About | `/about.html` |
| Foundation Training | `/foundation-training.html` |
| CPD | `/cpd.html` |
| Workshops | `/workshops.html` |
| Retreats | `/retreats.html` |
| Research | `/research.html` |
| Journal | `/journal.html` |
| Contact | `/contact.html` |
| Join | `/join.html` |

Coming soon (pre-launch only): `/coming-soon.html`

Custom domain when Cloudflare Pages is connected: **https://berkshireyogatraining.co.uk** (see `DEPLOY.md`).

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

- **GitHub Pages:** auto-deploys from `main` (partner link above)
- **Cloudflare Pages:** push `main` or see `.github/workflows/deploy.yml` (needs API secrets)
- **Manual:** `npx wrangler pages deploy . --project-name=berkshire-yoga-training`

See `DEPLOY.md` for custom domain on Cloudflare.
