#!/usr/bin/env python3
"""
generate_docx.py
Converts PANDUAN_PENGGUNA.html → PANDUAN_PENGGUNA.docx

Features:
- Heading 1–4 styles (defined, consistent with PDF)
- Caption (Gambar) & TableCaption styles
- Auto TOC, Daftar Gambar, Daftar Tabel via Word fields (update: Ctrl+A, F9)
- Ordered lists always restart at 1 (per block)
- Blockquote callout (blue left border, blue tinted background)
- Page layout: A4, margins matching PDF
"""

import os, re, base64
from bs4 import BeautifulSoup, NavigableString
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn


# ══════════════════════════════════════════════════════════════════════════════
# STYLE SETUP
# ══════════════════════════════════════════════════════════════════════════════

def setup_styles(doc):
    """Define all paragraph styles used in the document."""

    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    normal.paragraph_format.space_after = Pt(7)

    # ── Heading 1: BAB, DAFTAR ISI, GAMBAR, TABEL (14pt bold, left, black) ───
    h1 = doc.styles['Heading 1']
    h1.font.name = 'Calibri'
    h1.font.size = Pt(14)
    h1.font.bold = True
    h1.font.color.rgb = RGBColor(0, 0, 0)
    h1.font.italic = False
    h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after  = Pt(14)
    h1.paragraph_format.keep_with_next = True
    h1.paragraph_format.page_break_before = True  # Page break before every Heading 1
    h1.paragraph_format.first_line_indent = Cm(0)
    h1.paragraph_format.left_indent       = Cm(0)
    _clear_heading_border(h1)

    # ── Heading 2: Sub-Bab  (12pt bold, left, black) ─────────────────────────
    h2 = doc.styles['Heading 2']
    h2.font.name = 'Calibri'
    h2.font.size = Pt(12)
    h2.font.bold = True
    h2.font.color.rgb = RGBColor(0, 0, 0)
    h2.font.italic = False
    h2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h2.paragraph_format.space_before = Pt(18)
    h2.paragraph_format.space_after  = Pt(8)
    h2.paragraph_format.keep_with_next = True
    h2.paragraph_format.first_line_indent = Cm(0)
    h2.paragraph_format.left_indent       = Cm(0)
    _clear_heading_border(h2)

    # ── Heading 3: Sub-Sub-Bab  (11pt bold, left, black) ─────────────────────
    h3 = doc.styles['Heading 3']
    h3.font.name = 'Calibri'
    h3.font.size = Pt(11)
    h3.font.bold = True
    h3.font.color.rgb = RGBColor(0, 0, 0)
    h3.font.italic = False
    h3.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after  = Pt(6)
    h3.paragraph_format.keep_with_next = True
    h3.paragraph_format.first_line_indent = Cm(0)
    h3.paragraph_format.left_indent       = Cm(0)
    _clear_heading_border(h3)

    # ── Heading 4: Sub-Sub-Sub-Bab  (11pt bold, left, black) ─────────────────
    h4 = doc.styles['Heading 4']
    h4.font.name = 'Calibri'
    h4.font.size = Pt(11)
    h4.font.bold = True
    h4.font.color.rgb = RGBColor(0, 0, 0)
    h4.font.italic = False
    h4.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h4.paragraph_format.space_before = Pt(10)
    h4.paragraph_format.space_after  = Pt(4)
    h4.paragraph_format.keep_with_next = True
    h4.paragraph_format.first_line_indent = Cm(0)
    h4.paragraph_format.left_indent       = Cm(0)
    _clear_heading_border(h4)

    # ── Caption Gambar  (9.5pt italic bold center, built-in Caption) ──────────
    cap = doc.styles['Caption']
    cap.font.name = 'Calibri'
    cap.font.size = Pt(9.5)
    cap.font.bold = True
    cap.font.italic = True
    cap.font.color.rgb = RGBColor(0, 0, 0)
    cap.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(6)
    cap.paragraph_format.space_after  = Pt(16)
    cap.paragraph_format.first_line_indent = Cm(0)

    # ── Caption Tabel  (9.5pt italic bold center, custom style) ──────────────
    try:
        tbl_cap = doc.styles['TableCaption']
    except KeyError:
        tbl_cap = doc.styles.add_style('TableCaption', WD_STYLE_TYPE.PARAGRAPH)
    tbl_cap.font.name    = 'Calibri'
    tbl_cap.font.size    = Pt(9.5)
    tbl_cap.font.bold    = True
    tbl_cap.font.italic  = True
    tbl_cap.font.color.rgb = RGBColor(0, 0, 0)
    tbl_cap.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.CENTER
    tbl_cap.paragraph_format.space_before = Pt(6)
    tbl_cap.paragraph_format.space_after  = Pt(14)
    tbl_cap.paragraph_format.first_line_indent = Cm(0)

    # ── Section page header (DAFTAR ISI, etc) — NOT in TOC ───────────────────
    try:
        sec_hdr = doc.styles['SectionHeader']
    except KeyError:
        sec_hdr = doc.styles.add_style('SectionHeader', WD_STYLE_TYPE.PARAGRAPH)
    sec_hdr.font.name    = 'Calibri'
    sec_hdr.font.size    = Pt(14)
    sec_hdr.font.bold    = True
    sec_hdr.font.color.rgb = RGBColor(0, 0, 0)
    sec_hdr.paragraph_format.alignment    = WD_ALIGN_PARAGRAPH.LEFT
    sec_hdr.paragraph_format.space_before = Pt(0)
    sec_hdr.paragraph_format.space_after  = Pt(18)
    sec_hdr.paragraph_format.first_line_indent = Cm(0)

    # ── TOC Styles (Daftar Isi 12pt font) ────────────────────────────────────
    for s in doc.styles:
        if s.name in ['TOC 1', 'TOC 2', 'TOC 3', 'TOC 4', 'TOCHeading', 'toc 1', 'toc 2', 'toc 3', 'toc 4']:
            s.font.name = 'Calibri'
            s.font.size = Pt(12)
            s.font.color.rgb = RGBColor(0, 0, 0)

    return doc


def _clear_heading_border(style):
    """Remove any bottom border or shading from a heading style."""
    pPr = style.element.get_or_add_pPr()
    for child in list(pPr):
        if child.tag == qn('w:pBdr'):
            pPr.remove(child)
        if child.tag == qn('w:shd'):
            pPr.remove(child)


# ══════════════════════════════════════════════════════════════════════════════
# PARAGRAPH FORMAT HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _set_line_spacing(p, multiple=1.6):
    """Set line spacing as a multiple via XML."""
    val = round(multiple * 240)
    pPr = p._p.get_or_add_pPr()
    spacing = pPr.find(qn('w:spacing'))
    if spacing is None:
        spacing = OxmlElement('w:spacing')
        pPr.append(spacing)
    spacing.set(qn('w:line'),     str(val))
    spacing.set(qn('w:lineRule'), 'auto')


def _set_indent(p, left_cm=0.0, first_cm=0.0, hanging_cm=0.0):
    """Set paragraph indentation via XML."""
    pPr = p._p.get_or_add_pPr()
    for old in list(pPr):
        if old.tag == qn('w:ind'):
            pPr.remove(old)
    ind = OxmlElement('w:ind')
    if left_cm:
        ind.set(qn('w:left'), str(int(left_cm * 567)))
    if first_cm:
        ind.set(qn('w:firstLine'), str(int(first_cm * 567)))
    if hanging_cm:
        ind.set(qn('w:hanging'), str(int(hanging_cm * 567)))
    pPr.append(ind)


def _add_tab_stop(p, pos_cm):
    """Add a tab stop to a paragraph."""
    pPr = p._p.get_or_add_pPr()
    tabs_elem = pPr.find(qn('w:tabs'))
    if tabs_elem is None:
        tabs_elem = OxmlElement('w:tabs')
        pPr.append(tabs_elem)
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'),  'left')
    tab.set(qn('w:pos'),  str(int(pos_cm * 567)))
    tabs_elem.append(tab)


def _set_para_shading(p, fill_hex):
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'),   'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'),  fill_hex)
    pPr.append(shd)


def _set_para_border_left(p, color='1d4ed8', size=24, space=200):
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    left = OxmlElement('w:left')
    left.set(qn('w:val'),   'single')
    left.set(qn('w:sz'),    str(size))
    left.set(qn('w:space'), str(space))
    left.set(qn('w:color'), color)
    pBdr.append(left)
    pPr.append(pBdr)


def _set_cell_borders(cell, color='000000', size=4):
    tc  = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for side in ['top', 'left', 'bottom', 'right']:
        node = OxmlElement(f'w:{side}')
        node.set(qn('w:val'),   'single')
        node.set(qn('w:sz'),    str(size))
        node.set(qn('w:space'), '0')
        node.set(qn('w:color'), color)
        borders.append(node)
    tcPr.append(borders)


def _set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'),    str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def _set_cell_bg(cell, fill_hex):
    shd = parse_xml(
        f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{fill_hex}"/>'
    )
    cell._tc.get_or_add_tcPr().append(shd)


# ══════════════════════════════════════════════════════════════════════════════
# WORD FIELD INSERTION (TOC / LOF / LOT)
# ══════════════════════════════════════════════════════════════════════════════

def _insert_word_field(doc, instruction, placeholder=''):
    """
    Insert a dynamic Word field code (e.g. TOC, LOF, LOT).
    The field is marked dirty=true so Word auto-updates on first open.
    """
    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(12)

    r1 = p.add_run()
    fc1 = OxmlElement('w:fldChar')
    fc1.set(qn('w:fldCharType'), 'begin')
    fc1.set(qn('w:dirty'),       'true')
    r1._r.append(fc1)

    r2 = p.add_run()
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = f' {instruction} '
    r2._r.append(instrText)

    r3 = p.add_run()
    fc2 = OxmlElement('w:fldChar')
    fc2.set(qn('w:fldCharType'), 'separate')
    r3._r.append(fc2)

    if placeholder:
        r_ph = p.add_run(placeholder)
        r_ph.font.name = 'Calibri'
        r_ph.font.size = Pt(10)
        r_ph.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    r4 = p.add_run()
    fc3 = OxmlElement('w:fldChar')
    fc3.set(qn('w:fldCharType'), 'end')
    r4._r.append(fc3)

    return p


# ══════════════════════════════════════════════════════════════════════════════
# INLINE HTML → DOCX RUN RENDERER
# ══════════════════════════════════════════════════════════════════════════════

def _render_inline(elem, para, size=11, color=(0, 0, 0)):
    """Recursively add inline HTML elements as runs to a paragraph."""
    if isinstance(elem, NavigableString):
        text = str(elem)
        if text:
            r = para.add_run(text)
            r.font.name = 'Calibri'
            r.font.size = Pt(size)
            r.font.color.rgb = RGBColor(*color)
        return

    tag = (elem.name or '').lower()

    if tag in ('strong', 'b'):
        r = para.add_run(elem.get_text())
        r.bold = True
        r.font.name = 'Calibri'
        r.font.size = Pt(size)
        r.font.color.rgb = RGBColor(*color)

    elif tag in ('em', 'i'):
        r = para.add_run(elem.get_text())
        r.italic = True
        r.font.name = 'Calibri'
        r.font.size = Pt(size)
        r.font.color.rgb = RGBColor(*color)

    elif tag == 'code':
        r = para.add_run(elem.get_text())
        r.font.name = 'Consolas'
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0, 0, 0)

    elif tag == 'a':
        r = para.add_run(elem.get_text())
        r.underline = True
        r.font.name = 'Calibri'
        r.font.size = Pt(size)
        r.font.color.rgb = RGBColor(*color)

    else:
        for child in elem.children:
            _render_inline(child, para, size, color)


# ══════════════════════════════════════════════════════════════════════════════
# ELEMENT RENDERERS
# ══════════════════════════════════════════════════════════════════════════════

def _add_heading(doc, text, level=1):
    """Add a heading paragraph using the built-in Word heading style (H1–H4)."""
    style_map = {1: 'Heading 1', 2: 'Heading 2', 3: 'Heading 3', 4: 'Heading 4'}
    style = style_map.get(level, 'Heading 1')
    p = doc.add_paragraph(text, style=style)
    _set_indent(p, left_cm=0, first_cm=0)
    return p


def _add_sec_header(doc, text):
    """Add a section header (DAFTAR ISI, DAFTAR GAMBAR, ...) — not in TOC."""
    p = doc.add_paragraph(text, style='SectionHeader')
    _set_indent(p, left_cm=0)
    return p


def _add_body_para(doc, elem):
    """Body paragraph: justify, first-line indent 1.25cm, 1.6 line spacing."""
    p = doc.add_paragraph()
    p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(7)
    _set_line_spacing(p, 1.6)
    _set_indent(p, left_cm=0, first_cm=1.25)
    for child in elem.children:
        _render_inline(child, p)
    return p


def _add_bold_para(doc, elem):
    """Bold label paragraph (no indent, left-aligned)."""
    p = doc.add_paragraph()
    p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after  = Pt(4)
    _set_indent(p)
    for child in elem.children:
        _render_inline(child, p)
    return p


def _add_fig_caption(doc, elem):
    """Figure caption using built-in 'Caption' style (used for auto LOF field)."""
    text = elem.get_text().strip()
    p = doc.add_paragraph(text, style='Caption')
    _set_indent(p)
    return p


def _add_tbl_caption(doc, elem):
    """Table caption using custom 'TableCaption' style (used for auto LOT field)."""
    text = elem.get_text().strip()
    p = doc.add_paragraph(text, style='TableCaption')
    _set_indent(p)
    return p


def _add_image(doc, div, img_counter, script_dir):
    """Add a centered figure image from div.fig."""
    img_tag = div.find('img')
    if not img_tag or not img_tag.get('src'):
        return

    src     = img_tag['src']
    img_file = None

    if not src.startswith('data:'):
        candidate = os.path.join(script_dir, src)
        if os.path.exists(candidate):
            img_file = candidate
    else:
        m = re.match(r'data:image/(png|jpe?g|gif|webp);base64,(.*)', src, re.DOTALL)
        if m:
            ext = 'png' if 'png' in m.group(1) else 'jpg'
            img_counter[0] += 1
            tmp = os.path.join(script_dir, f'_tmp_docx_{img_counter[0]}.{ext}')
            try:
                with open(tmp, 'wb') as f:
                    f.write(base64.b64decode(m.group(2)))
                img_file = tmp
            except Exception:
                pass

    if img_file and os.path.exists(img_file):
        try:
            p_img = doc.add_paragraph()
            p_img.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(14)
            p_img.paragraph_format.space_after  = Pt(4)
            run = p_img.add_run()
            run.add_picture(img_file, width=Cm(14.5))
        except Exception:
            pass
        finally:
            if img_file and '_tmp_docx_' in img_file:
                try:
                    os.remove(img_file)
                except Exception:
                    pass


def _add_blockquote(doc, bq):
    """Blockquote callout: blue left border, light-blue background, blue text."""
    all_p = bq.find_all('p')
    first = True
    for p_elem in all_p:
        classes = p_elem.get('class', [])
        p = doc.add_paragraph()
        p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        _set_para_shading(p, 'eff6ff')
        _set_para_border_left(p, color='1d4ed8', size=24, space=150)
        _set_indent(p, left_cm=0.35)
        if first:
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after  = Pt(2)
            first = False
        else:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after  = Pt(10)
        _set_line_spacing(p, 1.3)

        is_title = 'note-title' in classes
        for child in p_elem.children:
            _render_inline(child, p, size=10, color=(0x1e, 0x3a, 0x8a))

        if is_title:
            for run in p.runs:
                run.bold = True


def _add_ordered_list(doc, ol_elem):
    """
    Ordered list that ALWAYS restarts at 1 per block.
    Uses manual text numbering (1., 2., ...) + tab stop + hanging indent
    so numbering NEVER spills over across different sections or sub-chapters.
    """
    LEFT_CM    = 1.75   # text alignment start
    HANG_CM    = 0.50   # hanging back to number

    counter = 1
    for li in ol_elem.find_all('li', recursive=False):
        p = doc.add_paragraph()
        p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(4)
        _set_line_spacing(p, 1.3)
        _set_indent(p, left_cm=LEFT_CM, hanging_cm=HANG_CM)
        _add_tab_stop(p, LEFT_CM)

        # Number run + tab
        r_num = p.add_run(f'{counter}.\t')
        r_num.font.name = 'Calibri'
        r_num.font.size = Pt(11)
        r_num.font.color.rgb = RGBColor(0, 0, 0)

        # Content (skip nested ul/ol)
        sub_list = None
        for child in li.children:
            if hasattr(child, 'name') and child.name in ('ul', 'ol'):
                sub_list = child
                continue
            _render_inline(child, p, size=11, color=(0, 0, 0))

        counter += 1

        # Sub-list (bullet style, deeper indent)
        if sub_list:
            _add_sub_bullet_list(doc, sub_list, depth=1)


def _add_sub_bullet_list(doc, ul_elem, depth=1):
    """Sub-list inside ordered list items (bullet, indented deeper)."""
    BASE_CM = 1.75
    LEFT_CM = BASE_CM + depth * 1.0
    HANG_CM = 0.4

    for li in ul_elem.find_all('li', recursive=False):
        p = doc.add_paragraph()
        p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(3)
        _set_line_spacing(p, 1.3)
        _set_indent(p, left_cm=LEFT_CM, hanging_cm=HANG_CM)
        _add_tab_stop(p, LEFT_CM)

        r_bul = p.add_run('–\t')
        r_bul.font.name = 'Calibri'
        r_bul.font.size = Pt(11)
        r_bul.font.color.rgb = RGBColor(0, 0, 0)

        for child in li.children:
            if hasattr(child, 'name') and child.name in ('ul', 'ol'):
                _add_sub_bullet_list(doc, child, depth=depth + 1)
                continue
            _render_inline(child, p, size=11, color=(0, 0, 0))


def _add_unordered_list(doc, ul_elem, depth=0):
    """Unordered (bullet) list: bullet at 1.25cm, text at 1.75cm."""
    LEFT_CM = 1.25 + depth * 1.0
    HANG_CM = 0.45
    MARKERS = ['•', '–', '◦']
    marker  = MARKERS[min(depth, len(MARKERS) - 1)]

    for li in ul_elem.find_all('li', recursive=False):
        p = doc.add_paragraph()
        p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(4)
        _set_line_spacing(p, 1.3)
        _set_indent(p, left_cm=LEFT_CM + HANG_CM, hanging_cm=HANG_CM)
        _add_tab_stop(p, LEFT_CM + HANG_CM)

        r_bul = p.add_run(f'{marker}\t')
        r_bul.font.name = 'Calibri'
        r_bul.font.size = Pt(11)
        r_bul.font.color.rgb = RGBColor(0, 0, 0)

        sub_list = None
        for child in li.children:
            if hasattr(child, 'name') and child.name in ('ul', 'ol'):
                sub_list = child
                continue
            _render_inline(child, p, size=11, color=(0, 0, 0))

        if sub_list:
            _add_unordered_list(doc, sub_list, depth=depth + 1)


def _add_table(doc, tbl_elem):
    """Styled table: header bold white-bg, cells 10pt, full borders."""
    rows_elem = tbl_elem.find_all('tr')
    if not rows_elem:
        return

    num_cols = max(len(r.find_all(['th', 'td'])) for r in rows_elem)
    if num_cols == 0:
        return

    tbl = doc.add_table(rows=len(rows_elem), cols=num_cols)
    tbl.alignment  = WD_TABLE_ALIGNMENT.LEFT
    tbl.style      = 'Table Grid'
    tbl.autofit    = False

    for r_idx, r_elem in enumerate(rows_elem):
        cells_elem  = r_elem.find_all(['th', 'td'])
        is_header   = (r_idx == 0) or all(c.name == 'th' for c in cells_elem)

        for c_idx, cell_elem in enumerate(cells_elem):
            if c_idx >= num_cols:
                break
            cell = tbl.cell(r_idx, c_idx)
            _set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            _set_cell_borders(cell)
            _set_cell_bg(cell, 'ffffff')

            p_cell = cell.paragraphs[0]
            p_cell.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.LEFT
            p_cell.paragraph_format.space_before = Pt(1)
            p_cell.paragraph_format.space_after  = Pt(1)

            for child in cell_elem.children:
                _render_inline(child, p_cell, size=10, color=(0, 0, 0))

            if is_header:
                for run in p_cell.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor(0, 0, 0)


def _add_toc_row(doc, div):
    """Render a TOC / LOF / LOT row with leader dots and right-aligned page number."""
    num_span   = div.find(class_='toc-num')
    title_span = div.find(class_='toc-title') or div.find(class_='dg-label')
    pg_span    = div.find(class_='toc-pg')

    num_text   = (num_span.get_text().strip() + '  ') if num_span else ''
    title_text = title_span.get_text().strip() if title_span else (div.get_text().strip() if div else '')
    pg_text    = pg_span.get_text().strip() if pg_span else ''

    if not title_text or title_text.strip().upper() == 'DAFTAR ISI':
        return

    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT

    is_bold = 'font-bold' in div.get('class', [])

    style_attr = div.get('style', '')
    pl_match = re.search(r'padding-left:(\d+)px', style_attr)
    left_px = int(pl_match.group(1)) if pl_match else 0
    left_cm = round(left_px / 37.8, 2)

    _set_line_spacing(p, 1.3)
    p.paragraph_format.space_before = Pt(4 if is_bold else 1)
    p.paragraph_format.space_after  = Pt(2)
    _set_indent(p, left_cm=left_cm)

    # Right-aligned tab stop at 16.5 cm with dotted leader
    pPr = p._p.get_or_add_pPr()
    tabs_elem = pPr.find(qn('w:tabs'))
    if tabs_elem is None:
        tabs_elem = OxmlElement('w:tabs')
        pPr.append(tabs_elem)
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:leader'), 'dot')
    tab.set(qn('w:pos'), str(int(16.5 * 567)))
    tabs_elem.append(tab)

    # Title / Label (12pt)
    r1 = p.add_run(num_text + title_text)
    r1.font.name = 'Calibri'
    r1.font.size = Pt(12)
    r1.font.color.rgb = RGBColor(0, 0, 0)
    r1.bold = is_bold

    # Dotted leader + Page number (12pt)
    r2 = p.add_run(f'\t{pg_text}')
    r2.font.name = 'Calibri'
    r2.font.size = Pt(12)
    r2.font.color.rgb = RGBColor(0, 0, 0)
    r2.bold = is_bold


# ══════════════════════════════════════════════════════════════════════════════
# COVER PAGE
# ══════════════════════════════════════════════════════════════════════════════

def _render_cover(doc, div):
    """Render the document cover page."""
    for elem in div.children:
        if isinstance(elem, NavigableString):
            continue
        classes = elem.get('class', [])
        text = elem.get_text().strip()

        if 'cover-label' in classes:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(8)
            r = p.add_run(text)
            r.font.name = 'Calibri'; r.font.size = Pt(12)
            r.font.color.rgb = RGBColor(0, 0, 0)

        elif 'cover-appname' in classes:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(12)
            r = p.add_run(text)
            r.font.name = 'Calibri'; r.font.size = Pt(32)
            r.bold = True; r.font.color.rgb = RGBColor(0, 0, 0)

        elif 'cover-desc' in classes:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(text)
            r.font.name = 'Calibri'; r.font.size = Pt(12)
            r.bold = True; r.font.color.rgb = RGBColor(0, 0, 0)

        elif 'cover-org' in classes:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(60)
            r = p.add_run(text)
            r.font.name = 'Calibri'; r.font.size = Pt(12)
            r.bold = True; r.font.color.rgb = RGBColor(0, 0, 0)

        elif 'cover-footer' in classes:
            for sub in elem.children:
                if isinstance(sub, NavigableString):
                    continue
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(sub.get_text().strip())
                r.font.name = 'Calibri'; r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_page_break()


# ══════════════════════════════════════════════════════════════════════════════
# ELEMENT DISPATCHER
# ══════════════════════════════════════════════════════════════════════════════

_GLOBAL_IMG_COUNTER = [0]
_GLOBAL_SCRIPT_DIR  = ''


def _process_elem(doc, elem, img_counter, script_dir):
    """Route an HTML element to the appropriate renderer."""
    if isinstance(elem, NavigableString):
        text = str(elem).strip()
        if text:
            p = doc.add_paragraph()
            p.paragraph_format.alignment   = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.space_after  = Pt(7)
            _set_indent(p, first_cm=1.25)
            _set_line_spacing(p, 1.6)
            p.add_run(text).font.name = 'Calibri'
        return

    tag     = (elem.name or '').lower()
    classes = elem.get('class', [])

    # ── Cover ──
    if tag == 'div' and 'cover' in classes:
        _render_cover(doc, elem)
        return

    # ── Page-break div wrapper (Heading 1 style handles page break automatically) ──
    if tag == 'div' and 'page-break' in classes:
        _process_children(doc, elem, img_counter, script_dir)
        return

    # ── Chapter page wrapper ──
    if tag == 'div' and 'page' in classes:
        _process_children(doc, elem, img_counter, script_dir)
        return

    # ── Section-header inside page-break div (DAFTAR ISI, DAFTAR GAMBAR, DAFTAR TABEL) ──
    if tag == 'p' and 'sec-header' in classes:
        text = elem.get_text().strip().upper()
        if 'DAFTAR ISI' in text:
            _add_heading(doc, 'DAFTAR ISI', level=1)
            return  # Allow children (toc-row) to render below
        if 'DAFTAR GAMBAR' in text:
            _add_heading(doc, 'DAFTAR GAMBAR', level=1)
            return  # Allow children (toc-row) to render below
        if 'DAFTAR TABEL' in text:
            _add_heading(doc, 'DAFTAR TABEL', level=1)
            return  # Allow children (toc-row) to render below
        _add_heading(doc, elem.get_text().strip(), level=1)
        return

    # ── Render TOC / LOF / LOT rows with leader dots and right page number ──
    if tag == 'div' and 'toc-row' in classes:
        _add_toc_row(doc, elem)
        return

    # ── Chapter heading: h2.ch → Heading 1 ──
    if tag == 'h2' and 'ch' in classes:
        num   = (elem.find(class_='ch-num')   or elem).get_text()
        title = (elem.find(class_='ch-title') or elem).get_text()
        full  = (num.strip() + '  ' + title.strip()).strip()
        _add_heading(doc, full, level=1)
        return

    # ── Section heading: h3.sec → Heading 2 ──
    if tag == 'h3' and 'sec' in classes:
        num   = (elem.find(class_='sec-num')   or elem).get_text()
        title = (elem.find(class_='sec-title') or elem).get_text()
        full  = (num.strip() + '  ' + title.strip()).strip()
        _add_heading(doc, full, level=2)
        return

    # ── Sub-section heading: h4.subsec → Heading 3 ──
    if tag == 'h4' and 'subsec' in classes:
        num   = (elem.find(class_='sec-num')   or elem).get_text()
        title = (elem.find(class_='sec-title') or elem).get_text()
        full  = (num.strip() + '  ' + title.strip()).strip()
        _add_heading(doc, full, level=3)
        return

    # ── Generic h1 → H1 ──
    if tag == 'h1':
        _add_heading(doc, elem.get_text().strip(), level=1)
        return
    # ── Generic h2 → H2 ──
    if tag == 'h2':
        _add_heading(doc, elem.get_text().strip(), level=2)
        return
    # ── Generic h3 → H3 ──
    if tag == 'h3':
        _add_heading(doc, elem.get_text().strip(), level=3)
        return
    # ── Generic h4 → H4 ──
    if tag == 'h4':
        _add_heading(doc, elem.get_text().strip(), level=4)
        return

    # ── Figure caption → Caption style (enables auto LOF) ──
    if tag == 'p' and 'fig-cap' in classes:
        _add_fig_caption(doc, elem)
        return

    # ── Table caption → TableCaption style (enables auto LOT) ──
    if tag == 'p' and 'tbl-cap' in classes:
        _add_tbl_caption(doc, elem)
        return

    # ── Bold paragraph ──
    if tag == 'p' and 'bold-para' in classes:
        _add_bold_para(doc, elem)
        return

    # ── Regular paragraph ──
    if tag == 'p':
        _add_body_para(doc, elem)
        return

    # ── Figure image ──
    if tag == 'div' and 'fig' in classes:
        _add_image(doc, elem, img_counter, script_dir)
        return

    # ── Blockquote note ──
    if tag == 'blockquote':
        _add_blockquote(doc, elem)
        return

    # ── Ordered list ──
    if tag == 'ol':
        _add_ordered_list(doc, elem)
        return

    # ── Unordered list ──
    if tag == 'ul':
        _add_unordered_list(doc, elem)
        return

    # ── Table ──
    if tag == 'table':
        _add_table(doc, elem)
        return

    # ── Default: recurse ──
    _process_children(doc, elem, img_counter, script_dir)


def _process_children(doc, container, img_counter, script_dir):
    for child in container.children:
        _process_elem(doc, child, img_counter, script_dir)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def build_docx():
    global _GLOBAL_IMG_COUNTER, _GLOBAL_SCRIPT_DIR

    script_dir = os.path.dirname(os.path.abspath(__file__))
    html_path  = os.path.join(script_dir, 'PANDUAN_PENGGUNA.html')
    docx_path  = os.path.join(script_dir, 'PANDUAN_PENGGUNA.docx')

    _GLOBAL_SCRIPT_DIR  = script_dir
    _GLOBAL_IMG_COUNTER = [0]

    if not os.path.exists(html_path):
        print(f'[!] File tidak ditemukan: {html_path}')
        return

    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'lxml')

    doc = Document()

    # ── Page: A4, margin 25mm kiri, 20mm kanan, 22mm atas, 20mm bawah ─────────
    for sec in doc.sections:
        sec.page_width    = Cm(21.0)
        sec.page_height   = Cm(29.7)
        sec.top_margin    = Cm(2.2)
        sec.bottom_margin = Cm(2.0)
        sec.left_margin   = Cm(2.5)
        sec.right_margin  = Cm(2.0)
        sec.different_first_page_header_footer = True

        # Footer page number ("| " + PAGE field)
        footer = sec.footer
        p_ft = footer.paragraphs[0]
        p_ft.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_ft.paragraph_format.space_before = Pt(0)
        p_ft.paragraph_format.space_after  = Pt(0)
        _set_line_spacing(p_ft, 1.0)

        r_pipe = p_ft.add_run("| ")
        r_pipe.font.name = 'Calibri'
        r_pipe.font.size = Pt(9)
        r_pipe.font.color.rgb = RGBColor(0, 0, 0)

        fld_page = OxmlElement('w:fldSimple')
        fld_page.set(qn('w:instr'), 'PAGE')
        p_ft._p.append(fld_page)

    # Force Word to auto-update field codes on document open
    upd_elem = parse_xml(r'<w:updateFields %s w:val="true"/>' % nsdecls('w'))
    doc.settings.element.append(upd_elem)

    # ── Setup styles ──────────────────────────────────────────────────────────
    setup_styles(doc)

    # ── Process body ──────────────────────────────────────────────────────────
    body = soup.find('body')
    if not body:
        print('[!] Elemen <body> tidak ditemukan.')
        return

    _process_children(doc, body, _GLOBAL_IMG_COUNTER, script_dir)

    # ── Save ──────────────────────────────────────────────────────────────────
    try:
        doc.save(docx_path)
        kb = os.path.getsize(docx_path) // 1024
        print(f'[OK] DOCX dibuat: {docx_path} ({kb} KB)')
    except PermissionError:
        alt_path = os.path.join(script_dir, 'PANDUAN_PENGGUNA_updated.docx')
        doc.save(alt_path)
        kb = os.path.getsize(alt_path) // 1024
        print(f'[!] File PANDUAN_PENGGUNA.docx sedang dibuka/terkunci oleh aplikasi lain.')
        print(f'[OK] Disimpan ke file alternatif: {alt_path} ({kb} KB)')

if __name__ == '__main__':
    build_docx()
