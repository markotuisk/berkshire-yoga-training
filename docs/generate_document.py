#!/usr/bin/env python3
"""Generate TWA website content document (Markdown + PDF)."""

import html
import json
import re
from datetime import date
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
EXTRACT = DOCS / "_extract.json"
LOGO = DOCS / "assets" / "seo-studio-estonia-logo.png"
LOGO_MARK = DOCS / "assets" / "seo-studio-estonia-logo-mark.png"
MD_OUT = DOCS / "TWA-Website-Content.md"
PDF_OUT = DOCS / "TWA-Website-Content-SEO-Studio-Estonia.pdf"

SEO = {
    "name": "SEO Studio Estonia",
    "url": "https://seoestonia.xyz",
    "email": "hello@seoestonia.xyz",
    "locations": "Tallinn · London",
    "tagline": "Be found. Break ground.",
    "description": (
        "SEO Studio Estonia makes websites, apps, and the presence that gets people "
        "and organisations found, trusted, and chosen. Ranking, authority, and visibility "
        "for individuals, startups, and corporations."
    ),
    "founder": "Marko Tuisk",
    "footer": "Designed and kept in the UK and EU.",
    "outcomes": [
        ("Ranking", "When someone looks, you are there. Not buried. Not guessed. Present at the moment of need."),
        ("Authority", "When they find you, they trust you. The presence we build is the one people believe."),
        ("Visibility", "You show up clearly, in the places that matter, for the people you actually serve."),
    ],
    "cycle": [
        ("Plan", "We listen, map who you serve, and decide what being found should look like."),
        ("Make", "We build the presence: the pages, the words, the paths people follow."),
        ("Maintain", "We stay. Ranking, authority, and visibility need keeping."),
    ],
}

BASE_URLS = {
    "production": "https://berkshireyogatraining.co.uk",
    "cloudflare": "https://berkshire-yoga-training.pages.dev",
    "github": "https://markotuisk.github.io/berkshire-yoga-training",
}

SITEMAP = [
    ("/", "Home", "index.html"),
    ("/about.html", "About the Academy", "about.html"),
    ("/foundation-training.html", "Foundation Training", "foundation-training.html"),
    ("/cpd.html", "CPD", "cpd.html"),
    ("/workshops.html", "Workshops", "workshops.html"),
    ("/retreats.html", "Retreats", "retreats.html"),
    ("/research.html", "Research", "research.html"),
    ("/journal.html", "Journal", "journal.html"),
    ("/journal/breath-work-in-teaching.html", "Article: Breath work in teaching", "journal/breath-work-in-teaching.html"),
    ("/journal/workshops-specialist-client-needs.html", "Article: Workshops for specialist client needs", "journal/workshops-specialist-client-needs.html"),
    ("/journal/evidence-informed-wellness-education.html", "Article: Evidence-informed wellness education", "journal/evidence-informed-wellness-education.html"),
    ("/team/senior-educator.html", "Team: Senior Educator", "team/senior-educator.html"),
    ("/team/therapeutic-educator.html", "Team: Therapeutic Educator", "team/therapeutic-educator.html"),
    ("/team/clinical-specialist.html", "Team: Clinical Specialist", "team/clinical-specialist.html"),
    ("/contact.html", "Contact", "contact.html"),
    ("/join.html", "Join / Apply", "join.html"),
    ("/coming-soon.html", "Coming Soon (pre-launch)", "coming-soon.html"),
]


def clean(text: str) -> str:
    text = html.unescape(text)
    text = text.replace("&amp;", "&")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def pdf_safe(text: str) -> str:
    text = clean(text)
    text = text.replace("&", "and")
    text = text.replace("\u2014", "-")
    return text.encode("latin-1", "replace").decode("latin-1")


def page_section(key: str, data: dict) -> str:
    path = next((s[0] for s in SITEMAP if s[2] == key), "/")
    lines = [
        f"### {clean(data['title'])}",
        "",
        f"**URL:** `{BASE_URLS['production']}{path}`  ",
        f"**File:** `{key}`",
        "",
        f"**Meta description:** {clean(data['description'])}",
        "",
        f"**H1:** {clean(data['h1'])}",
        "",
    ]
    if data.get("h2s"):
        lines.append("**Section headings (H2):**")
        for h in data["h2s"]:
            lines.append(f"- {clean(h)}")
        lines.append("")

  # body paragraphs (filter nav noise)
    body = [clean(p) for p in data.get("paragraphs", [])]
    body = [p for p in body if p and "© 2026" not in p and "All rights reserved" not in p
            and not p.startswith("Foundation Training\nWorkshops") and len(p) > 40]
    body = list(dict.fromkeys(body))[:8]
    if body:
        lines.append("**Key body copy:**")
        for p in body:
            lines.append(f"- {p}")
        lines.append("")

    cards = data.get("cards", [])
    if cards:
        lines.append("**Feature cards / highlights:**")
        for c in cards[:8]:
            title = clean(c.get("title", ""))
            body_text = clean(c.get("body", ""))
            if title and not title.startswith("1."):
                lines.append(f"- **{title}:** {body_text}")
        lines.append("")

    items = [clean(i) for i in data.get("list_items", [])]
    items = [i for i in items if i and i not in {
        "Foundation Training", "Workshops", "Retreats", "Research", "Journal",
        "About / Team", "Contact"
    } and not i.startswith("✓")][:10]
    if items:
        lines.append("**List items / topics:**")
        for i in items:
            lines.append(f"- {i}")
        lines.append("")

    return "\n".join(lines)


def build_markdown(pages: dict) -> str:
    today = date.today().strftime("%d %B %Y")
    parts = [
        "# Thames Wellness Academy Website Content",
        "",
        "**Document title:** TWA Website Content & SEO Package",
        f"**Prepared:** {today}",
        f"**Website produced by:** [{SEO['name']}]({SEO['url']})",
        "",
        "---",
        "",
        "## Table of contents",
        "",
        "1. [Executive summary](#executive-summary)",
        "2. [Brand and positioning](#brand-and-positioning)",
        "3. [Site structure and sitemap](#site-structure-and-sitemap)",
        "4. [Page-by-page content](#page-by-page-content)",
        "5. [SEO package](#seo-package)",
        "6. [Design system summary](#design-system-summary)",
        "7. [Hosting and domains](#hosting-and-domains)",
        "8. [Credits: SEO Studio Estonia](#credits-seo-studio-estonia)",
        "",
        "---",
        "",
        "## Executive summary",
        "",
        "**Client:** Thames Wellness Academy (trading as Berkshire Yoga Training)",
        "",
        "**Site purpose:** A professional marketing website for Yoga Alliance Professionals-certified "
        "wellness education in Berkshire and Buckinghamshire. The site promotes teacher-led, on-site "
        "programmes including Foundation Training (200-hour to 500-hour), CPD, specialist workshops, "
        "retreats, and research collaboration.",
        "",
        "**Primary regions:** Berkshire and Buckinghamshire (Thames Valley), with delivery across "
        "Reading, Windsor, Newbury and surrounding areas.",
        "",
        "**Live URLs:**",
        f"- Cloudflare Pages: {BASE_URLS['cloudflare']}/",
        f"- GitHub Pages: {BASE_URLS['github']}/",
        f"- Custom domain (when DNS configured): {BASE_URLS['production']}/",
        "",
        "**Audience:** Aspiring yoga and wellness teachers, qualified practitioners seeking CPD, "
        "corporate wellbeing leads, therapists, and organisations booking bespoke training.",
        "",
        "---",
        "",
        "## Brand and positioning",
        "",
        "| Element | Detail |",
        "|---------|--------|",
        "| Brand name | Thames Wellness Academy |",
        "| Public domain brand | Berkshire Yoga Training |",
        "| Certification | Yoga Alliance Professionals |",
        "| Delivery model | Teacher-led, on-site (not app-based or automated learning) |",
        "| Tone | Professional wellness education, academic rigour with personal growth |",
        "| Language | British English (`en-GB`) |",
        "| Key differentiators | Supervised practicum, clinical specialists, evidence-informed curriculum |",
        "",
        "**Positioning statement:** Thames Wellness Academy delivers high-quality further education "
        "and certified professional development for the wellness sector, with teacher-led, on-site "
        "programmes across studio, corporate and therapeutic settings.",
        "",
        "---",
        "",
        "## Site structure and sitemap",
        "",
        "| Path | Page | Source file |",
        "|------|------|-------------|",
    ]
    for path, label, src in SITEMAP:
        parts.append(f"| `{path}` | {label} | `{src}` |")

    parts += [
        "",
        "**Navigation (primary):** Foundation Training, Workshops, Retreats, Research, Journal, About / Team, Contact",
        "",
        "**Header CTA:** Join Us (`/join.html`)",
        "",
        "---",
        "",
        "## Page-by-page content",
        "",
    ]

    order = [s[2] for s in SITEMAP]
    for key in order:
        if key in pages:
            parts.append(page_section(key, pages[key]))
            parts.append("---")
            parts.append("")

    parts += [
        "## SEO package",
        "",
        "### Global settings",
        "",
        "| Setting | Value |",
        "|---------|-------|",
        f"| Site name (`og:site_name`) | Thames Wellness Academy |",
        f"| Locale | `en_GB` |",
        f"| Default OG image | `{BASE_URLS['github']}/assets/og-image.jpg` (1200×630) |",
        f"| Twitter card | `summary_large_image` |",
        f"| Canonical strategy | Production URLs use `{BASE_URLS['production']}` when live; "
        f"current HTML uses GitHub Pages host until custom domain DNS is active |",
        "",
        "### Page titles and meta descriptions",
        "",
        "| Page | Title | Meta description |",
        "|------|-------|------------------|",
    ]
    for key in order:
        if key in pages:
            d = pages[key]
            title = clean(d["title"]).replace("|", "\\|")
            desc = clean(d["description"]).replace("|", "\\|")[:120]
            if len(clean(d["description"])) > 120:
                desc += "..."
            label = next((s[1] for s in SITEMAP if s[2] == key), key)
            parts.append(f"| {label} | {title} | {desc} |")

    parts += [
        "",
        "### Open Graph and social sharing",
        "",
        "- All main HTML pages include `og:title`, `og:description`, `og:type`, `og:locale`, "
        "`og:site_name`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`",
        "- Twitter/X meta: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`",
        "- Article pages use `og:type` of `article`; team profiles use `profile`",
        "- Test previews: [opengraph.xyz](https://www.opengraph.xyz/), "
        "[LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)",
        "",
        "### Canonical URL migration",
        "",
        "When `berkshireyogatraining.co.uk` DNS is live on Cloudflare Pages, update `og:url`, "
        "`canonical` link tags, and `twitter:image` / `og:image` to the production domain. "
        "See `DEPLOY.md` for DNS configuration.",
        "",
        "---",
        "",
        "## Design system summary",
        "",
        "Source: `css/styles.css` (LearnBuddy-inspired layout, TWA brand tokens)",
        "",
        "### Typography",
        "",
        "| Role | Font |",
        "|------|------|",
        "| Body, UI, navigation, buttons | **Figtree** (Google Fonts) |",
        "| Headings (default h1–h4), logo accents | **Cormorant Garamond** |",
        "| Display utilities | `.display-9`, `.display-8`, `.display-5` |",
        "",
        "### Colour palette",
        "",
        "| Token | Hex | Use |",
        "|-------|-----|-----|",
        "| `--accent` | `#F5BF03` | Primary accent, buttons, links on white |",
        "| `--accent-text` | `#735600` | Tag and pill text on light gold backgrounds |",
        "| `--accent-light` | `rgba(245, 191, 3, 0.14)` | Subtle gold tint backgrounds |",
        "| `--highlight-warm` | `#E0AD03` | Hover states |",
        "| `--text-primary` | `#1D1D1F` | Body text |",
        "| `--text-secondary` | `#6E6E73` | Secondary copy |",
        "| `--bg-canvas` | `#F5F5F7` | Page background |",
        "",
        "### Layout and components",
        "",
        "- Container max-width: `76.75rem`",
        "- Section padding: `5rem` (large), `4rem` (small)",
        "- Border radius: `0.75rem` (default), `1.125rem` (cards)",
        "- Key components: `.hero_section`, `.page-hero`, `.section-card`, `.benefit-card`, "
        "`.journal-card`, `.pricing-card`, `.contact-form`, `.site-header`, `.site-footer`",
        "- Responsive breakpoints: 991px, 767px, 479px",
        "",
        "---",
        "",
        "## Hosting and domains",
        "",
        "### Repository",
        "",
        "- **GitHub:** [markotuisk/berkshire-yoga-training](https://github.com/markotuisk/berkshire-yoga-training)",
        "- **Branch:** `main`",
        "- **Type:** Static HTML (no build step)",
        "",
        "### Deployment targets",
        "",
        "| Platform | URL | Notes |",
        "|----------|-----|-------|",
        f"| Cloudflare Pages | {BASE_URLS['cloudflare']}/ | Project: `berkshire-yoga-training` |",
        f"| GitHub Pages | {BASE_URLS['github']}/ | Auto-deploy from `main` |",
        f"| Custom domain | {BASE_URLS['production']}/ | DNS via Cloudflare (CNAME to Pages) |",
        "",
        "### Deploy workflow",
        "",
        "- Push to `main` triggers GitHub Pages deploy",
        "- Cloudflare Pages: GitHub Actions workflow (`.github/workflows/deploy.yml`) when "
        "`CLOUDFLARE_PAGES_ENABLED=true` and API secrets are configured",
        "- Manual: `npx wrangler pages deploy . --project-name=berkshire-yoga-training --branch=main`",
        "",
        "### Pre-launch mode",
        "",
        "- `coming-soon.html` available for holding page",
        "- `_redirects` can rewrite `/` to `/coming-soon.html` (see `DEPLOY-COMING-SOON.md`)",
        "- Current production serves full `index.html` at root",
        "",
        "---",
        "",
        "## Credits: SEO Studio Estonia",
        "",
        f"**Website produced by [{SEO['name']}]({SEO['url']})**",
        "",
        f"| | |",
        f"|---|---|",
        f"| **Company** | {SEO['name']} |",
        f"| **Website** | {SEO['url']} |",
        f"| **Email** | {SEO['email']} |",
        f"| **Locations** | {SEO['locations']} |",
        f"| **Tagline** | {SEO['tagline']} |",
        f"| **Founder** | {SEO['founder']} |",
        "",
        f"**About:** {SEO['description']}",
        "",
        "### Services",
        "",
    ]
    for title, body in SEO["outcomes"]:
        parts.append(f"- **{title}:** {body}")
    parts.append("")
    parts.append("### How we work")
    parts.append("")
    for title, body in SEO["cycle"]:
        parts.append(f"- **{title}:** {body}")
    parts += [
        "",
        f"*{SEO['footer']}*",
        "",
        "---",
        "",
        f"*Document generated {today}. © {date.today().year} SEO Studio Estonia. "
        f"Client content © Thames Wellness Academy.*",
        "",
    ]
    return "\n".join(parts)


class TWADoc(FPDF):
    def __init__(self):
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=True, margin=20)
        self.toc_entries = []

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(110, 110, 115)
        self.cell(0, 8, f"Website produced by SEO Studio Estonia  |  {SEO['url']}  |  Page {self.page_no()}", align="C")

    def add_cover(self):
        self.add_page()
        if LOGO.exists():
            self.image(str(LOGO), x=85, y=35, w=40)
        self.set_y(85)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(29, 29, 31)
        self.multi_cell(0, 12, "Thames Wellness Academy\nWebsite Content & SEO Package", align="C")
        self.ln(6)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(110, 110, 115)
        self.multi_cell(0, 7, "Berkshire Yoga Training\nProfessional wellness education in Berkshire & Buckinghamshire", align="C")
        self.ln(20)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(115, 86, 0)
        self.cell(0, 8, "Website produced by SEO Studio Estonia", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(29, 29, 31)
        self.cell(0, 6, SEO["url"], align="C", link=SEO["url"])
        self.ln(15)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(110, 110, 115)
        self.cell(0, 6, date.today().strftime("%d %B %Y"), align="C")

    def _reset_x(self):
        self.set_x(self.l_margin)

    def section_title(self, title: str, level: int = 1):
        self._reset_x()
        self.ln(4)
        if level == 1:
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(29, 29, 31)
        elif level == 2:
            self.set_font("Helvetica", "B", 13)
            self.set_text_color(115, 86, 0)
        else:
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(29, 29, 31)
        self.multi_cell(0, 7, pdf_safe(title))
        self.ln(2)

    def body_text(self, text: str):
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(29, 29, 31)
        self.multi_cell(0, 5, pdf_safe(text))

    def bullet(self, text: str):
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(29, 29, 31)
        self.multi_cell(0, 5, f"- {pdf_safe(text)}")


def build_pdf(pages: dict):
    pdf = TWADoc()
    pdf.add_cover()

    # TOC page
    pdf.add_page()
    pdf.section_title("Table of Contents", 1)
    toc = [
        "1. Executive Summary",
        "2. Brand and Positioning",
        "3. Site Structure and Sitemap",
        "4. Page-by-Page Content",
        "5. SEO Package",
        "6. Design System Summary",
        "7. Hosting and Domains",
        "8. Credits: SEO Studio Estonia",
    ]
    for item in toc:
        pdf.bullet(item)

    # 1 Executive summary
    pdf.add_page()
    pdf.section_title("1. Executive Summary", 1)
    pdf.body_text(
        "Client: Thames Wellness Academy (Berkshire Yoga Training). "
        "A professional marketing website for Yoga Alliance Professionals-certified wellness education "
        "in Berkshire and Buckinghamshire. Teacher-led, on-site programmes: Foundation Training, CPD, "
        "workshops, retreats, and research."
    )
    pdf.ln(3)
    pdf.body_text(f"Live: {BASE_URLS['cloudflare']}/ and {BASE_URLS['github']}/")
    pdf.body_text(f"Custom domain: {BASE_URLS['production']}/ (DNS pending)")

    # 2 Brand
    pdf.add_page()
    pdf.section_title("2. Brand and Positioning", 1)
    for line in [
        "Certification: Yoga Alliance Professionals",
        "Delivery: Teacher-led, on-site (not app-based)",
        "Tone: Professional wellness education, academic rigour with personal growth",
        "Language: British English (en-GB)",
        "Regions: Berkshire and Buckinghamshire (Reading, Windsor, Newbury)",
    ]:
        pdf.bullet(line)

    # 3 Sitemap
    pdf.add_page()
    pdf.section_title("3. Site Structure and Sitemap", 1)
    for path, label, src in SITEMAP:
        pdf.bullet(f"{label}: {BASE_URLS['production']}{path}")

    # 4 Page content (condensed for PDF)
    pdf.add_page()
    pdf.section_title("4. Page-by-Page Content", 1)
    order = [s[2] for s in SITEMAP]
    for key in order:
        if key not in pages:
            continue
        d = pages[key]
        if pdf.get_y() > 250:
            pdf.add_page()
        pdf.section_title(clean(d["title"]), 2)
        pdf.body_text(f"H1: {clean(d['h1'])}")
        pdf.ln(1)
        desc = clean(d["description"])
        if len(desc) > 200:
            desc = desc[:197] + "..."
        pdf.body_text(f"Meta: {desc}")
        pdf.ln(1)
        if d.get("h2s"):
            pdf._reset_x()
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 5, "Sections:", new_x="LMARGIN", new_y="NEXT")
            for h in d["h2s"][:6]:
                pdf.bullet(clean(h))
        body = [clean(p) for p in d.get("paragraphs", [])]
        body = [p for p in body if len(p) > 50 and "©" not in p][:3]
        if body:
            pdf.ln(1)
            pdf._reset_x()
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 5, "Key copy:", new_x="LMARGIN", new_y="NEXT")
            for p in body:
                if pdf.get_y() > 265:
                    pdf.add_page()
                txt = p[:300] + ("..." if len(p) > 300 else "")
                pdf.bullet(txt)
        pdf.ln(2)

    # 5 SEO
    pdf.add_page()
    pdf.section_title("5. SEO Package", 1)
    pdf.body_text("Default OG image: assets/og-image.jpg (1200x630)")
    pdf.body_text("Twitter card: summary_large_image")
    pdf.body_text(f"Canonical: {BASE_URLS['production']} when DNS live; GitHub Pages host until then")
    pdf.ln(3)
    pdf.section_title("Page titles", 2)
    for key in order:
        if key in pages:
            label = next((s[1] for s in SITEMAP if s[2] == key), key)
            title = clean(pages[key]["title"])
            if pdf.get_y() > 270:
                pdf.add_page()
            pdf._reset_x()
            pdf.set_font("Helvetica", "", 8)
            pdf.multi_cell(0, 4, pdf_safe(f"{label}: {title}"))

    # 6 Design
    pdf.add_page()
    pdf.section_title("6. Design System Summary", 1)
    for line in [
        "Typography: Figtree (body/UI), Cormorant Garamond (headings)",
        "Accent gold: #F5BF03",
        "Tag text on gold: #735600",
        "Text primary: #1D1D1F",
        "Canvas background: #F5F5F7",
        "Container max-width: 76.75rem",
        "Breakpoints: 991px, 767px, 479px",
    ]:
        pdf.bullet(line)

    # 7 Hosting
    pdf.add_page()
    pdf.section_title("7. Hosting and Domains", 1)
    for line in [
        "Repository: github.com/markotuisk/berkshire-yoga-training (main)",
        f"Cloudflare Pages: {BASE_URLS['cloudflare']}/",
        f"GitHub Pages: {BASE_URLS['github']}/",
        f"Custom domain: {BASE_URLS['production']}/",
        "Static HTML, no build step",
        "Deploy: push to main; optional Cloudflare via GitHub Actions",
    ]:
        pdf.bullet(line)

    # 8 Credits
    pdf.add_page()
    pdf.section_title("8. Credits: SEO Studio Estonia", 1)
    if LOGO_MARK.exists():
        pdf.image(str(LOGO_MARK), x=85, y=pdf.get_y(), w=25)
        pdf.ln(30)
    pdf.body_text(f"{SEO['name']}")
    pdf.body_text(SEO["url"])
    pdf.body_text(SEO["email"])
    pdf.body_text(f"Locations: {SEO['locations']}")
    pdf.body_text(f"Tagline: {SEO['tagline']}")
    pdf.body_text(f"Founder: {SEO['founder']}")
    pdf.ln(3)
    pdf.body_text(SEO["description"])
    pdf.ln(3)
    pdf.section_title("Services", 2)
    for title, body in SEO["outcomes"]:
        pdf.bullet(f"{title}: {body}")
    pdf.ln(2)
    pdf.section_title("How we work", 2)
    for title, body in SEO["cycle"]:
        pdf.bullet(f"{title}: {body}")
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.body_text(SEO["footer"])

    pdf.output(str(PDF_OUT))


def main():
    pages = json.loads(EXTRACT.read_text(encoding="utf-8"))
    md = build_markdown(pages)
    MD_OUT.write_text(md, encoding="utf-8")
    build_pdf(pages)
    print(f"Markdown: {MD_OUT}")
    print(f"PDF: {PDF_OUT} ({PDF_OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
