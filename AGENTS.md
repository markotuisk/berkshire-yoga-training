# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static marketing website** (Thames Wellness Academy / Berkshire Yoga Training). It is plain HTML, CSS, and vanilla JS with **no build step, no package manager, and no dependency manifests**. Python 3 is preinstalled and is the only tool needed to run it.

### Run the site (dev)

Serve the repo root with Python's static server (documented in `README.md`):

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`. Pages: `about.html`, `contact.html`, `journal.html`, `research.html`, `join.html`, and the Services hub at `services/` (with subpages `services/foundation-training/`, `services/cpd/`, `services/workshops/`, `services/retreats/`).

### Non-obvious caveats

- The `_redirects` file (e.g. `/ -> /coming-soon.html`, `/owners -> /full-home.html`, and the `301` service redirects) is **Cloudflare Pages only**. Python's `http.server` ignores it, so locally `/` serves the full `index.html` and the pretty owner/redirect URLs do not resolve — navigate to the actual `.html` files (or `services/`) directly.
- There is **no lint, no test suite, and no build command**. "Build" for Cloudflare/GitHub Pages is just publishing the repo root as-is. Do not look for `npm`/`pnpm`/`make` targets.
- `docs/generate-pdf.py` and `docs/generate_document.py` are auxiliary content/PDF generators (they import `fpdf`), **not** part of the website runtime. They are unrelated to serving or deploying the site; only install `fpdf` ad hoc if you specifically need to regenerate the docs PDF.
- Deployment targets: GitHub Pages (full site at `/`) and Cloudflare Pages (coming-soon at `/`). See `DEPLOY.md` and `DEPLOY-COMING-SOON.md`.
