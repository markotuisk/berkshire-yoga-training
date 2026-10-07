# Thames Wellness Academy rebuild (v2)

Branch: `rebuild/twa-v2`

## Intent

Full rebuild of Berkshire Yoga Training as **Thames Wellness Academy**, borrowing SEO/IA strengths from The Shala London (DR ~45 Screaming Frog crawl `2026.09.28.19.07.48`), without cloning WordPress, copy or brand.

## Borrowed habits

- Courses-first nav and hub (`/courses/` + `/courses/` aliases)
- Deep flagship course page (Foundation Training) with Course schema
- Teachers as faculty SEO surface
- Journal for topical authority + internal links
- FAQ + Testimonials support pages
- Unique titles/H1s/metas, breadcrumbs, self-canonicals
- Strong home → money-page internal links

## Design

- New system: `css/site.css` (river teal / mist / gold, Cormorant + Figtree)
- Legacy CSS preserved: `css/styles.legacy.css`
- Shadow overlay assets untouched (`js/shadow-*.js`, `css/shadow-review.css`)

## Migrated to site.css

Homepage, About, Teachers, Contact, Apply, Privacy, FAQ, Testimonials, Journal listing + 3 articles, Courses hub + all programme pages, Solutions hub + 3 pathways, Research + Partners, team placeholders (noindex).

## Intentionally on legacy CSS

- `full-home.html` (owners preview rewrite target)
- `coming-soon.html` / `coming-soon.css` (retired holding page)

## Still to finish

- Real photography replacing placeholders
- Domain cutover plan for `thameswellnessacademy.co.uk`
- Expand privacy policy legal copy
- Optional: richer journal article bodies from pre-rebuild drafts
