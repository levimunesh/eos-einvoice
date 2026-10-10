import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { compileRules, validate } from '../src/schematron.js';
const T = compileRules(JSON.parse(fs.readFileSync('/home/claude/eos/build/rules/fr-ctc-cii.json')));
const doc = parseXmlDocument(fs.readFileSync(process.argv[2], 'utf8'));
const v = validate(doc, T);
console.log(v.findings.map(f => f.id), v.engineErrors);
for (const p of T.patterns) for (const r of p.rules) for (const c of r.checks) if (c.id === process.argv[3]) console.log(r.xpath, '\n', c.expr);
