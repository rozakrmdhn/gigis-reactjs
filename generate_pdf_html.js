import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const mdPath   = path.join(__dirname, 'PANDUAN_PENGGUNA.md');
const htmlPath = path.join(__dirname, 'PANDUAN_PENGGUNA.html');
const pdfPath  = path.join(__dirname, 'PANDUAN_PENGGUNA.pdf');

function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderInline(s) {
    return s
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
}

function embedImage(relPath) {
    const abs = path.join(__dirname, relPath);
    if (!fs.existsSync(abs)) { console.warn(`  [!] ${relPath}`); return relPath; }
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs).replace('.','').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    console.log(`  [✓] ${relPath}`);
    return `data:${mime};base64,${buf.toString('base64')}`;
}

const raw = fs.readFileSync(mdPath, 'utf8');
const lines = raw.split('\n');

// Parse Cover Meta (without print date)
const meta = {
    title: 'PANDUAN PENGGUNA',
    subtitle: 'MELAROSA 2.0',
    description: 'Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial',
    org: 'Bappeda Kabupaten Bojonegoro',
    verLabel: 'Versi 1.0',
    date: ''
};

// Parser state
const blocks = [];
const allImages = [];
const allCaptions = [];
const allTableCaptions = [];
const chapters = [];
let curChapter = null;
let curSection = null;

let i = 0;

// Skip Cover Header lines
while (i < lines.length && !lines[i].startsWith('---')) {
    const t = lines[i].trim();
    if (t.startsWith('# PANDUAN PENGGUNA')) meta.title = 'PANDUAN PENGGUNA';
    else if (t.startsWith('# MELAROSA 2.0')) meta.subtitle = 'MELAROSA 2.0';
    else if (t.includes('Monitoring Layanan')) meta.description = t.replace(/\*/g, '');
    else if (t.includes('Bappeda')) meta.org = t.replace(/\*/g, '');
    else if (t.includes('Versi')) meta.verLabel = t.replace(/\*/g, '');
    i++;
}

while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (/^---+$/.test(t)) { i++; continue; }

    // TOC / List of Figures / List of Tables skip parsing body (we generate dynamically)
    if (t === '# DAFTAR ISI' || t === '# DAFTAR GAMBAR' || t === '# DAFTAR TABEL') {
        i++;
        while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('---')) {
            i++;
        }
        continue;
    }

    // Chapter: ## BAB X TITLE
    if (/^##\s+BAB\s+\d+/i.test(line)) {
        const m = line.match(/^##\s+BAB\s+(\d+)\s*(.*)/i);
        const ch = { num: m[1], title: m[2].trim(), sections: [] };
        blocks.push({ type: 'chapter', p: ch });
        chapters.push(ch);
        curChapter = ch;
        curSection = null;
        i++; continue;
    }

    // Section: ### X.X Title
    if (/^###\s+\d+\.\d+\s+/.test(line)) {
        const m = line.match(/^###\s+(\d+\.\d+)\s+(.*)/);
        const sec = { num: m[1], title: m[2].trim(), subsections: [] };
        blocks.push({ type: 'section', p: sec });
        if (curChapter) curChapter.sections.push(sec);
        curSection = sec;
        i++; continue;
    }

    // SubSection: #### X.X.X Title
    if (/^####\s+\d+\.\d+\.\d+\s+/.test(line)) {
        const m = line.match(/^####\s+(\d+\.\d+\.\d+)\s+(.*)/);
        const subsec = { num: m[1], title: m[2].trim() };
        blocks.push({ type: 'subsection', p: subsec });
        if (curSection) curSection.subsections.push(subsec);
        i++; continue;
    }

    // Image: ![alt](src)
    if (/^!\[.*?\]\(.*?\)$/.test(t)) {
        const m = t.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (m) {
            const src = embedImage(m[2]);
            const img = { alt: m[1], src, relPath: m[2] };
            allImages.push(img);
            blocks.push({ type: 'image', p: img });
        }
        i++; continue;
    }

    // Caption: *Gambar X-X. Caption text*
    if (/^\*Gambar\s+\d+[-–]\d+.*\*$/i.test(t)) {
        const capText = t.replace(/^\*/, '').replace(/\*$/, '');
        allCaptions.push(capText);
        blocks.push({ type: 'caption', p: { text: capText } });
        i++; continue;
    }

    // Table caption: *Tabel X-X. Caption text*
    if (/^\*Tabel\s+\d+[-–]\d+.*\*$/i.test(t)) {
        const capText = t.replace(/^\*/, '').replace(/\*$/, '');
        allTableCaptions.push(capText);
        blocks.push({ type: 'table-caption', p: { text: capText } });
        i++; continue;
    }

    // Table parsing
    if (t.startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
        }
        blocks.push({ type: 'table', p: { lines: tableLines } });
        continue;
    }

    // Blockquote (Note)
    if (t.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
            quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
            i++;
        }
        blocks.push({ type: 'blockquote', p: { text: quoteLines.join('\n') } });
        continue;
    }

    // Bold paragraph
    if (/^\*\*.*\*\*$/.test(t)) {
        blocks.push({ type: 'bold', p: { text: t } });
        i++; continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
            const txt = lines[i].trim().replace(/^\d+\.\s+/, '');
            const subs = [];
            items.push({ text: txt, subs });
            i++;
            while (i < lines.length && /^\s{2,}[-*]\s+/.test(lines[i])) {
                subs.push(lines[i].trim().replace(/^[-*]\s+/, ''));
                i++;
            }
        }
        blocks.push({ type: 'ol', p: { items } });
        continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(t)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]) && !/^##/.test(lines[i])) {
            items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
            i++;
        }
        blocks.push({ type: 'ul', p: { items } });
        continue;
    }

    if (!t) { i++; continue; }

    blocks.push({ type: 'para', p: { text: t } });
    i++;
}

// ─── TOC Generator (BOLD FOR HEADING 1 / BAB) ────────────────────────────────────
function tocRow(label, title, pg, indent, isBold = false) {
    const pad = indent * 18;
    const numHtml = label ? `<span class="toc-num">${escHtml(label)}</span>` : '';
    const boldCls = isBold ? ' font-bold' : '';
    return `<div class="toc-row${boldCls}" style="padding-left:${pad}px">
      ${numHtml}
      <span class="toc-title">${escHtml(title)}</span>
      <span class="toc-fill"></span>
      <span class="toc-pg">${pg}</span></div>`;
}

let tocH = '';
tocH += tocRow('', 'DAFTAR ISI', '2', 0, true);
tocH += tocRow('', 'DAFTAR GAMBAR', '3', 0, true);
tocH += tocRow('', 'DAFTAR TABEL', '3', 0, true);
let pg = 4;
chapters.forEach((ch, ci) => {
    tocH += tocRow(`Bab ${ch.num}`, ch.title, String(pg + (ci * 2)), 0, true); // Bold Heading 1 / Bab
    ch.sections.forEach(s => {
        tocH += tocRow(s.num, s.title, String(pg + (ci * 2)), 1, false);
        if (s.subsections && s.subsections.length > 0) {
            s.subsections.forEach(ss => {
                tocH += tocRow(ss.num, ss.title, String(pg + (ci * 2)), 2, false);
            });
        }
    });
});

// ─── Daftar Gambar ──────────────────────────────────
let dgH = '';
allCaptions.forEach((cap, idx) => {
    dgH += `<div class="toc-row">
      <span class="dg-label">${escHtml(cap)}</span>
      <span class="toc-fill"></span>
      <span class="toc-pg">${pg + Math.floor(idx * 1.2)}</span></div>`;
});

// ─── Daftar Tabel ───────────────────────────────────
let dtH = '';
allTableCaptions.forEach((cap, idx) => {
    dtH += `<div class="toc-row">
      <span class="dg-label">${escHtml(cap)}</span>
      <span class="toc-fill"></span>
      <span class="toc-pg">${pg + Math.floor(idx * 1.5)}</span></div>`;
});

// ─── Render Table Block ─────────────────────────────
function renderTable(lines) {
    if (!lines || lines.length === 0) return '';
    let out = '<table class="doc-table"><thead>';
    lines.forEach((row, idx) => {
        const cols = row.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
        if (idx === 0) {
            out += '<tr>' + cols.map(c => `<th>${renderInline(escHtml(c.trim()))}</th>`).join('') + '</tr></thead><tbody>';
        } else if (idx === 1 && /^[\s|:-]+$/.test(row)) {
            // divider
        } else {
            out += '<tr>' + cols.map(c => `<td>${renderInline(escHtml(c.trim()))}</td>`).join('') + '</tr>';
        }
    });
    out += '</tbody></table>';
    return out;
}

// ─── Render Blocks ──────────────────────────────────
function renderAll(bks) {
    let html = '';
    let firstChap = true;
    for (const b of bks) {
        switch(b.type) {
            case 'chapter':
                if (!firstChap) html += '</div>';
                html += `<div class="page page-break">`;
                html += `<h2 class="ch"><span class="ch-num">BAB ${escHtml(b.p.num)}</span><span class="ch-title">${escHtml(b.p.title)}</span></h2>`;
                firstChap = false;
                break;
            case 'section':
                html += `<h3 class="sec"><span class="sec-num">${escHtml(b.p.num)}</span><span class="sec-title">${escHtml(b.p.title)}</span></h3>`;
                break;
            case 'subsection':
                html += `<h4 class="subsec"><span class="sec-num">${escHtml(b.p.num)}</span><span class="sec-title">${escHtml(b.p.title)}</span></h4>`;
                break;
            case 'para':
                html += `<p>${renderInline(escHtml(b.p.text))}</p>`;
                break;
            case 'bold':
                html += `<p class="bold-para">${renderInline(escHtml(b.p.text))}</p>`;
                break;
            case 'image':
                html += `<div class="fig"><img src="${b.p.src}" alt="${escHtml(b.p.alt)}"/></div>`;
                break;
            case 'caption':
                html += `<p class="fig-cap">${escHtml(b.p.text)}</p>`;
                break;
            case 'table-caption':
                html += `<p class="tbl-cap">${escHtml(b.p.text)}</p>`;
                break;
            case 'table':
                html += renderTable(b.p.lines);
                break;
            case 'blockquote': {
                const rawTxt = b.p.text.split(/\n+/).map(s => s.trim()).filter(Boolean);
                const title = rawTxt[0] ? renderInline(escHtml(rawTxt[0])) : '';
                const bodyText = rawTxt.slice(1).map(s => renderInline(escHtml(s))).join(' ');
                html += `<blockquote class="doc-note"><p class="note-title">${title}</p><p class="note-body">${bodyText}</p></blockquote>`;
                break;
            }
            case 'ol':
                html += '<ol class="doc-ol">' + b.p.items.map(it =>
                    `<li>${renderInline(escHtml(it.text))}${it.subs.length ? '<ul class="sub-list">' + it.subs.map(s => `<li>${renderInline(escHtml(s))}</li>`).join('') + '</ul>' : ''}</li>`
                ).join('') + '</ol>';
                break;
            case 'ul':
                html += '<ul class="doc-ul">' + b.p.items.map(it => `<li>${renderInline(escHtml(it))}</li>`).join('') + '</ul>';
                break;
        }
    }
    html += '</div>';
    return html;
}

const contentHtml = renderAll(blocks);

// ─── Full HTML (BOLD HEADING 1 IN TABLE OF CONTENTS) ──────────────────────
const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${escHtml(meta.title)} — ${escHtml(meta.subtitle)}</title>
<style>

@page {
  size: A4;
  margin: 22mm 20mm 20mm 25mm;
  @top-left { content: none; }
  @top-right { content: none; }
  @top-center { content: none; }
  @bottom-left {
    content: "| " counter(page);
    font-family: Calibri, Arial, sans-serif;
    font-size: 9pt;
    color: #000000;
  }
}

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

body {
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  font-size: 11pt;
  color: #000000;
  line-height: 1.6;
  background: #ffffff;
}

.page-break { page-break-before: always; }

/* ════ COVER ════ */
.cover {
  min-height: 250mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cover-label {
  font-size: 12pt;
  font-weight: 400;
  color: #000000;
  margin-bottom: 12px;
}
.cover-appname {
  font-size: 32pt;
  font-weight: 900;
  color: #000000;
  line-height: 1.15;
}
.cover-desc {
  font-size: 12pt;
  font-weight: 700;
  color: #000000;
  margin-top: 14px;
}
.cover-org {
  font-size: 12pt;
  font-weight: 700;
  color: #000000;
  margin-top: 4px;
}
.cover-footer {
  margin-top: 60mm;
  font-size: 10pt;
  color: #000000;
}

/* ════ TOC & DAFTAR GAMBAR/TABEL ════ */
.sec-header {
  font-size: 14pt;
  font-weight: 700;
  color: #000000;
  margin-bottom: 18px;
  margin-left: 0;
  text-align: left;
}
.toc-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 5px;
  font-size: 10.5pt;
  line-height: 1.8;
  color: #000000;
}
.toc-row.font-bold {
  font-weight: 700;
  margin-top: 8px;
}
.toc-row.font-bold .toc-num,
.toc-row.font-bold .toc-title,
.toc-row.font-bold .toc-pg {
  font-weight: 700;
}
.toc-num {
  font-weight: 400;
  white-space: nowrap;
  margin-right: 12px;
  flex-shrink: 0;
  color: #000000;
}
.toc-title, .dg-label {
  white-space: nowrap;
  flex-shrink: 0;
  color: #000000;
}
.toc-fill {
  flex: 1;
  border-bottom: 1px dotted #000000;
  margin: 0 6px 3px;
  min-width: 20px;
}
.toc-pg {
  white-space: nowrap;
  flex-shrink: 0;
  color: #000000;
}

/* ════ CHAPTER (HEADING 1 - BAB - RATA KIRI) ════ */
.page { margin-bottom: 10px; color: #000000; }
.ch {
  font-size: 14pt;
  font-weight: 700;
  color: #000000;
  margin-top: 6px;
  margin-bottom: 14px;
  margin-left: 0;
  text-align: left;
  display: flex;
  gap: 0;
}
.ch-num {
  margin-right: 14px;
  flex-shrink: 0;
  color: #000000;
}
.ch-title { color: #000000; }

/* ════ SECTION (HEADING 2 - SUB BAB - RATA KIRI) ════ */
.sec {
  font-size: 12pt;
  font-weight: 700;
  color: #000000;
  margin-top: 18px;
  margin-bottom: 8px;
  margin-left: 0;
  text-align: left;
  display: flex;
  gap: 0;
}
.sec-num {
  margin-right: 12px;
  flex-shrink: 0;
  color: #000000;
}
.sec-title { color: #000000; }

/* ════ SUB-SECTION (HEADING 3 - RATA KIRI) ════ */
.subsec {
  font-size: 11pt;
  font-weight: 700;
  color: #000000;
  margin-top: 14px;
  margin-bottom: 6px;
  margin-left: 0;
  text-align: left;
  display: flex;
  gap: 0;
}

/* ════ BODY PARAGRAPHS (INDENT AWAL PARAGRAF 1.25CM) ════ */
p {
  text-align: justify;
  margin-bottom: 7px;
  margin-left: 0;
  text-indent: 1.25cm;
  font-size: 11pt;
  color: #000000;
}
p.bold-para {
  font-weight: 700;
  margin-top: 10px;
  margin-left: 0;
  text-indent: 0;
  color: #000000;
}

/* ════ LISTS (BERNOMOR / BULLET SEJAJAR DENGAN INDENTASI PARAGRAF 1.25CM) ════ */
ol.doc-ol, ul.doc-ul {
  margin: 6px 0 10px 1.25cm;
  padding-left: 0;
  color: #000000;
}
ol.doc-ol { list-style-type: decimal; }
ul.doc-ul { list-style-type: disc; }
li {
  margin-bottom: 4px;
  font-size: 11pt;
  text-align: justify;
  color: #000000;
  padding-left: 4px;
}
.sub-list {
  margin-top: 3px;
  margin-left: 1.25cm;
  list-style-type: circle;
}

/* ════ TABLES ════ */
.doc-table {
  width: 100%;
  margin-left: 0;
  border-collapse: collapse;
  margin-top: 12px;
  margin-bottom: 8px;
  font-size: 10pt;
  page-break-inside: avoid;
  color: #000000;
}
.doc-table th {
  background-color: #ffffff;
  color: #000000;
  padding: 8px 12px;
  text-align: left;
  font-weight: 700;
  border: 1px solid #000000;
}
.doc-table td {
  padding: 7px 12px;
  border: 1px solid #000000;
  vertical-align: top;
  color: #000000;
  background-color: #ffffff;
}

/* ════ BLOCKQUOTE / NOTE (COLORFUL CALLOUT WITH PROPER TIGHT SPACING) ════ */
blockquote.doc-note {
  border-left: 4px solid #1d4ed8;
  background-color: #eff6ff;
  margin: 14px 0;
  padding: 10px 14px;
  font-size: 10pt;
  color: #1e3a8a;
  border-radius: 0 6px 6px 0;
  text-indent: 0;
}
blockquote.doc-note p {
  text-indent: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.45;
}
blockquote.doc-note p.note-title {
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 4px !important;
  font-size: 10pt;
}
blockquote.doc-note p.note-body {
  color: #1e3a8a;
  font-size: 10pt;
}

/* ════ FIGURES — INLINE ════ */
.fig {
  margin: 16px 0 4px 0;
  text-align: center;
  page-break-inside: avoid;
}
.fig img {
  max-width: 100%;
  max-height: 380px;
  object-fit: contain;
  border: 0.5px solid #000000;
  display: block;
  margin: 0 auto;
}
.fig-cap, .tbl-cap {
  text-align: center;
  font-size: 9.5pt;
  font-style: italic;
  color: #000000;
  margin-top: 6px;
  margin-bottom: 16px;
  margin-left: 0;
  text-indent: 0;
  font-weight: 600;
}

/* ════ MISC ════ */
code { font-family: Consolas, monospace; font-size: 9.5pt; background: #ffffff; color: #000000; padding: 1px 4px; border: 1px solid #000000; }
strong { font-weight: 700; color: #000000; }
em { font-style: italic; color: #000000; }
a { color: #000000; text-decoration: underline; }

</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <p class="cover-label">${escHtml(meta.title)}</p>
  <p class="cover-appname">${escHtml(meta.subtitle)}</p>
  <p class="cover-desc">${escHtml(meta.description)}</p>
  <p class="cover-org">${escHtml(meta.org)}</p>
  <div class="cover-footer">
    <p>${escHtml(meta.verLabel)}</p>
  </div>
</div>

<!-- DAFTAR ISI -->
<div class="page-break">
  <p class="sec-header">DAFTAR ISI</p>
  ${tocH}
</div>

<!-- DAFTAR GAMBAR -->
<div class="page-break">
  <p class="sec-header">DAFTAR GAMBAR</p>
  ${dgH}
</div>

<!-- DAFTAR TABEL -->
<div class="page-break">
  <p class="sec-header">DAFTAR TABEL</p>
  ${dtH}
</div>

<!-- KONTEN -->
${contentHtml}

</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[✓] HTML dibuat:', htmlPath);

const edge = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"`;
try {
    execSync(`${edge} --headless --no-sandbox --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`, { stdio:'pipe' });
    if (fs.existsSync(pdfPath)) {
        const kb = (fs.statSync(pdfPath).size/1024).toFixed(0);
        console.log(`[✓] PDF dibuat: PANDUAN_PENGGUNA.pdf (${kb} KB)`);
    }
} catch(e) { console.error('[✗]', e.message); }
