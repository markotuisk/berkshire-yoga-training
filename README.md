# Berkshire Yoga Training (Thames Wellness Academy)

Static marketing site for professional wellness education in Berkshire and Buckinghamshire.

## Local preview

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`

## Deploy

- **GitHub:** push `main` to trigger Cloudflare Pages (see `.github/workflows/deploy.yml`)
- **Manual:** `npx wrangler pages deploy . --project-name=berkshire-yoga-training`

Live domain: [berkshireyogatraining.co.uk](https://berkshireyogatraining.co.uk)
