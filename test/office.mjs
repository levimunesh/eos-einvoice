import { open } from './browser.mjs';
const { browser, page, logs } = await open({});
await page.waitForTimeout(1200);
for (const f of ['rechnung.docx', 'rechnung.xlsx']) {
  await page.setInputFiles('#convert-drop-file', '/home/claude/eos/build/dl/' + f);
  await page.waitForFunction(n => document.querySelector('#step1 .filechip')?.textContent === n || document.querySelector('#step1 .notice.err'), f, { timeout: 30000 }); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ text: window.__eos.S.source?.text, inv: window.__eos.S.inv, stated: window.__eos.S.source?.stated, found: window.__eos.S.source?.found, msg: window.__eos.S.step1Msg }));
  console.log('==', f, '\n' + (r.text || '').slice(0, 500)); console.log('found:', r.found, '| stated:', JSON.stringify(r.stated), '| number', r.inv.number, '| lines', JSON.stringify(r.inv.lines.map(l => [l.name, l.quantity, l.unit, l.unitPrice, l.vatRate])), r.msg || '');
}
console.log(logs); await browser.close();
