// Run the rule engine inside real Chromium (native DOM) over files; print JSON {file: result}
import { open } from './browser.mjs'; import fs from 'node:fs';
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const { browser, page } = await open({});
await page.evaluate(() => window.__eos.ready);
const out = {};
for (let i = 0; i < files.length; i += 40) {
  const batch = files.slice(i, i + 40).map(f => [f, fs.readFileSync(f, 'utf8')]);
  const res = await page.evaluate(async b => { const r = []; for (const [f, xml] of b) r.push([f, await window.__eos.check(xml)]); return r; }, batch);
  for (const [f, r] of res) out[f] = r;
  process.stderr.write(`\r${Math.min(i + 40, files.length)}/${files.length}`);
}
await browser.close(); fs.writeFileSync(process.argv[3], JSON.stringify(out));
