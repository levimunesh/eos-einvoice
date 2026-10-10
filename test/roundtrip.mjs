// Generate → read → open in the editor → generate again must give the identical file, for every sample of every country.
import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { samples, auSamples, caSamples } from './samples.mjs';
import { generateCII } from '../src/cii.js';
import { generateUBL, localModel } from '../src/ubl.js';
import { parseInvoice, toFormModel } from '../src/parse.js';
import { computeTotals, fmt2 } from '../src/model.js';
let bad = 0, n = 0;
for (const [name, inv] of Object.entries({ ...samples, ...auSamples, ...caSamples })) {
  n++;
  const ubl = inv.country === 'AU' || inv.country === 'CA'; const gen = ubl ? generateUBL : generateCII;
  const xml = gen(inv); const r = parseInvoice(parseXmlDocument(xml));
  if (!r.ok) { console.log('FAIL parse', name); bad++; continue; }
  const again = gen(toFormModel(r.data, r.spec, inv.country));
  const T = computeTotals(ubl ? localModel(inv) : inv);
  const okTotals = r.data.totals.due === fmt2(T.due) && r.data.totals.grandTotal === fmt2(T.grandTotal);
  if (again !== xml || !okTotals) { bad++; console.log('DIFF', name, okTotals); const a = xml.split('><'), b = again.split('><'); for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log('  first:', a[i], '\n  again:', b[i]); break; } }
}
// parse every official test instance without throwing
const dirs = ['/home/claude/gh/xrechnung-testsuite/src/test/business-cases/standard', '/home/claude/gh/xrechnung-testsuite/src/test/business-cases/extension', '/home/claude/gh/eInvoicing-EN16931/cii/examples', '/home/claude/gh/eInvoicing-EN16931/ubl/examples', '/home/claude/gh/intl/aunz-test'];
let files = 0, lines = 0;
for (const d of dirs) for (const f of fs.readdirSync(d).filter(f => f.endsWith('.xml'))) {
  const r = parseInvoice(parseXmlDocument(fs.readFileSync(`${d}/${f}`, 'utf8')));
  if (!r.ok) { console.log('not parsed', f, r.reason); bad++; continue; }
  files++; lines += r.data.lines.length; toFormModel(r.data, r.spec, 'DE'); toFormModel(r.data, r.spec, 'AU'); toFormModel(r.data, r.spec, 'FR'); toFormModel(r.data, r.spec, 'CA');
}
console.log(`round trip: ${n - bad} of ${n} samples identical; official files parsed: ${files} (${lines} lines); problems: ${bad}`);
