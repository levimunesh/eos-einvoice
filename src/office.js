// Word and Excel readers (loaded on demand).
import mammoth from 'mammoth/mammoth.browser.js';
import * as XLSX from 'xlsx/xlsx.mjs';

export async function docxToText(arrayBuffer) {
  // go through HTML so that each table row stays on one line
  const r = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(`<body>${r.value || ''}</body>`, 'text/html');
  const out = [];
  const cellText = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const walk = node => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'table') { for (const tr of el.querySelectorAll('tr')) { const line = [...tr.children].map(cellText).filter(Boolean).join('   '); if (line) out.push(line); } out.push(''); }
      else if (tag === 'ul' || tag === 'ol') walk(el);
      else { const lines = (el.innerText || el.textContent || '').split(/\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean); if (el.querySelector('br')) { const tmp = el.cloneNode(true); for (const br of tmp.querySelectorAll('br')) br.replaceWith('\n'); out.push(...tmp.textContent.split('\n').map(x => x.trim()).filter(Boolean)); } else out.push(...lines); }
    }
  };
  walk(doc.body);
  return out.join('\n');
}
export async function sheetToText(arrayBuffer) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
  let out = '';
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
    const cell = c => (typeof c === 'number' ? (Number.isInteger(c) ? String(c) : c.toFixed(Math.abs(c * 100 - Math.round(c * 100)) < 1e-6 ? 2 : 4)) : c instanceof Date ? `${String(c.getDate()).padStart(2, '0')}.${String(c.getMonth() + 1).padStart(2, '0')}.${c.getFullYear()}` : String(c).trim());
    for (const row of rows) { const line = row.map(cell).filter((c, i, a) => c !== '' || a.slice(i).some(x => x !== '')).join('   ').trim(); if (line) out += line + '\n'; }
    out += '\n';
  }
  return out;
}
