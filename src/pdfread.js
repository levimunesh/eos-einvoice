// Read text and embedded e-invoice XML from a PDF (pdf.js, run on the main thread).
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs';
globalThis.pdfjsWorker = pdfWorker; // lets pdf.js run without a separate worker file

const XML_NAMES = /^(factur-x|zugferd-invoice|xrechnung|ZUGFeRD-invoice|order-x)\.xml$/i;

export async function readPdf(arrayBuffer) {
  const task = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false, disableFontFace: true });
  const pdf = await task.promise;
  let embeddedXml = '', embeddedName = '';
  try {
    const att = await pdf.getAttachments();
    if (att) {
      const list = Object.values(att);
      const hit = list.find(a => XML_NAMES.test(a.filename || '')) || list.find(a => /\.xml$/i.test(a.filename || ''));
      if (hit && hit.content) { embeddedXml = new TextDecoder('utf-8').decode(hit.content); embeddedName = hit.filename; }
    }
  } catch { /* no attachments */ }
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    // rebuild visual lines: group by baseline, order left to right
    const rows = new Map();
    for (const it of tc.items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], w: it.width, s: it.str });
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const items = rows.get(y).sort((a, b) => a.x - b.x); let line = '', end = null;
      for (const it of items) { if (end !== null && it.x - end > 6) line += '   '; else if (end !== null && it.x - end > 0.8 && !line.endsWith(' ')) line += ' '; line += it.s; end = it.x + it.w; }
      text += line.replace(/\s+$/, '') + '\n';
    }
    text += '\n';
  }
  const pages = pdf.numPages;
  try { await task.destroy(); } catch { /* ignore */ }
  return { text, pages, embeddedXml, embeddedName };
}
