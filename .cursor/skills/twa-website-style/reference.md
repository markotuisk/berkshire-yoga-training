# TWA Website Style — Reference

Detailed token and pattern reference. Read when implementing new sections or extending `css/styles.css`.

## CSS custom properties (`:root`)

### Colour (Apple-native polish)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-canvas` | `#F5F5F7` | Page canvas |
| `--bg-white` | `#FFFFFF` | Cards, header |
| `--bg-light` | `#F5F5F7` | Alternate sections, footer |
| `--border-subtle` | `#D2D2D7` | 1px borders, dividers |
| `--border-muted` | `#C7C7CC` | Hover borders |
| `--text-primary` | `#1D1D1F` | Headings, primary text |
| `--text-secondary` | `#6E6E73` | Body secondary |
| `--text-muted` | `#86868B` | Meta, labels |
| `--accent` | `#F5BF03` | Buttons, fills, links on white |
| `--accent-text` | `#735600` | Tag/pill text on `--accent-light` backgrounds |
| `--accent-dark` | `#1D1D1F` | Dark CTA bands, emphasis |
| `--accent-light` | `rgba(245,191,3,0.14)` | Tag backgrounds |
| `--accent-muted` | `#E8E8ED` | Nav active pill |
| `--accent-on` | `#1D1D1F` | Text on gold fills (buttons, logo mark) |
| `--charcoal` | `#F5BF03` | Primary buttons |
| `--charcoal-hover` | `#E0AD03` | Button hover |
| `--gradient-cta` | `#1D1D1F` | Solid dark CTA sections |

**Style:** Crisp 12px card radius, pill buttons, minimal shadows, no card lift on hover. Figtree + system UI stack only (no serif display font).

### Layout

| Token | Value |
|-------|-------|
| `--container-default` | `76.75rem` |
| `--header-height` | `4.5rem` |
| `--border-width` | `0.0625rem` |
| `--radius-tiny` | `0.25rem` |
| `--radius-xsmall` | `0.5rem` |
| `--radius-small` | `0.75rem` |
| `--radius` | `1rem` |
| `--radius-regular` | `1.5rem` |
| `--radius-medium` | `2rem` |
| `--radius-lg` | `2.5rem` |
| `--radius-xlarge` | `3rem` |
| `--radius-full` | `9999px` |
| `--shadow` | Layered primary + secondary (`--shadow-color-primary` / `--shadow-color-secondary`) |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-xl` | LearnBuddy shadow scale |
| `--shadow-float` | Layered float shadow (hero cards, floating elements) |

### Spacing

| Token | Value |
|-------|-------|
| `--spacing-tiny` | `0.25rem` |
| `--spacing-xsmall` | `0.5rem` |
| `--spacing-small` | `0.75rem` |
| `--spacing-default` | `1rem` |
| `--spacing-content` | `1.25rem` |
| `--spacing-regular` | `1.5rem` |
| `--spacing-medium` | `2rem` |
| `--spacing-large` | `2.5rem` |
| `--spacing-xlarge` | `3rem` |
| `--spacing-two-xlarge` | `3.5rem` |
| `--spacing-three-xlarge` | `4rem` |
| `--section-padding-small` | `4rem` |
| `--section-padding-large` | `5rem` |
| `--section-padding-medium` | `6.25rem` |
| `--section-padding-xlarge` | `7.5rem` |
| `--section-padding-x2large` | `8rem` |

### Typography tokens

| Token | Value |
|-------|-------|
| `--font-display` | `'Cormorant Garamond', Georgia, serif` |
| `--font-body` / `--font-primary` | `'Figtree', system-ui, sans-serif` |
| `--display-10` | `clamp(3.5rem, 6vw, 4.5rem)` |
| `--display-9` | `clamp(2.5rem, 5vw, 3.75rem)` |
| `--display-8` | `clamp(2rem, 3.5vw, 3rem)` |
| `--display-7` | `clamp(1.75rem, 3vw, 2.25rem)` |
| `--display-6` | `clamp(1.5rem, 2.5vw, 1.875rem)` |
| `--display-5` | `clamp(1.25rem, 2vw, 1.5rem)` |
| `--display-4` | `1.25rem` |
| `--display-3` | `1.125rem` |
| `--display-2` | `1rem` (body size) |
| `--display-1` | `0.875rem` |
| `--line-height-tight` | `1.15` |
| `--line-height-regular` | `1.25` |
| `--line-height-body` | `1.5` |
| `--text-weight-medium` | `600` |
| `--letter-spacing-xsmall` | `-0.03rem` |

## LearnBuddy typography scale (reference → TWA)

LearnBuddy uses Figtree at fixed rem sizes. TWA uses clamp + Figtree for UI/body/display utilities, with Cormorant Garamond on default heading tags and select brand accents:

| LearnBuddy | Size | TWA mapping |
|------------|------|-------------|
| Display 10 | 4.5rem | Not used — home hero uses `.display-9` |
| Display 9 | 3.75rem | `.display-9` |
| Display 8 | 3rem | `.display-8` / `h2` |
| Display 6–7 | 1.875–2.25rem | `h3` |
| Display 5 | 1.5rem | `.display-5` |
| Display 4 | 1.25rem | `h4`, card titles |
| Paragraph large | 1.125rem | `.main-content-lead` |
| Paragraph default | 1rem | `body` |
| Paragraph small | 0.875rem | Card copy, `.form-note` |

## Component inventory

### Global chrome

```html
<header class="site-header" id="top">
  <div class="header-inner container">
    <a href="index.html" class="logo">...</a>
    <button class="nav-toggle" aria-expanded="false">...</button>
    <nav class="main-nav">...</nav>
    <a href="join.html" class="header-cta">Join</a>
  </div>
</header>
```

Footer: `.site-footer` > `.footer-inner.container` > `.footer-brand` + `.footer-nav` + `.footer-copy`.

### Section header pattern

```html
<div class="section-header inner-container-center max-w-43-75rem text-align-center">
  <span class="section-tag">Eyebrow</span>
  <h2 class="display-8">Section title</h2>
  <p class="main-content-lead">Supporting copy.</p>
</div>
```

### Inner page hero

```html
<section class="page-hero">
  <div class="container page-hero-inner">
    <nav class="breadcrumb" aria-label="Breadcrumb">...</nav>
    <span class="section-tag">Tag</span>
    <h1>Page title</h1>
    <p class="page-hero-lead">Lead paragraph.</p>
  </div>
</section>
```

Compact variant: add `.page-hero--compact`.

### Button row

```html
<div class="button-row is-center-aligned">
  <a href="#" class="btn btn-primary">Primary action</a>
  <a href="#" class="btn btn-secondary">Secondary</a>
</div>
```

### Form block

```html
<form class="contact-form" aria-label="Contact form">
  <div class="form-row">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" placeholder="you@example.com">
  </div>
  <button type="submit" class="btn btn-primary">Send message</button>
  <p class="form-note">This form is not yet connected.</p>
</form>
```

### Journal card

```html
<article class="journal-card">
  <div class="image-wrapper journal-thumb-wrapper">
    <div class="journal-thumb placeholder-img-sm" aria-hidden="true"></div>
  </div>
  <div class="journal-body">
    <p class="journal-date">Date</p>
    <h2>Title</h2>
    <p>Excerpt.</p>
  </div>
</article>
```

### Pricing card

```html
<article class="pricing-card pricing-card--featured">
  <span class="pricing-badge">Popular</span>
  <div class="pricing-card-header">
    <h3 class="pricing-card-title">Programme name</h3>
    <p class="pricing-card-desc">Description.</p>
  </div>
  <div class="pricing-card-price">
    <span class="pricing-price-label">From</span>
    <span class="pricing-price-value">£X,XXX</span>
  </div>
  <ul class="pricing-features-list">...</ul>
  <a href="join.html" class="btn btn-primary pricing-card-cta">Enquire</a>
</article>
```

### Team profile hero

```html
<article class="team-profile">
  <div class="container">
    <a href="../about.html#team" class="team-profile-back">Back to team</a>
    <header class="team-profile-hero">...</header>
    <div class="team-profile-body">...</div>
  </div>
</article>
```

## Page-specific class map

| Page | Key section classes |
|------|---------------------|
| `index.html` | `.hero_section`, `.benefits-grid`, `.floating-showcase`, `.stats-float-card`, `.home-intro-grid`, `.testimonials-grid`, `.join.section-gradient` |
| `about.html` | `.quality-grid`, `.about-story-grid`, `.about-trust-grid`, `.about-values-grid`, `.about-stats`, `.about-team-grid`, `.about-location-grid` |
| `join.html` | `.section-gradient`, `.join-enquiry-grid`, `.pricing-toggle`, `.faq-layout` |
| `journal.html` | `.journal-grid`, `.journal-featured`, `.journal-newsletter-inner` |
| `contact.html` | `.contact-v1-hero`, `.contact-v1-faq`, `.contact-v1-locations` (layout reference) |
| Programme pages | `.services`, `.service-tabs`, `.panel-grid`, `.panel-card`, `.sub-tabs` |
| `team/*.html` | `.team-profile-*`, `.team-social-link` |

## Responsive breakpoints

| Breakpoint | Typical changes |
|------------|-----------------|
| `991px` | 3-col → 2-col grids; mobile nav drawer; hide `.header-cta`; stack split grids |
| `767px` | 2-col → 1-col; hide hero float cards; full-width pricing toggle |
| `479px` | Portrait hero tweaks; tighter button rows |

## LearnBuddy styles-components sections

Agent reference URL:  
`https://learnbuddytemplate.webflow.io/template-pages/styles-components`

Sections documented there (translate to TWA tokens, do not copy verbatim):

- **Colours** — map to `:root` palette above
- **Typography** — Display + Paragraph scales → TWA display classes
- **Shadows** — `--shadow*` tokens
- **Buttons** — `.btn-primary` / `.btn-secondary` / `.btn-light`
- **Links** — default `a` + accent hover
- **Lists** — `.feature-list`, `.checklist`, `.pricing-features-list`
- **Icons / avatars** — inline SVG in markup; `.about-team-avatar`, `.badge-icon`
- **Inputs** — `.form-row` fields; newsletter uses pill radius (`999px`)
- **Badges** — `.section-tag`, `.journal-category`, `.hero-badge`
- **Rich text** — future article pages: semantic `h2`–`h4`, `ul`/`ol`, `blockquote`
- **Spacers** — prefer spacing tokens over LearnBuddy utility class names

## British English examples

| Avoid | Prefer |
|-------|--------|
| organize | organise |
| center (verb) | centre |
| program | programme (for courses) |
| wellness center | wellness centre |
| em dash (—) | comma, colon, or hyphen |

## Fonts (Google Fonts link)

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```
