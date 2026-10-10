// Walk through every country in real Chromium: example validates, form fields exist, outputs save, examples in Validate behave.
import { open } from './browser.mjs'; import fs from 'node:fs';
const DL = '/home/claude/eos/build/dl'; const shots = '/home/claude/eos/build/shots';
fs.mkdirSync(DL, { recursive: true });
const only = process.argv.slice(2);
const { browser, page, logs } = await open({});
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const verdict = async () => (await page.textContent('#side-verdict .verdict-text b')).trim();
const waitChecked = async () => { await page.waitForTimeout(250); await page.waitForFunction(() => { const s = document.querySelector('#side-verdict .seal'); return s && !s.classList.contains('wait'); }, null, { timeout: 60000 }); };
const dl = async (click, name) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]); const p = `${DL}/${name}`; await d.saveAs(p); return { path: p, suggested: d.suggestedFilename() }; };
const EXPECT = { DE: ['Valid e-invoice', 'btn-save-pdf', /factur-x\.xml$/], FR: ['Valid e-invoice', 'btn-save-pdf', /factur-x\.xml$/], PL: ['Valid e-invoice', null, /fa3\.xml$/], AU: ['Valid e-invoice', null, /pint-aunz\.xml$/], CA: ['Complete invoice', 'btn-save-pdf', /ubl\.xml$/] };
for (const cc of Object.keys(EXPECT)) {
  if (only.length && !only.includes(cc)) continue;
  console.log('==', cc);
  await page.click('#tab-convert'); await page.selectOption('#country', cc); await waitChecked();
  if (await page.$('#step1 >> text=Load the example')) { await page.click('#step1 >> text=Load the example'); await waitChecked(); }
  const v = await verdict(); ok(v === EXPECT[cc][0], `${cc} example: ${v}` + (v === EXPECT[cc][0] ? '' : ' | ' + (await page.$$eval('#side .finding-title', e => e.map(x => x.textContent))).join(' / ')));
  console.log('   lead:', (await page.textContent('#view-convert .view-head')).replace(/\s+/g, ' ').slice(0, 150));
  console.log('   totals:', (await page.textContent('#totals')).replace(/\s+/g, ' '));
  console.log('   note:', (await page.textContent('#sending-note')).slice(0, 110));
  await page.screenshot({ path: `${shots}/c-${cc}-convert.png`, fullPage: true });
  if (EXPECT[cc][1]) { const d = await dl(() => page.click('#btn-save-pdf'), `c-${cc}.pdf`); ok(/\.pdf$/.test(d.suggested), `${cc} PDF ${d.suggested} ${fs.statSync(d.path).size}`); } else ok(!(await page.$('#btn-save-pdf')), `${cc} has no PDF button`);
  const d = await dl(() => page.click('#btn-save-xml'), `c-${cc}.xml`); ok(EXPECT[cc][2].test(d.suggested), `${cc} XML ${d.suggested}`);
  // small-business toggle keeps the invoice valid or explains what is missing
  await page.check('#f-smallBusiness'); await waitChecked(); console.log('   small business →', await verdict(), '|', (await page.$$eval('#side .finding-title', e => e.map(x => x.textContent))).join(' / '));
  await page.uncheck('#f-smallBusiness'); await waitChecked();
  // empty invoice number is reported
  const num = await page.inputValue('#f-number'); await page.fill('#f-number', ''); await waitChecked();
  ok(/problem/.test(await verdict()), `${cc} empty number → ${await verdict()} | ${(await page.$$eval('#side .finding-title', e => e.map(x => x.textContent))).slice(0, 3).join(' / ')}`);
  await page.fill('#f-number', num); await waitChecked();
  // validate tab: faulty example
  await page.click('#tab-validate'); await page.waitForFunction(() => document.querySelector('#view-validate .verdict'), null, { timeout: 60000 });
  await page.click('#view-validate >> text=Example with errors'); await page.waitForFunction(() => /problem|Not/.test(document.querySelector('#view-validate .verdict')?.textContent || ''), null, { timeout: 60000 });
  console.log('   faulty:', (await page.textContent('#view-validate .verdict')).replace(/\s+/g, ' '));
  console.log('     ' + (await page.$$eval('#view-validate .finding', els => els.map(e => e.querySelector('.pill:last-child').textContent + ': ' + e.querySelector('.finding-title').textContent + ' → ' + (e.querySelector('.finding-fix')?.textContent || '')))).join('\n     ').slice(0, 2400));
  console.log('   facts:', (await page.textContent('#view-validate .facts')).replace(/\s+/g, ' ').slice(0, 420));
  await page.screenshot({ path: `${shots}/c-${cc}-validate.png`, fullPage: true });
  await page.click('#view-validate >> text=Valid example'); await page.waitForFunction(() => /Valid e-invoice|Complete invoice/.test(document.querySelector('#view-validate .verdict')?.textContent || ''), null, { timeout: 60000 }).catch(() => {});
  ok(/Valid e-invoice|Complete invoice/.test(await page.textContent('#view-validate .verdict')), `${cc} valid example in Validate: ` + (await page.textContent('#view-validate .verdict')).replace(/\s+/g, ' ').slice(0, 120));
  // receive tab: supplier invoice renders
  await page.click('#tab-receive'); await page.click('#view-receive >> text=Supplier invoice'); await page.waitForSelector('#view-receive .paper', { timeout: 60000 }); await page.waitForTimeout(300);
  ok(/Valid|Complete/.test(await page.textContent('#view-receive .verdict')), `${cc} supplier invoice: ` + (await page.textContent('#view-receive .verdict')).replace(/\s+/g, ' ').slice(0, 100));
  await page.screenshot({ path: `${shots}/c-${cc}-receive.png`, fullPage: true });
  // open in editor returns to the same country and stays valid
  await page.click('#view-receive >> text=Open in the editor'); await waitChecked();
  ok((await page.inputValue('#country')) === cc && /Valid|Complete/.test(await verdict()), `${cc} open in editor → country ${await page.inputValue('#country')}, ${await verdict()}` + ' | ' + (await page.$$eval('#side .finding-title', e => e.map(x => x.textContent))).slice(0, 3).join(' / '));
  // archive
  await page.click('#btn-archive-out'); await page.waitForTimeout(600); console.log('   toast:', await page.textContent('#toast'));
  await page.click('#tab-archive'); await page.waitForTimeout(400); console.log('   archive head:', (await page.textContent('#view-archive .view-head')).replace(/\s+/g, ' ').slice(0, 160), '| tab:', await page.textContent('#tab-archive span'));
}
await page.screenshot({ path: `${shots}/c-archive.png`, fullPage: true });
console.log('logs:', logs.length ? logs : 'none');
await browser.close();
