#!/usr/bin/env python3
"""Generate TWA Website Content PDF from markdown source."""

import re
from pathlib import Path

from fpdf import FPDF

DOCS_DIR = Path(__file__).parent
MD_FILE = DOCS_DIR / "TWA-Website-Content.md"
LOGO_FILE = DOCS_DIR / "assets" / "seo-studio-estonia-logo.png"
PDF_FILE = DOCS_DIR / "TWA-Website-Content-SEO-Studio-Estonia.pdf"

# Brand colours
COLOUR_PRIMARY = (30, 58, 95)      # deep navy
COLOUR_ACCENT = (45, 106, 143)     # teal-blue
COLOUR_TEXT = (33, 37, 41)         # near black
COLOUR_MUTED = (108, 117, 125)     # grey
COLOUR_LIGHT = (248, 249, 250)     # off-white
COLOUR_RULE = (222, 226, 230)      # light grey border


class ContentPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(20, 20, 20)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*COLOUR_MUTED)
        self.cell(0, 6, "Thames Wellness Academy  |  Website Content Document  |  SEO Studio Estonia", align="C")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*COLOUR_MUTED)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def add_cover(self):
        self.add_page()
        # Top accent bar
        self.set_fill_color(*COLOUR_PRIMARY)
        self.rect(0, 0, 210, 8, "F")

        self.ln(30)

        # Logo
        if LOGO_FILE.exists():
            logo_w = 28
            logo_x = (210 - logo_w) / 2
            self.image(str(LOGO_FILE), x=logo_x, y=35, w=logo_w)

        self.ln(45)

        # Producer
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*COLOUR_PRIMARY)
        self.cell(0, 10, "SEO Studio Estonia", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_font("Helvetica", "", 10)
        self.set_text_color(*COLOUR_MUTED)
        self.cell(0, 6, "Tallinn  |  London", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(12)

        # Document type
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*COLOUR_ACCENT)
        self.cell(0, 8, "WEBSITE CONTENT DOCUMENT", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)

        # Main title
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*COLOUR_TEXT)
        self.multi_cell(0, 11, "Thames Wellness Academy", align="C")
        self.set_font("Helvetica", "", 16)
        self.set_text_color(*COLOUR_MUTED)
        self.cell(0, 10, "Berkshire Yoga Training", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(20)

        # Divider
        self.set_draw_color(*COLOUR_RULE)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(12)

        # Meta
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*COLOUR_MUTED)
        self.cell(0, 6, "Document date: 22 August 2026", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, "https://seoestonia.xyz", align="C", new_x="LMARGIN", new_y="NEXT")

        # Bottom accent
        self.set_fill_color(*COLOUR_PRIMARY)
        self.rect(0, 289, 210, 8, "F")

    def add_section_heading(self, text, level=1):
        if self.get_y() > 250 and level == 1:
            self.add_page()
        self.set_x(self.l_margin)
        self.ln(4 if level == 1 else 2)
        if level == 1:
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(*COLOUR_PRIMARY)
        elif level == 2:
            self.set_font("Helvetica", "B", 13)
            self.set_text_color(*COLOUR_ACCENT)
        else:
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(*COLOUR_TEXT)
        self.multi_cell(0, 7, text)
        if level == 1:
            y = self.get_y()
            self.set_draw_color(*COLOUR_ACCENT)
            self.set_line_width(0.4)
            self.line(20, y, 80, y)
            self.ln(3)

    def add_body(self, text):
        if self.get_y() > 260:
            self.add_page()
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*COLOUR_TEXT)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def add_bullet(self, text):
        if self.get_y() > 265:
            self.add_page()
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*COLOUR_TEXT)
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def add_table_row(self, cols, widths, header=False):
        if self.get_y() > 270:
            self.add_page()
        self.set_x(self.l_margin)
        if header:
            self.set_font("Helvetica", "B", 8)
            self.set_fill_color(*COLOUR_PRIMARY)
            self.set_text_color(255, 255, 255)
        else:
            self.set_font("Helvetica", "", 8)
            self.set_text_color(*COLOUR_TEXT)
            self.set_fill_color(*COLOUR_LIGHT)
        row_h = 7
        for i, (col, w) in enumerate(zip(cols, widths)):
            self.cell(w, row_h, col[:80], border=1, fill=header)
        self.ln(row_h)

    def add_credits_page(self):
        self.add_page()
        self.add_section_heading("Document credits", 1)
        self.ln(4)

        if LOGO_FILE.exists():
            self.image(str(LOGO_FILE), x=20, y=self.get_y(), w=20)
            self.ln(22)

        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*COLOUR_PRIMARY)
        self.cell(0, 8, "Produced by SEO Studio Estonia", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

        self.add_body(
            "SEO Studio Estonia are makers of websites, apps, and the presence that gets you found. "
            "They introduce you, your work, and the ease of being easy to find. "
            "Ranking, authority, and visibility for individuals, startups, and corporations. "
            "They plan, design, analyse, make, go live, and stay."
        )
        self.ln(4)
        self.add_bullet("Website: https://seoestonia.xyz")
        self.add_bullet("Locations: Tallinn and London (UK and EU)")
        self.add_bullet("Services: Ranking, authority, and visibility")
        self.ln(6)
        self.add_body(
            "This website content document was prepared by SEO Studio Estonia "
            "for Thames Wellness Academy / Berkshire Yoga Training."
        )


def sanitise(text):
    """Replace characters not supported by Helvetica."""
    replacements = {
        "\u2014": "-",  # em dash
        "\u2013": "-",  # en dash
        "\u2018": "'",  # left single quote
        "\u2019": "'",  # right single quote
        "\u201c": '"',  # left double quote
        "\u201d": '"',  # right double quote
        "\u2026": "...",  # ellipsis
        "\u00a0": " ",  # nbsp
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Strip remaining non-latin1 chars
    return text.encode("latin-1", errors="replace").decode("latin-1")


def parse_markdown(md_text):
    """Simple markdown parser for our structured document."""
    lines = md_text.split("\n")
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]

        if line.startswith("# "):
            blocks.append(("h1", line[2:].strip()))
        elif line.startswith("## "):
            blocks.append(("h2", line[3:].strip()))
        elif line.startswith("### "):
            blocks.append(("h3", line[4:].strip()))
        elif line.startswith("|") and i + 1 < len(lines) and lines[i + 1].startswith("|--"):
            # Table
            headers = [c.strip() for c in line.split("|")[1:-1]]
            i += 2
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].split("|")[1:-1]])
                i += 1
            blocks.append(("table", headers, rows))
            continue
        elif line.startswith("- "):
            bullets = []
            while i < len(lines) and lines[i].startswith("- "):
                bullets.append(lines[i][2:].strip())
                i += 1
            blocks.append(("bullets", bullets))
            continue
        elif line.strip() == "---":
            blocks.append(("hr",))
        elif line.strip() and not line.startswith("**") and not line.startswith("*End"):
            # Collect paragraph
            para = line.strip()
            # Skip markdown link-only lines handled elsewhere
            if para.startswith("![") or para == "---":
                i += 1
                continue
            # Clean bold markers for plain text
            para = re.sub(r"\*\*(.+?)\*\*", r"\1", para)
            para = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", para)
            if para:
                blocks.append(("p", para))
        i += 1
    return blocks


def build_pdf():
    md_text = MD_FILE.read_text(encoding="utf-8")
    blocks = parse_markdown(md_text)

    pdf = ContentPDF()
    pdf.add_cover()

    skip_until_h2 = True  # skip duplicate cover content in md
    for block in blocks:
        if block[0] == "h1":
            if skip_until_h2:
                continue
            pdf.add_section_heading(sanitise(block[1]), 1)
        elif block[0] == "h2":
            skip_until_h2 = False
            title = sanitise(block[1])
            if title in ("Document credits",):
                continue  # handled separately
            pdf.add_section_heading(title, 2)
        elif block[0] == "h3":
            pdf.add_section_heading(sanitise(block[1]), 3)
        elif block[0] == "p":
            pdf.add_body(sanitise(block[1]))
        elif block[0] == "bullets":
            for b in block[1]:
                pdf.add_bullet(sanitise(re.sub(r"\*\*(.+?)\*\*", r"\1", b)))
        elif block[0] == "table":
            headers, rows = block[1], block[2]
            n = len(headers)
            total = 170
            if n == 2:
                widths = [45, 125]
            elif n == 3:
                widths = [50, 35, 85]
            elif n == 4:
                widths = [38, 32, 28, 72]
            else:
                widths = [total / n] * n
            pdf.ln(2)
            pdf.add_table_row([sanitise(h) for h in headers], widths, header=True)
            for row in rows:
                pdf.add_table_row([sanitise(c) for c in row], widths)
            pdf.ln(4)
        elif block[0] == "hr":
            pdf.ln(2)

    pdf.add_credits_page()
    pdf.output(str(PDF_FILE))
    return PDF_FILE


if __name__ == "__main__":
    out = build_pdf()
    size_kb = out.stat().st_size / 1024
    print(f"Generated: {out}")
    print(f"Size: {size_kb:.1f} KB")
