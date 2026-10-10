import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { checkStructure } from '../src/structure.js';
const model = JSON.parse(fs.readFileSync(new URL('../build/rules/structure.json', import.meta.url)));
const out = {};
for (const f of process.argv.slice(2)) { try { const r = checkStructure(parseXmlDocument(fs.readFileSync(f, 'utf8')), model); out[f] = r.map(x => [x.code, x.message, x.location]); } catch (e) { out[f] = [['parse', String(e.message)]]; } }
process.stdout.write(JSON.stringify(out));
