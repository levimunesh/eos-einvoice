// Convert official Schematron (.sch) into a compact JSON rule table for the in-browser runner.
import fs from 'node:fs'; import path from 'node:path';
import { parseXmlDocument } from 'slimdom';
const SCH = 'http://purl.oclc.org/dsdl/schematron';
const GH = '/home/claude/gh';
const INTL = `${GH}/intl`;
const jobs = [
  ['en16931-cii', `${GH}/eInvoicing-EN16931/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch`, 'EN 16931 rules for CII, CEN/TC 434 validation artefacts 1.3.16'],
  ['en16931-ubl', `${GH}/eInvoicing-EN16931/ubl/schematron/preprocessed/EN16931-UBL-validation-preprocessed.sch`, 'EN 16931 rules for UBL, CEN/TC 434 validation artefacts 1.3.16'],
  ['xrechnung-cii', `${GH}/xrechnung-schematron/build/schematron/cii/XRechnung-CII-validation.sch`, 'XRechnung 3.0.2 rules for CII, KoSIT Schematron 2.6.0 incl. Peppol BIS Billing 3.0.21 rules'],
  ['xrechnung-ubl', `${GH}/xrechnung-schematron/build/schematron/ubl/XRechnung-UBL-validation.sch`, 'XRechnung 3.0.2 rules for UBL, KoSIT Schematron 2.6.0 incl. Peppol BIS Billing 3.0.21 rules'],
  ['fr-ctc-cii', `${INTL}/fr/20260903_BR-FR-Flux2-Schematron-CII_V1.4.0.04.sch`, 'French e-invoicing rules BR-FR (Flux 2) for CII, FNFE-MPE Schematron 1.4.0.04'],
  ['fr-ctc-ubl', `${INTL}/fr/20260903_BR-FR-Flux2-Schematron-UBL_V1.4.0.04.sch`, 'French e-invoicing rules BR-FR (Flux 2) for UBL, FNFE-MPE Schematron 1.4.0.04'],
  ['pint-aunz-shared', `${INTL}/aunz/PINT-UBL-validation-preprocessed.sch`, 'Peppol PINT A-NZ Billing 1.1.3, shared PINT rules'],
  ['pint-aunz-aligned', `${INTL}/aunz/PINT-jurisdiction-aligned-rules.sch`, 'Peppol PINT A-NZ Billing 1.1.3, Australia and New Zealand rules'],
];
// helper functions that the runner implements natively (exact big-number or tolerance arithmetic)
const NATIVE = new Set(['u:slack', 'u:decimalOrZero', 'xr:checkIBAN']);
const XSL = 'http://www.w3.org/1999/XSL/Transform';
function xslFunction(fn) {
  const els = [...fn.childNodes].filter(n => n.nodeType === 1);
  const params = [], lets = []; let body = null;
  for (const e of els) {
    if (e.namespaceURI !== XSL) throw new Error('unsupported content in xsl:function ' + fn.getAttribute('name'));
    const sel = (e.getAttribute('select') || '').replace(/\s+/g, ' ').trim();
    if (e.localName === 'param') params.push({ name: e.getAttribute('name'), as: e.getAttribute('as') || 'item()*' });
    else if (e.localName === 'variable') { lets.push({ name: e.getAttribute('name'), value: sel || `'${(e.textContent || '').replace(/'/g, "''")}'` }); }
    else if (e.localName === 'sequence' || e.localName === 'value-of') { if (body) throw new Error('two results in ' + fn.getAttribute('name')); body = { select: sel, valueOf: e.localName === 'value-of' }; }
    else throw new Error(`unsupported xsl:${e.localName} in ${fn.getAttribute('name')}`);
  }
  // variable names with a namespace prefix are not supported by the XPath engine: give them plain names
  for (const l of lets) if (l.name.includes(':')) {
    const plain = l.name.replace(':', '_'); const re = new RegExp('\\$' + l.name.replace(/[-:.]/g, m => '\\' + m) + '(?![\\w.-])', 'g');
    for (const o of lets) o.value = o.value.replace(re, '$' + plain); body.select = body.select.replace(re, '$' + plain); l.name = plain;
  }
  return { name: fn.getAttribute('name'), as: fn.getAttribute('as') || 'item()*', params, lets, body };
}
const kids = (el, name) => [...el.childNodes].filter(n => n.nodeType === 1 && n.namespaceURI === SCH && (!name || n.localName === name));
function textParts(el) {
  const parts = [];
  for (const n of el.childNodes) {
    if (n.nodeType === 3 || n.nodeType === 4) parts.push(n.data);
    else if (n.nodeType === 1 && n.localName === 'value-of') parts.push({ select: n.getAttribute('select') });
    else if (n.nodeType === 1 && n.localName === 'name') parts.push({ name: 1 });
    else if (n.nodeType === 1) parts.push(n.textContent);
  }
  // collapse whitespace in plain strings
  const out = [];
  for (const p of parts) {
    if (typeof p === 'string') { if (typeof out[out.length - 1] === 'string') out[out.length - 1] += p; else out.push(p); }
    else out.push(p);
  }
  return out.map(p => typeof p === 'string' ? p.replace(/\s+/g, ' ') : p);
}
for (const [name, file, title] of jobs) {
  const doc = parseXmlDocument(fs.readFileSync(file, 'utf8'));
  const root = doc.documentElement;
  // resolve includes in place
  for (const inc of kids(root, 'include')) {
    const p = path.resolve(path.dirname(file), inc.getAttribute('href'));
    const sub = parseXmlDocument(fs.readFileSync(p, 'utf8')).documentElement;
    root.replaceChild(doc.importNode(sub, true), inc);
  }
  const ns = {}; for (const n of kids(root, 'ns')) ns[n.getAttribute('prefix')] = n.getAttribute('uri');
  const lets = kids(root, 'let').map(l => ({ name: l.getAttribute('name'), value: l.getAttribute('value') }));
  const patterns = [];
  let nChecks = 0;
  for (const p of kids(root, 'pattern')) {
    for (const l of kids(p, 'let')) lets.push({ name: l.getAttribute('name'), value: l.getAttribute('value') });
    const rules = [];
    for (const r of kids(p, 'rule')) {
      if (r.getAttribute('abstract') === 'true') throw new Error('abstract rule not supported');
      const checks = [];
      for (const c of [...kids(r, 'assert'), ...kids(r, 'report')]) {
        checks.push({ t: c.localName === 'report' ? 'r' : 'a', id: c.getAttribute('id'), flag: c.getAttribute('flag') || 'fatal', test: c.getAttribute('test').replace(/\s+/g, ' ').trim(), text: textParts(c) });
        nChecks++;
      }
      rules.push({ context: r.getAttribute('context').replace(/\s+/g, ' ').trim(), lets: kids(r, 'let').map(l => ({ name: l.getAttribute('name'), value: l.getAttribute('value').replace(/\s+/g, ' ').trim() })), checks });
    }
    patterns.push({ id: p.getAttribute('id'), rules });
  }
  const fnEls = [...root.getElementsByTagNameNS(XSL, 'function')];
  const fnNames = fnEls.map(n => n.getAttribute('name'));
  const prefixNs = {}; for (const a of root.attributes) if (a.name.startsWith('xmlns:')) prefixNs[a.name.slice(6)] = a.value;
  for (const f of fnEls) for (let e = f; e && e.nodeType === 1; e = e.parentNode) for (const a of e.attributes || []) if (a.name.startsWith('xmlns:') && !(a.name.slice(6) in prefixNs)) prefixNs[a.name.slice(6)] = a.value;
  const used = new Set(); const all = JSON.stringify(patterns) + JSON.stringify(lets);
  const functions = [];
  // keep only functions that rules (or other kept functions) call
  let changed = true; const kept = new Set();
  while (changed) { changed = false; for (const f of fnEls) { const n = f.getAttribute('name'); if (kept.has(n) || (name.startsWith('xrechnung') && NATIVE.has(n))) continue; const hay = all + functions.map(x => JSON.stringify(x)).join(''); if (hay.includes(n + '(')) { const def = xslFunction(f); const pfx = n.split(':')[0]; functions.push({ ...def, ns: prefixNs[pfx] ?? ns[pfx] }); kept.add(n); changed = true; } } }
  const out = { name, title, ns, lets: lets.map(l => ({ name: l.name, value: l.value.replace(/\s+/g, ' ').trim() })), functions, patterns };
  fs.writeFileSync(`build/rules/${name}.json`, JSON.stringify(out));
  console.log(name, 'patterns', patterns.length, 'rules', patterns.reduce((a, p) => a + p.rules.length, 0), 'checks', nChecks, 'lets', lets.length, 'bytes', fs.statSync(`build/rules/${name}.json`).size, 'functions used:', functions.map(f => f.name).join(',') || '-');
}
