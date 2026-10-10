// Poland / FA(3) helper for the test tools.
//   node tools/plrun.mjs gen [outDir]            write every sample of test/pl-samples.mjs as XML (default build/pl/samples)
//   node tools/plrun.mjs check [--labels] file…  run checkXsd + fa3Checks; print JSON { file: { xsd: [[code, message, location]], checks: [[id, severity, title, location, field]] } }
//   node tools/plrun.mjs check --list files.txt  the same, file names read from a text file (one per line)
//   node tools/plrun.mjs selftest                compile every regular expression of the model
import fs from 'node:fs';
import path from 'node:path';
import { parseXmlDocument } from 'slimdom';
import { checkXsd } from '../src/xsdcheck.js';
import { generateFA3, fa3Checks, plLabel } from '../src/fa3.js';

const root = new URL('..', import.meta.url).pathname;
const model = JSON.parse(fs.readFileSync(path.join(root, 'build/rules/fa3.json'), 'utf8'));
const [cmd, ...args] = process.argv.slice(2);
export const NOW = '2026-10-08T09:30:00Z';

if (cmd === 'gen') {
  const { plSamples } = await import('../test/pl-samples.mjs');
  const dir = args[0] || path.join(root, 'build/pl/samples'); fs.mkdirSync(dir, { recursive: true });
  for (const [name, inv] of Object.entries(plSamples)) fs.writeFileSync(path.join(dir, name + '.xml'), generateFA3(inv, { now: NOW }));
  console.log(`wrote ${Object.keys(plSamples).length} samples to ${dir}`);
} else if (cmd === 'check') {
  let files = [], labels = false;
  for (let i = 0; i < args.length; i++) { if (args[i] === '--list') files.push(...fs.readFileSync(args[++i], 'utf8').split('\n').filter(Boolean)); else if (args[i] === '--labels') labels = true; else files.push(args[i]); }
  const out = {};
  for (const f of files) {
    let doc;
    try { doc = parseXmlDocument(fs.readFileSync(f, 'utf8')); } catch (e) { out[f] = { parse: String(e.message || e).slice(0, 200) }; continue; }
    const r = {};
    try { r.xsd = checkXsd(doc, model, { limit: 60, label: labels ? plLabel : undefined }).map(x => [x.code, x.message, x.location]); } catch (e) { r.threw = 'checkXsd: ' + (e.stack || e); }
    try { r.checks = fa3Checks(doc, { today: '2026-10-10' }).map(x => [x.id, x.severity, x.title, x.location, x.field]); } catch (e) { r.threw = (r.threw ? r.threw + '\n' : '') + 'fa3Checks: ' + (e.stack || e); }
    out[f] = r;
  }
  process.stdout.write(JSON.stringify(out));
} else if (cmd === 'selftest') {
  let n = 0, bad = 0;
  for (const t of model.t) for (const step of t.p || []) for (const src of step) { n++; try { new RegExp('^(?:' + src + ')$', 'u'); } catch (e) { bad++; console.log('BAD regex', src, e.message); } }
  console.log(`${n} regular expressions compiled, ${bad} failed`);
  process.exit(bad ? 1 : 0);
} else {
  console.log('usage: node tools/plrun.mjs gen [dir] | check [--labels] [--list file] file… | selftest'); process.exit(2);
}
