// Validation orchestrator: structure check, then the business rules that apply to the file's declared standard.
// The country is read from the file itself: KSeF namespace → Poland, PINT A-NZ → Australia, XRechnung → Germany, French seller → France.
// German scenario selection and severity overrides mirror the official KoSIT validator configuration for XRechnung (release 2026-08-31).
import { compileRules, validate as runRules } from './schematron.js';
import { checkStructure } from './structure.js';
import { checkXsd } from './xsdcheck.js';
import { parseInvoice } from './parse.js';
import { isFA, parseFA3, fa3Checks, PL_FIELD_LABEL } from './fa3.js';
import { explain } from './explain.js';
import { caChecks } from './cachecks.js';

const LEVELS = {
  'xrechnung|UBL|Invoice': { 'BR-CL-23': 'warning', 'BR-CL-21': 'warning', 'UBL-CR-646': 'error' },
  'xrechnung-extension|UBL|Invoice': { 'BR-CL-21': 'information', 'BR-CL-23': 'warning', 'BR-CL-24': 'information', 'BR-CL-10': 'information', 'BR-CL-11': 'information', 'BR-CL-25': 'information', 'BR-CL-26': 'information', 'BR-CO-16': 'information', 'UBL-CR-470': 'information', 'UBL-CR-646': 'information' },
  'xrechnung-cvd|UBL|Invoice': { 'BR-CL-13': 'information', 'BR-CL-23': 'warning', 'BR-CL-21': 'warning', 'UBL-CR-646': 'error' },
  'xrechnung|UBL|CreditNote': { 'BR-CL-23': 'warning', 'BR-CL-21': 'warning' },
  'xrechnung-cvd|UBL|CreditNote': { 'BR-CL-13': 'information', 'BR-CL-23': 'warning', 'BR-CL-21': 'warning', 'UBL-CR-646': 'error' },
  'xrechnung|CII|Invoice': { 'BR-CL-23': 'warning', 'BR-CL-21': 'warning', 'CII-SR-452': 'error', 'CII-SR-453': 'error', 'CII-SR-454': 'error', 'CII-SR-465': 'error', 'CII-SR-466': 'error', 'CII-SR-475': 'information', 'CII-SR-476': 'information' },
  'xrechnung-extension|CII|Invoice': { 'BR-CL-23': 'warning', 'BR-CL-21': 'information', 'BR-CL-11': 'information', 'BR-CL-10': 'information', 'BR-CL-24': 'information', 'BR-CL-25': 'information', 'BR-CL-26': 'information', 'CII-SR-452': 'error', 'CII-SR-453': 'error', 'CII-SR-454': 'error', 'CII-SR-465': 'error', 'CII-SR-466': 'error', 'CII-SR-475': 'information', 'CII-SR-476': 'information' },
  'xrechnung-cvd|CII|Invoice': { 'BR-CL-13': 'information', 'BR-CL-23': 'warning', 'BR-CL-21': 'warning', 'CII-SR-452': 'error', 'CII-SR-453': 'error', 'CII-SR-454': 'error', 'CII-SR-465': 'error', 'CII-SR-466': 'error', 'CII-SR-475': 'information', 'CII-SR-476': 'information' },
};
const SEV = { fatal: 'error', error: 'error', warning: 'warning', information: 'info', info: 'info' };
const XR_CURRENT = '3.0';

// Rule tables: either given all at once (tests) or as loaders that fetch a table when it is first needed (the app).
let tables = {}; let loaders = {}; const compiled = {};
export function loadRules(t) { tables = { ...t }; for (const k of Object.keys(compiled)) delete compiled[k]; }
export function setRuleLoaders(l) { loaders = l; }
async function table(name) {
  if (!tables[name]) { if (!loaders[name]) throw new Error(`Rule set “${name}” is not available.`); const m = await loaders[name](); tables[name] = m.default || m; }
  return tables[name];
}
const rules = async name => (compiled[name] ||= compileRules(await table(name)));
export const rulesLoaded = () => Object.keys(tables).length > 0 || Object.keys(loaders).length > 0;

// Which rule sets apply to this document, and which country's rules that is.
function scenarioFor(parsed) {
  const syn = parsed.syntax.toLowerCase(); const spec = parsed.spec; const kindText = `${parsed.syntax}${parsed.kind === 'CreditNote' ? ' credit note' : ''}`;
  const sellerCountry = parsed.data.seller?.address?.country || '';
  if (spec.key === 'pint-aunz') {
    if (parsed.syntax !== 'UBL') return { country: 'AU', sets: [], label: 'Peppol PINT A-NZ', note: 'PINT A-NZ invoices must be UBL files. This file uses a different syntax, so the national rules could not be run.' };
    return { country: sellerCountry === 'NZ' ? 'NZ' : 'AU', sets: [['Peppol PINT', 'pint-aunz-shared'], ['PINT A-NZ', 'pint-aunz-aligned']], label: `Peppol PINT A-NZ (${kindText})` };
  }
  // Canada has no national format: a plain UBL file from a Canadian seller gets the schema check and this tool's CRA information checks
  if (sellerCountry === 'CA' && parsed.syntax === 'UBL' && (spec.key === 'unknown' || spec.key === 'ca-ubl')) return { country: 'CA', sets: [], own: 'ca', label: `UBL 2.1, Canada (${kindText})`, spec: { key: 'ca-ubl', label: 'UBL 2.1 (Canada has no official e-invoice format)', accepted: true } };
  const isXr = spec.xrechnung && spec.version === XR_CURRENT;
  if (isXr) return { country: 'DE', sets: [['EN 16931', `en16931-${syn}`], ['XRechnung 3.0', `xrechnung-${syn}`]], label: `${spec.label} (${kindText})`, levels: LEVELS[`${spec.key}|${parsed.syntax}|${parsed.kind}`] || {} };
  if (sellerCountry === 'FR' && !spec.xrechnung) return { country: 'FR', sets: [['EN 16931', `en16931-${syn}`], ['French rules (BR-FR)', `fr-ctc-${syn}`]], label: `EN 16931 with the French rules (${kindText})`, pass: 'Passes every EN 16931 rule and every French BR-FR rule.' };
  return { country: spec.xrechnung ? 'DE' : ['DE', 'FR', 'PL', 'AU', 'CA'].includes(sellerCountry) ? sellerCountry : '', sets: [['EN 16931', `en16931-${syn}`]], label: `EN 16931 (${kindText})` };
}

const blank = parsed => ({ parsed, syntax: parsed.syntax, kind: parsed.kind, spec: parsed.spec || null, country: '', scenario: '', ruleSets: [], structure: [], findings: [], engineErrors: [], counts: { error: 0, warning: 0, info: 0 }, verdict: 'invalid', verdictText: '', notes: [] });
function finish(res) {
  const order = { error: 0, warning: 1, info: 2 };
  res.findings.sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of res.findings) res.counts[f.severity]++;
  res.counts.error += res.structure.length + res.engineErrors.length;
  if (res.spec && res.spec.accepted === false) { res.verdict = 'not-einvoice'; res.verdictText = res.spec.why; }
  else if (res.counts.error > 0) res.verdict = 'invalid';
  else if (res.counts.warning > 0) res.verdict = 'warnings';
  else res.verdict = 'valid';
  return res;
}

// Poland: the KSeF structured invoice. The official check is the XML schema; our own arithmetic and tax-number checks are added as a second set.
async function validateFA(doc, fa) {
  if (fa.version !== 3) {
    const spec = { key: 'fa-old', label: `KSeF FA(${fa.version})`, accepted: false, why: `This is the older FA(${fa.version}) structure. KSeF only accepts FA(3) since 1 February 2026.` };
    return finish({ ...blank({ ok: false, syntax: 'FA', kind: 'Invoice', spec, reason: spec.why }), country: 'PL' });
  }
  const spec = { key: 'fa3', label: 'KSeF FA(3)', accepted: true };
  let data = null; try { data = parseFA3(doc); } catch { data = null; }
  const res = blank({ ok: !!data, syntax: 'FA', kind: 'Invoice', spec, data, reason: data ? '' : 'The file uses the FA(3) namespace but could not be read as an invoice.' });
  res.country = 'PL'; res.scenario = 'KSeF FA(3)';
  res.structure = checkXsd(doc, await table('fa3'), { label: n => PL_FIELD_LABEL[n] || n });
  res.ruleSets = ['Official FA(3) schema of the Polish Ministry of Finance (version 1-0E)', 'eos plausibility checks (tax number check digits, sums)'];
  let own = []; try { own = fa3Checks(doc); } catch { own = []; }
  for (const f of own) res.findings.push({ id: f.id, flag: f.severity, text: '', location: f.location || '', node: f.node, set: 'eos checks', severity: f.severity === 'error' || /^PL-NIP/.test(f.id) ? 'error' : 'warning', title: f.title, fix: f.fix || '', field: f.field || null });
  return finish(res);
}

export async function validateDocument(doc) {
  const fa = isFA(doc);
  if (fa.fa) return validateFA(doc, fa);
  const parsed = parseInvoice(doc);
  const res = blank(parsed);
  if (!parsed.ok) { res.verdict = 'not-einvoice'; res.verdictText = parsed.reason; return res; }
  const sc = scenarioFor(parsed);
  res.country = sc.country; res.scenario = sc.label; res.passText = sc.pass || '';
  if (sc.spec) { parsed.spec = sc.spec; res.spec = sc.spec; }
  const spec = parsed.spec;
  res.structure = checkStructure(doc, await table('structure'));
  const gstWords = sc.country === 'AU' || sc.country === 'NZ';
  for (const [label, name] of sc.sets) {
    const set = await rules(name);
    const r = runRules(doc, set);
    res.ruleSets.push(set.title);
    for (const f of r.findings) {
      const severity = SEV[(sc.levels || {})[f.id] || f.flag] || 'error';
      const e = explain(f.id, f.text);
      if (gstWords) { e.title = e.title.replace(/\bVAT\b/g, 'GST'); e.fix = e.fix.replace(/\bVAT\b/g, 'GST'); }
      res.findings.push({ ...f, set: label, severity, ...e });
    }
    for (const e of r.engineErrors) res.engineErrors.push({ ...e, set: label });
  }
  // "-0.00": the official stylesheets on Saxon treat minus zero as different from zero and then report totals as wrong; say so up front
  const negZero = []; (function walk(n) { let leaf = true; for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) { leaf = false; walk(c); } if (leaf && /^\s*-0+(\.0+)?\s*$/.test(n.textContent || '')) negZero.push(n); })(doc.documentElement);
  for (const n of negZero.slice(0, 5)) res.findings.push({ id: 'EOS-MINUS-ZERO', flag: 'warning', text: '', location: '', node: n, set: 'eos checks', severity: 'warning', title: `An amount is written as minus zero (“${(n.textContent || '').trim()}” in ${n.nodeName}).`, fix: 'Write 0.00 instead. Official validators can treat “-0.00” as different from zero and then report the totals as wrong.', field: null });
  if (sc.own === 'ca') {
    res.ruleSets.push('Invoice information the Canada Revenue Agency requires (guide RC4022) and sums, checked by this tool');
    for (const f of caChecks(parsed.data)) res.findings.push({ id: f.id, flag: f.severity, text: '', location: '', set: 'CRA information checks', severity: f.severity, title: f.title, fix: f.fix, field: f.field });
  }
  finish(res);
  if (sc.note) res.notes.push(sc.note);
  if (sc.own === 'ca') res.notes.push('Canada has no official e-invoice format or validator. This file was checked against the UBL 2.1 schema and against the information the Canada Revenue Agency requires on an invoice.');
  if (spec.xrechnung && spec.version !== XR_CURRENT) res.notes.push(`This file declares XRechnung ${spec.version}. The current version is ${XR_CURRENT}; only the general EN 16931 rules were checked.`);
  if (spec.key === 'unknown') res.notes.push('The file does not name a recognised invoice standard, so only the general EN 16931 rules were checked.');
  if (spec.key === 'extended') res.notes.push('EXTENDED invoices contain fields beyond EN 16931. Those extra fields are reported as warnings and do not make the invoice invalid.');
  if (spec.key === 'peppol' ) res.notes.push('This is a Peppol BIS Billing 3.0 invoice. The general EN 16931 rules were checked; the extra Peppol network rules were not.');
  return res;
}
