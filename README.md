# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Share with partners

Open the live site (full homepage, not coming soon):

- **Pages preview:** [https://berkshire-yoga-training.pages.dev](https://berkshire-yoga-training.pages.dev)
- **Custom domain (when DNS is live):** [https://berkshireyogatraining.co.uk](https://berkshireyogatraining.co.uk)

Social link previews use `assets/og-image.jpg` (1200×630) and Open Graph meta on every page.

## Local preview

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`

## Share with partners

| URL | What they see |
|-----|----------------|
| `http://localhost:8765/` | Full site (home, programmes, team) |
| `http://localhost:8765/coming-soon.html` | LearnBuddy-style coming soon page |

Once Cloudflare Pages is connected (see `DEPLOY.md`), use **https://berkshireyogatraining.co.uk** for the full site. Coming soon stays at `/coming-soon.html` until you add `_redirects` for pre-launch.

## Deploy

- **GitHub:** push `main` to trigger Cloudflare Pages (see `.github/workflows/deploy.yml`)
- **Manual:** `npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main`

Requires Cloudflare API token (Pages Edit) and account ID. See `DEPLOY.md`.
