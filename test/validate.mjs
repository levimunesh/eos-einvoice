// Node check of the validation orchestrator: every sample of every country gets the right scenario and passes;
// every official rule id resolves to an explanation.
import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { loadRules, validateDocument } from '../src/validate.js';
import { explain } from '../src/explain.js';
import { samples, auSamples, caSamples } from './samples.mjs';
import { generateXml, exampleInvoice, exampleSupplierInvoice, faultyExampleXml } from '../src/examples.js';
const NAMES = ['en16931-cii', 'en16931-ubl', 'xrechnung-cii', 'xrechnung-ubl', 'fr-ctc-cii', 'fr-ctc-ubl', 'pint-aunz-shared', 'pint-aunz-aligned', 'structure', 'fa3'];
const T = {}; for (const n of NAMES) T[n] = JSON.parse(fs.readFileSync(new URL(`../build/rules/${n}.json`, import.meta.url)));
loadRules(T);
let n = 0; const official = {};
for (const k of NAMES.filter(x => T[x].patterns)) for (const p of T[k].patterns) for (const r of p.rules) for (const c of r.checks) { n++; const text = c.text.filter(x => typeof x === 'string').join(''); const e = explain(c.id, text); if (!e.title) throw new Error('no title ' + c.id); if (!e.fix && !/^(CII|UBL)/.test(c.id)) (official[k] ||= new Set()).add(c.id); }
console.log('rules', n, '| shown with the official wording only:', Object.entries(official).map(([k, v]) => `${k}: ${v.size}`).join(', ') || 'none');
let bad = 0;
const expect = async (name, xml, want, wantCountry) => { const r = await validateDocument(parseXmlDocument(xml)); const ok = r.verdict === want && (!wantCountry || r.country === wantCountry) && r.engineErrors.length === 0; if (!ok) { bad++; console.log('FAIL', name, r.verdict, r.country, r.scenario, r.structure.slice(0, 2).map(s => s.message), r.findings.filter(f => f.severity !== 'info').slice(0, 4).map(f => f.id + ' ' + f.title), r.engineErrors.slice(0, 2)); } return r; };
let pl = {}; try { pl = (await import('./pl-samples.mjs')).plSamples; } catch { console.log('(no Polish samples found)'); }
const all = { ...samples, ...auSamples, ...caSamples, ...pl };
for (const [name, inv] of Object.entries(all)) await expect(name, generateXml(inv), 'valid', inv.profile === 'xrechnung' ? 'DE' : inv.country);
for (const cc of ['DE', 'FR', 'PL', 'AU', 'CA']) {
  await expect(`example ${cc}`, generateXml(exampleInvoice(cc)), 'valid', cc); await expect(`supplier ${cc}`, generateXml(exampleSupplierInvoice(cc)), 'valid', cc);
  const r = await expect(`faulty ${cc}`, faultyExampleXml(cc), 'invalid', cc);
  console.log(`faulty ${cc}: ${r.counts.error} errors, ${r.counts.warning} warnings →`, [...new Set([...r.structure.map(s => 'structure'), ...r.findings.filter(f => f.severity !== 'info').map(f => f.id)])].join(' '));
}
console.log(`samples and examples checked: ${Object.keys(all).length + 15}; problems: ${bad}`);
for (const f of process.argv.slice(2)) { const t0 = Date.now(); const r = await validateDocument(parseXmlDocument(fs.readFileSync(f, 'utf8'))); console.log(f.split('/').pop(), '→', r.verdict, '|', r.scenario, '|', JSON.stringify(r.counts), Date.now() - t0 + 'ms'); for (const s of r.structure.slice(0, 3)) console.log('    structure:', s.message); for (const x of r.findings.filter(x => x.severity !== 'info').slice(0, 4)) console.log('   ', x.severity, x.id, '—', x.title, '→', x.fix); }
