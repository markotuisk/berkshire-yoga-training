# Deployment: berkshireyogatraining.co.uk

## Custom domain status

| Domain | Status |
|--------|--------|
| `berkshireyogatraining.co.uk` | **LIVE** (Cloudflare Pages, HTTPS, HTTP→HTTPS redirect) |
| `www.berkshireyogatraining.co.uk` | Not configured (no DNS record) |

## Public site (live)

| Audience | URL | What you see |
|----------|-----|----------------|
| **Public** | [https://berkshireyogatraining.co.uk/](https://berkshireyogatraining.co.uk/) | Full site (`index.html` at `/`) |
| **Owners / dev preview** | [https://berkshireyogatraining.co.uk/owners](https://berkshireyogatraining.co.uk/owners) | Homepage backup (`full-home.html`) |
| **GitHub Pages** | [https://markotuisk.github.io/berkshire-yoga-training/](https://markotuisk.github.io/berkshire-yoga-training/) | Full site at `/` (GitHub Pages does **not** read `_redirects`) |

**Cloudflare Pages preview host:** [https://berkshire-yoga-training.pages.dev/](https://berkshire-yoga-training.pages.dev/) mirrors the custom domain.

**Custom domain:** `berkshireyogatraining.co.uk` is attached on the Pages project and DNS is active on Cloudflare.

## What is live

| Host | Root `/` | Notes |
|------|----------|-------|
| Cloudflare Pages (production + pages.dev) | `index.html` (full homepage) | `/coming-soon.html` redirects to `/` |
| GitHub Pages | `index.html` (full site) | Same as always |

Legacy `/coming-soon.html` requests receive a 301 redirect to `/` via `_redirects`.

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Project name | `berkshire-yoga-training` |
| Production branch | `main` |
| Build command | (none, static HTML) |
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


Before the workflow deploys, set repository variable **CLOUDFLARE_PAGES_ENABLED** to `true` (Settings → Secrets and variables → Actions → Variables). Leave it unset or `false` until secrets below are ready; pushes will then skip Cloudflare deploy without failing.
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

## Sitemap and search indexing

- `sitemap.xml` and `robots.txt` live at the repo root and are served at `/sitemap.xml` and `/robots.txt`.
- Canonical URLs in the sitemap use `https://berkshireyogatraining.co.uk`.
- Submit `https://berkshireyogatraining.co.uk/sitemap.xml` in [Google Search Console](https://search.google.com/search-console) (Sitemaps) for the property.

## First-time setup in the Cloudflare dashboard (no API token)

If you prefer not to use GitHub Actions secrets yet:

1. Log in to [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorise GitHub and select **markotuisk/berkshire-yoga-training**, branch **main**.
3. Build settings: **Framework preset** None, **Build command** empty, **Build output directory** `/` (site files at repo root).
4. Deploy, then **Custom domains** → add **berkshireyogatraining.co.uk** (and **www** if needed). DNS is created automatically when the zone is on Cloudflare nameservers.
5. Optional: disable the GitHub Actions workflow or add the same secrets so pushes to `main` also deploy via Actions.

After a manual `wrangler` deploy, add the domain with:

```bash
npx wrangler pages project list
npx wrangler pages domain add berkshire-yoga-training berkshireyogatraining.co.uk
```
