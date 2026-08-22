# Deployment — berkshireyogatraining.co.uk

## What is live

**Pre-launch (default in repo):** `_redirects` rewrites `/` to `coming-soon.html` on Cloudflare Pages. Visitors see the coming soon page at the root; the full site remains available at `/index.html` for preview.

**Go live with full site:** delete `_redirects` (or remove the rewrite line) and push to `main`. See `DEPLOY-COMING-SOON.md` for swap and restore options.

| Mode | Root `/` | Dev / preview |
|------|----------|----------------|
| Pre-launch | `coming-soon.html` (via `_redirects`) | `/index.html` |
| Full site | `index.html` | same |

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Project name | `berkshire-yoga-training` |
| Production branch | `main` |
| Build command | *(none — static HTML)* |
| Build output | `/` (repo root) |

## Custom domain

1. Add `berkshireyogatraining.co.uk` (and optionally `www`) in Cloudflare Pages → Custom domains.
2. If the domain is already on Cloudflare, DNS records are added automatically.
3. If the domain is elsewhere, point nameservers to Cloudflare or add a CNAME to the Pages hostname.

## GitHub Actions secrets

In the GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Where to find it |
|--------|------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create token with **Cloudflare Pages Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → any zone → right sidebar **Account ID** |

After secrets are set, every push to `main` redeploys the site.

## Manual deploy (without GitHub Actions)

```bash
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
```
