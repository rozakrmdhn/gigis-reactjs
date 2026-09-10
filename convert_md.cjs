const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mdPath = path.join(__dirname, 'Bab3_Metodologi_Penelitian.md');
const htmlPath = path.join(__dirname, 'Bab3_Metodologi_Penelitian.html');
const pdfPath = path.join(__dirname, 'Bab3_Metodologi_Penelitian_Relevan.pdf');
const pdfPathStandard = path.join(__dirname, 'Bab3_Metodologi_Penelitian.pdf');

let md = fs.readFileSync(mdPath, 'utf8');

function mdToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let inTable = false;
  let tableHeaderDone = false;
  let inList = false;
  let inRawHtmlTable = false;
  let inMermaid = false;
  let mermaidCode = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Mermaid Code Block Handling
    if (line.startsWith('```mermaid')) {
      inMermaid = true;
      mermaidCode = '';
      continue;
    }
    if (inMermaid) {
      if (line.startsWith('```')) {
        inMermaid = false;
        html += `<pre class="mermaid">\n${mermaidCode}</pre>\n`;
      } else {
        mermaidCode += line + '\n';
      }
      continue;
    }

    // Raw HTML Table Passthrough
    if (line.startsWith('<table')) {
      inRawHtmlTable = true;
    }
    if (inRawHtmlTable) {
      html += line + '\n';
      if (line.includes('</table>')) {
        inRawHtmlTable = false;
      }
      continue;
    }

    // Markdown Table rows
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) {
        tableHeaderDone = true;
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaderDone = false;
        html += '<table>\n';
      }

      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const tag = !tableHeaderDone ? 'th' : 'td';
      
      html += '  <tr>\n';
      cells.forEach(cell => {
        let cellContent = parseInline(cell);
        html += `    <${tag}>${cellContent}</${tag}>\n`;
      });
      html += '  </tr>\n';
      continue;
    } else if (inTable) {
      inTable = false;
      html += '</table>\n';
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        html += '<ul>\n';
      }
      html += `  <li>${parseInline(line.substring(2))}</li>\n`;
      continue;
    } else if (inList && !line.startsWith('- ') && !line.startsWith('* ')) {
      inList = false;
      html += '</ul>\n';
    }

    if (line === '') {
      continue;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${parseInline(line.substring(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${parseInline(line.substring(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${parseInline(line.substring(4))}</h3>\n`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${parseInline(line.substring(5))}</h4>\n`;
    } else if (line.startsWith('---')) {
      html += `<hr />\n`;
    } else {
      html += `<p>${parseInline(line)}</p>\n`;
    }
  }

  if (inTable) html += '</table>\n';
  if (inList) html += '</ul>\n';

  return html;
}

function parseInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/<ul>/g, '<ul>')
    .replace(/<\/ul>/g, '<\/ul>')
    .replace(/<li>/g, '<li>')
    .replace(/<\/li>/g, '<\/li>');
}

const bodyHtml = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bab III Metodologi Penelitian WebGIS</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    });
  </script>
  <style>
    @page {
      size: A4 landscape;
      margin: 1cm;
    }
    body {
      font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #111;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 15pt;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 15px;
    }
    h2 {
      font-size: 13pt;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 11pt;
      margin-top: 15px;
      margin-bottom: 6px;
    }
    h4 {
      font-size: 10pt;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    p {
      text-align: justify;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 15px;
      font-size: 8.5pt;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    tr.section-row td {
      background-color: #eaeaea;
    }
    th {
      background-color: #f2f4f8;
      color: #000;
      font-weight: bold;
      text-align: center;
      padding: 6px 4px;
      border: 1px solid #333;
      vertical-align: middle;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #333;
      vertical-align: top;
    }
    ul {
      margin: 2px 0 2px 14px;
      padding: 0;
    }
    li {
      margin-bottom: 2px;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      background-color: #f4f4f4;
      padding: 1px 3px;
      border-radius: 3px;
    }
    pre.mermaid {
      text-align: center;
      background: #fafafa;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin: 15px 0;
    }
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');

const edgePath = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"`;
const cmd = `${edgePath} --headless --disable-gpu --virtual-time-budget=5000 --print-to-pdf="${pdfPath}" "${htmlPath}"`;

try {
  execSync(cmd);
  console.log('PDF successfully generated:', pdfPath);
} catch (err) {
  console.error('Error generating PDF:', err);
}
