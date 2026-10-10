import fs from 'node:fs';
import { samples, caSamples } from './samples.mjs';
import { generateCII } from '../src/cii.js';
import { generateUBL } from '../src/ubl.js';
import { buildZugferdPdf } from '../src/zugferd.js';
fs.mkdirSync(new URL('../build/pdf/', import.meta.url), { recursive: true });
const only = process.argv.slice(2);
for (const [name, inv] of Object.entries({ ...samples, ...caSamples })) {
  if (inv.profile === 'xrechnung') continue; if (only.length && !only.includes(name)) continue;
  const ca = inv.country === 'CA';
  const xml = ca ? generateUBL(inv) : generateCII(inv);
  const bytes = await buildZugferdPdf(inv, xml, { lang: ca ? (name === 'caQuebec' ? 'fr' : 'en') : inv.country === 'FR' ? (name === 'frExportDE' ? 'en' : 'fr') : name === 'reverseCharge' ? 'en' : 'de' });
  fs.writeFileSync(new URL(`../build/pdf/${name}.pdf`, import.meta.url), bytes);
  console.log(name, bytes.length);
}
