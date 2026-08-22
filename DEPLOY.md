# Deployment — berkshireyogatraining.co.uk

## What is live

The **full site** is served at `/` (`index.html` and all programme pages). `coming-soon.html` remains in the repo for optional pre-launch use only (no `_redirects` rewrite).

## GitHub

- Repo: https://github.com/markotuisk/berkshire-yoga-training
- Branch: `main`

## Cloudflare Pages (recommended: Connect Git)

Your domain already uses Cloudflare nameservers (`jamie.ns.cloudflare.com`, `yahir.ns.cloudflare.com`).

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorise GitHub and select **markotuisk/berkshire-yoga-training**.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` or `.`
   - **Production branch:** `main`
4. **Project name:** `berkshire-yoga-training` (must match workflow if using Actions).
5. Deploy, then **Custom domains** → add **berkshireyogatraining.co.uk** and **www.berkshireyogatraining.co.uk** (optional).
6. Cloudflare will create DNS records on the zone automatically.

## GitHub Actions (optional auto-deploy on push)

Workflow: `.github/workflows/deploy.yml`

Add repo secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | API token with **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Workers & Pages → right sidebar **Account ID** |

Then re-run the workflow or push to `main`.

## Manual deploy (Wrangler CLI)

```bash
npx wrangler login          # complete browser OAuth once
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
npx wrangler pages domain add berkshireyogatraining.co.uk --project-name=berkshire-yoga-training
```

## Verify

```bash
curl -I https://berkshire-yoga-training.pages.dev
curl -I https://berkshireyogatraining.co.uk
```

Expect `200` or `301`/`302` to HTTPS once DNS and SSL are active (can take a few minutes).
