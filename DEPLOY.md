# Deployment: thameswellnessacademy.co.uk

## Custom domain status

| Domain | Status |
|--------|--------|
| `thameswellnessacademy.co.uk` | **Primary** — Cloudflare Pages custom domain (HTTPS) |
| `www.thameswellnessacademy.co.uk` | Pages custom domain (CNAME → same project) |
| `berkshireyogatraining.co.uk` | Legacy — path-preserving **301** to matching `thameswellnessacademy.co.uk` URLs |

## Cloudflare Pages

- **Account:** Markotuisk (`bc3f6c1145456bef0f781f62744c74ed`)
- **Project:** `berkshire-yoga-training`
- **Production URL:** https://thameswellnessacademy.co.uk/
- **DNS zone for new domain:** Raili.maripuu account (`a40062723d2f712d6608f25f92a855f2`), zone `aa4cbc2d35767a2d305d684e6a8bbdb3` — proxied CNAMEs to `berkshire-yoga-training.pages.dev`
- **Legacy zone:** `berkshireyogatraining.co.uk` in Marko account — Single Redirect rule (301, path + query preserved)

## Deploy

```bash
npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main
```

Optional Pages env (backup to zone redirect rule):

```bash
npx wrangler pages secret put ENABLE_DOMAIN_MIGRATION_REDIRECTS --project-name=berkshire-yoga-training
# value: 1
```

Middleware in `functions/_middleware.js` 301s old hosts when that env is `1`.

## Domain migration (SEO cutover)

Primary public hostname: `https://thameswellnessacademy.co.uk`

### Done
- Absolute canonicals, Open Graph, JSON-LD, sitemap, robots, and agent files use `thameswellnessacademy.co.uk`.
- New domain serves the same Pages project (same paths).
- Old zone Single Redirect: old host `/*` → `https://thameswellnessacademy.co.uk` + path (301, preserve query).

### Search Console
1. Verify `sc-domain:thameswellnessacademy.co.uk` (or URL-prefix).
2. Submit `https://thameswellnessacademy.co.uk/sitemap.xml`.
3. On the old property: **Change of Address** → new domain (after 301s work).
4. Spot-check URL Inspection on home, foundation 200-hour, team pages.

Keep the old domain registered and redirecting for at least 180 days (prefer 12+ months).


### Search Console / DNS status (2026-10-14)

- Verified Domain + URL-prefix for thames; legacy berkshire Domain + URL-prefix kept.
- Sitemap submitted on URL-prefix: `/sitemap.xml` → Success (43 pages).
- URL Inspection + indexing requested for home, foundation 200-hour, Katia.
- Change of Address: filed (old property Settings shows move to `thameswellnessacademy.co.uk`; Cancel move available).
- Live DNS stays on Raili’s zone (NS gerald/pearl). Google MX + SPF + soft DMARC (`p=none`) added via Raili API token (Keychain: `cloudflare-api-token-thameswellnessacademy` / `raili-maripuu`).
- Marko duplicate pending zone (jamie/yahir) removed — do not switch registrar NS.
- Still needed from Google Admin: DKIM TXT (`google._domainkey`) after Workspace domain verification.
- Keep old domain 301s for 180+ days.

### Email addresses (policy)

| Role | Address | Where it appears |
|------|---------|------------------|
| Public contact | `contact@thameswellness.com` | Site mailto, schema `email`, contact copy, `security.txt`, form fallbacks |
| System / transactional From | `noreply@thameswellnessacademy.co.uk` | Send-only automated mail (confirmations, receipts). **Never** shown as a contact address on the site |

- Google Workspace on `thameswellnessacademy.co.uk` handles inbound for real people/aliases if needed; `noreply@` is not a public inbox.
- Enabling Cloudflare Email Routing on the apex would conflict with Google MX — do not turn it on for this domain.
- To send as `noreply@…`, onboard the domain in Resend (or Cloudflare Email Sending) and add their SPF/DKIM records on Raili’s zone; keep public contact on `@thameswellness.com`.
