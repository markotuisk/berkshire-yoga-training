# Deployment — berkshireyogatraining.co.uk

## Share with partners

**Open:** [https://berkshire-yoga-training.pages.dev](https://berkshire-yoga-training.pages.dev)

When custom DNS is configured: [https://berkshireyogatraining.co.uk](https://berkshireyogatraining.co.uk)

The root URL serves the **full site** (`index.html`) for partner demos. To show coming soon at `/` again, restore the rewrite in `_redirects` (see `DEPLOY-COMING-SOON.md`).

## What is live

| Mode | Root `/` | Notes |
|------|----------|--------|
| **Partner demo (current)** | `index.html` | `_redirects` has no active rewrite |
| Pre-launch | `coming-soon.html` | Add `/ /coming-soon.html 200` to `_redirects` |

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Project name | `berkshire-yoga-training` |
| Production branch | `main` |
| Build command | *(none — static HTML)* |
| Build output | `/` (repo root) |
| Preview URL | `https://berkshire-yoga-training.pages.dev` |

## Custom domain

1. Add `berkshireyogatraining.co.uk` (and optionally `www`) in Cloudflare Pages → Custom domains.
2. If the domain is already on Cloudflare, DNS records are added automatically.
3. If the domain is elsewhere, point nameservers to Cloudflare or add a CNAME to the Pages hostname.

## GitHub Actions secrets (required for auto-deploy)

In the GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Where to find it |
|--------|------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create token with **Cloudflare Pages Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → any zone → right sidebar **Account ID** |

After secrets are set, every push to `main` redeploys the site. Previous workflow runs failed because these secrets were not configured.

## Manual deploy (without GitHub Actions)

```bash
npx wrangler login
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
```

Or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your environment.

## Open Graph

- Default share image: `assets/og-image.jpg` (1200×630)
- Canonical URLs use `https://berkshireyogatraining.co.uk`
- All main HTML pages include `og:*` and `twitter:*` meta tags
