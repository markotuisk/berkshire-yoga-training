---
name: twa-website-style
description: >-
  Applies Thames Wellness Academy (TWA) website design system rules when editing
  HTML/CSS, building pages, or matching LearnBuddy layout references. Use when
  working on thameswellnessacademy.co.uk, css/styles.css, TWA page templates,
  LearnBuddy-inspired components, or visual consistency for this site.
---

# TWA Website Style

Design-system skill for **Thames Wellness Academy** static HTML site. LearnBuddy is a **layout reference only** — never publish its style-guide page or LMS/app UI on the live site.

## When to use

Read this skill before:

- Editing any TWA `.html` file or `css/styles.css`
- Adding pages, sections, cards, forms, or navigation
- Translating LearnBuddy template layouts into TWA markup
- Reviewing visual consistency across home, programme, journal, contact, or team pages

## Critical brand constraints

| Rule | Detail |
|------|--------|
| Accent | Vibrant orange `#E8612E`, black `#000000`, pale orange tint `#FDE8DE` |
| Neutrals | Off-white canvas `#F5F5F5`, white cards, black footer |
| Typography | **Figtree** (body, UI, nav, buttons, `.display-9`–`.display-5`), **Cormorant Garamond** (default `h1`–`h4`, logo, hero accents) |
| Gradients | Neutral grey placeholder gradients only (`--gradient-placeholder`). **No warm peach, coral, or orange gradients** |
| CTA dark sections | Orange gradient (`--gradient-cta`: `#E8612E` → `#D14E1F`) |
| Tone | Professional wellness education — **not** an app, LMS dashboard, student portal, or gamified UI |
| Copy | **British English** (`lang="en-GB"`, `-ise` spellings, UK punctuation). **No em dashes** — use commas, colons, or hyphens |
| Placeholders | Label draft images with `.placeholder-label`; keep `[Placeholder]` prefix in draft names |

## Do not

- Create `styles-components.html` or embed the LearnBuddy style guide as site content
- Import LearnBuddy green (`#01CD74`) or dark accent (`#1C2329`) over TWA tokens
- Add dashboard cards, course progress bars, login UI, or "student portal" patterns
- Invent one-off inline styles when an existing class or CSS variable exists
- Use em dashes in user-facing copy

## Workflow for edits

1. **Read** `css/styles.css` and copy patterns from the closest existing page (see mapping below).
2. **Reuse** shared header/footer markup and existing utility/component classes.
3. **Extend** `css/styles.css` in the matching section (layout → buttons → page-specific) using `:root` tokens.
4. **Match** LearnBuddy *layout* (grid, section rhythm, card hierarchy) — adapt colours/fonts to TWA tokens.
5. **Verify** British English, no em dashes, mint/charcoal palette, responsive breakpoints (991px / 767px / 479px).

## File structure

```
thameswellnessacademy.co.uk/
├── index.html              # Home (LearnBuddy home-v1 layout)
├── coming-soon.html        # Standalone pre-launch landing (see below)
├── coming-soon.css         # Scoped styles for coming-soon only (not styles.css)
├── index-full.html         # Backup of full homepage before go-live swap
├── DEPLOY-COMING-SOON.md   # Manual deploy/restore steps — do not auto-swap index
├── about.html              # About + team grid
├── join.html               # Enquiry / apply (pricing-style CTA + form)
├── contact.html            # Contact (contact-v1 layout reference)
├── journal.html            # Blog listing (blog-v3 reference)
├── services/               # Services hub + programme pages
│   ├── index.html
│   ├── foundation-training/index.html
│   ├── cpd/index.html
│   ├── workshops/index.html
│   └── retreats/index.html
├── research.html
├── team/*.html             # Team member profiles (team-member reference)
├── css/styles.css          # Single stylesheet — extend here
└── js/main.js              # Nav toggle, tabs, header scroll
```

**Root pages**: `css/styles.css`, `js/main.js`, nav links without `../`  
**Subfolder pages** (`team/`): `../css/styles.css`, `../js/main.js`, `../` on internal links  
**Active nav**: `nav-link--active` + `aria-current="page"` on current item

## LearnBuddy → TWA page mapping

Use LearnBuddy demos for **section structure only**. Style guide for agents:

`https://learnbuddytemplate.webflow.io/template-pages/styles-components`

| LearnBuddy reference | TWA file | Primary TWA patterns |
|---------------------|----------|----------------------|
| home-v1 | `index.html` | `.hero_section`, `.grid-4.hero-v1-grid`, `.frame-section` / `.section-card`, `.floating-showcase`, `.split-grid` |
| about | `about.html` | `.page-hero`, `.quality-grid`, `.about-team-grid`, `.about-values-grid`, `.about-location-grid` |
| pricing | `join.html`, programme pricing sections | `.pricing-toggle`, `.pricing-card`, `.section-gradient`, `.join-enquiry-grid` |
| blog-v3 | `journal.html` | `.journal-grid`, `.journal-featured`, `.journal-card`, `.journal-newsletter-inner` |
| contact-v1 | `contact.html` | `.contact-v1-*` (layout), `.contact-form`, `.faq-list` or `.contact-v1-faq-*` |
| blog post (article) | future `journal/*.html` | `.page-hero`, rich text body, `.journal-meta`, back link to journal |
| team member | `team/*.html` | `.team-profile`, `.team-profile-hero`, `.team-profile-articles` |

Demo page URLs follow `https://learnbuddytemplate.webflow.io/{slug}` (e.g. `/home-v1`, `/about`, `/pricing`, `/blog-v3`, `/contact-v1`, `/blog-post`, `/team-member`). If a slug 404s, use the styles-components page plus the closest TWA page as the source of truth.

## Page skeleton (every new page)

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <!-- meta, OG, fonts: Figtree + Cormorant Garamond -->
  <link rel="stylesheet" href="css/styles.css"> <!-- or ../css/styles.css in team/ -->
</head>
<body>
  <header class="site-header" id="top">...</header>
  <!-- page-hero OR hero_section for home -->
  <section class="section">...</section>
  <footer class="site-footer">...</footer>
  <script src="js/main.js"></script>
</body>
</html>
```

Copy header/footer from `index.html` or `about.html`. Update active nav link only.

## Coming soon page (pre-launch)

Use when the full site is not ready to go live but a branded holding page is needed.

| File | Role |
|------|------|
| `coming-soon.html` | Self-contained landing page — no shared header/footer/nav |
| `coming-soon.css` | Standalone stylesheet with scoped `.coming-soon-*` classes; mirrors `:root` tokens from `css/styles.css` |
| `index-full.html` | Backup of the full `index.html` before swapping |
| `DEPLOY-COMING-SOON.md` | Manual deploy and restore commands |

**Conventions:**

- **Self-contained** — link `coming-soon.css` only; do not import `css/styles.css` or `js/main.js`
- **Typography** — Figtree (body, UI, H1) + Cormorant Garamond (logo, card titles); same Google Fonts URL as main site
- **No internal page links** — use `mailto:` only; do not link to unfinished programme, journal, or team pages
- **British English**, no em dashes in user-facing copy; `lang="en-GB"`
- **Do not swap `index.html` automatically** — deployment is a manual step documented in `DEPLOY-COMING-SOON.md`
- **Restore** — `mv index-full.html index.html` when the full site is ready

Preview at `/coming-soon.html` before going live.

## Typography (use classes, not ad-hoc sizes)

| Class | Use |
|-------|-----|
| `.display-9` | Home hero H1 (Figtree, large, medium weight) |
| `.display-8` | Section H2 (Figtree when class applied; default `h2` uses Cormorant Garamond) |
| `.display-5` | Card / benefit H3 |
| `.section-tag` | Eyebrow label above headings (uppercase, accent) |
| `.main-content-lead`, `.page-hero-lead`, `.hero-lead` | Intro paragraphs (1.05rem, secondary colour) |
| `h1`–`h4` | Default heading scale when display classes not needed |

Body: 1rem / line-height 1.7. Secondary text: `var(--text-secondary)`.

## Layout utilities

| Class | Purpose |
|-------|---------|
| `.container` | Max `76.75rem` centred content |
| `.inner-container-center` | Flex column, centred; add `.max-w-43-75rem` or `.max-w-60rem` |
| `.section` | Vertical padding (`--section-padding-large`: 5rem) |
| `.section-alt` | Light grey background |
| `.section-gradient` | Charcoal CTA band (white text) |
| `.section-pd-top-none` / `.section-pd-bottom-none` | Tight vertical stacking |
| `.frame-section` + `.section-card` | Rounded grey inset section (home benefits) |
| `.grid-3`, `.grid-4` | Multi-column grids; `.gap-content` for row/col gaps |
| `.split-grid` | 50/50 content + image; `.split-grid--left-image` / `--right-image` |
| `.text-align-center`, `.button-row`, `.button-row.is-center-aligned` | Alignment |
| `.hidden-mobile`, `.show-mobile-only`, `.hidden-portrait`, `.show-portrait` | Responsive visibility |

## Components (prefer existing markup)

**Buttons** — `.btn` base + modifier:

- `.btn-primary` — charcoal fill (default CTA)
- `.btn-secondary` — white with border
- `.btn-light` — white on dark `.section-gradient` backgrounds
- `.btn-sm` — smaller padding

**Forms** — `.contact-form` wrapper, `.form-row` + label/input/select/textarea, `.form-note` disclaimer. Focus border: `var(--accent)`.

**Cards** — `.benefit-card`, `.journal-card`, `.pricing-card`, `.about-team-card`, `.home-intro-card`, `.testimonial-card`. Shared traits: `--radius-medium`, `--shadow`, subtle border, hover lift.

**Nav / header / footer** — `.site-header`, `.main-nav`, `.header-cta`, `.site-footer`, `.footer-nav`. Mobile: `.nav-toggle`, `.main-nav.open`.

**Placeholders** — `.placeholder-img`, `.placeholder-img-sm`, `.placeholder-img-tall`, `.placeholder-img-wide` + `.placeholder-label`.

**Badges / tags** — `.hero-badge`, `.section-tag`, `.journal-category`, `.pricing-badge`, `.topic-tags li`.

## Adding CSS

1. Add tokens to `:root` in `css/styles.css` only when a value repeats.
2. Name new classes after existing conventions: `{page}-{block}-{element}` (e.g. `contact-v1-faq-item`).
3. Group rules under commented section headers matching the file structure.
4. Mirror responsive rules in existing `@media (max-width: 991px)` and `(max-width: 767px)` blocks.
5. Never duplicate header/footer styles on individual pages.

## LearnBuddy styles-components → TWA translation

When reading the LearnBuddy style guide, map concepts — not hex values:

| LearnBuddy | TWA equivalent |
|------------|----------------|
| Secondary 100 `#01CD74` | `--accent` `#2ECC71` |
| Accent `#1C2329` | `--charcoal` `#2A6B55` (forest green, not black) |
| Figtree | `--font-body` / `--font-primary` (UI, body, display utility classes) |
| Display 9–1 scale | `.display-9`, `.display-8`, `.display-5`, `h1`–`h4` |
| Paragraph large/default/small | `.main-content-lead` / body / `.form-note`, card copy |
| Primary/secondary buttons | `.btn-primary` / `.btn-secondary` |
| Input fields | `.form-row input`, `.journal-newsletter-form input` |
| Badges | `.section-tag`, `.journal-category`, `.pricing-badge` |
| Spacers (margin/padding utilities) | `--spacing-*` tokens + `.section`, `.section-header` margins |
| Shadows | `--shadow`, `--shadow-lg`, `--shadow-float` |
| Radius | `--radius` (1rem), `--radius-medium` (2rem), `--radius-lg` (2.5rem) |

## Copy checklist

- [ ] British English spelling and phrasing
- [ ] No em dashes
- [ ] Professional, teacher-led, on-site delivery (not app-based learning)
- [ ] Yoga Alliance Professionals certification mentioned where relevant
- [ ] Placeholder content clearly marked until real assets exist

## Additional reference

For the full CSS variable list, component inventory, and HTML snippets, see [reference.md](reference.md).
