import { open } from './browser.mjs'; import fs from 'node:fs';
const DL = '/home/claude/eos/build/dl'; const shots = '/home/claude/eos/build/shots';
const { browser, page, logs } = await open({});
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const verdict = async () => (await page.textContent('#side-verdict .verdict-text b')).trim();
const waitChecked = async () => { await page.waitForFunction(() => { const s = document.querySelector('#side-verdict .seal'); return s && !s.classList.contains('wait'); }, null, { timeout: 30000 }); };
const dl = async (click, name) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]); const p = `${DL}/${name || d.suggestedFilename()}`; await d.saveAs(p); return { path: p, suggested: d.suggestedFilename() }; };

await waitChecked(); ok((await verdict()) === 'Valid e-invoice', 'example invoice validates: ' + await verdict());
// A. ZUGFeRD PDF
let d = await dl(() => page.click('#btn-save-pdf'), 'browser-zugferd.pdf'); ok(/\.pdf$/.test(d.suggested), 'PDF download ' + d.suggested + ' ' + fs.statSync(d.path).size);
// B. XML
d = await dl(() => page.click('#btn-save-xml'), 'browser-facturx.xml'); ok(/factur-x\.xml$/.test(d.suggested), 'XML download ' + d.suggested);
// C. XRechnung profile
await page.check('#f-profile-xrechnung'); await page.waitForTimeout(700); await waitChecked();
let v = await verdict(); ok(/problem/.test(v), 'XRechnung without buyer reference → ' + v);
const titles = await page.$$eval('#side .finding-title', els => els.map(e => e.textContent)); console.log('   findings:', titles);
await page.click('#side .finding button.link'); await page.waitForTimeout(300);
ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'f-buyerReference', 'Go to field focuses buyer reference');
await page.fill('#f-buyerReference', '04011000-12345-06'); await page.waitForTimeout(700); await waitChecked();
ok((await verdict()) === 'Valid e-invoice', 'XRechnung valid after fix: ' + await verdict());
d = await dl(() => page.click('#btn-save-xml'), 'browser-xrechnung.xml'); ok(/xrechnung\.xml$/.test(d.suggested), 'XRechnung download ' + d.suggested);
ok(!(await page.$('#btn-save-pdf')), 'no PDF button for XRechnung');
await page.check('#f-profile-en16931');
// I. small business + discount + other rate
await page.check('#f-smallBusiness'); await page.waitForTimeout(700); await waitChecked();
ok(/problem/.test(await verdict()) === false, 'small business with VAT ID still valid: ' + await verdict());
d = await dl(() => page.click('#btn-save-xml'), 'browser-small.xml');
await page.uncheck('#f-smallBusiness');
await page.click('text=Add discount'); await page.fill('#a-0-reason', 'Treuerabatt'); await page.fill('#a-0-amount', '250,00');
await page.selectOption('#l-2-vat', 'S|other'); await page.fill('#l-2-vatRate', '5.5'); await page.fill('#f-prepaid', '1000');
await page.waitForTimeout(700); await waitChecked(); ok((await verdict()) === 'Valid e-invoice', 'discount + other rate + prepaid valid: ' + await verdict());
console.log('   totals:', (await page.textContent('#totals')).replace(/\s+/g, ' '));
d = await dl(() => page.click('#btn-save-xml'), 'browser-discount.xml');
// break something: clear invoice number
await page.fill('#f-number', ''); await page.waitForTimeout(700); await waitChecked();
ok(/problem/.test(await verdict()) && await page.isDisabled('#btn-save-pdf'), 'missing number blocks saving: ' + await verdict() + ' | ' + (await page.$$eval('#side .finding-title', e => e.map(x => x.textContent))).join(' / '));
await page.screenshot({ path: `${shots}/side-problems.png`, clip: { x: 800, y: 0, width: 480, height: 900 } });
// D. upload plain PDF → basic reader
await page.setInputFiles('#convert-drop-file', `${DL}/plain-invoice.pdf`);
await page.waitForSelector('#step1 .filechip', { timeout: 30000 }); await page.waitForTimeout(800); await waitChecked();
console.log('   step1:', (await page.textContent('#step1')).replace(/\s+/g, ' ').slice(0, 700));
console.log('   S.number:', await page.evaluate(() => window.__eos.S.inv.number)); console.log('   form:', await page.inputValue('#f-number'), '|', await page.inputValue('#f-issueDate'), '|', await page.inputValue('#f-payment-iban'), '|', await page.inputValue('#f-seller-vatId'), '| lines:', await page.$$eval('#lines .line input[id$=name]', e => e.map(x => x.value)));
console.log('   compare box:', (await page.textContent('#side .notice').catch(() => 'none')).replace(/\s+/g, ' '));
await page.screenshot({ path: `${shots}/after-upload.png`, clip: { x: 0, y: 0, width: 1280, height: 1000 } });
// E. upload ZUGFeRD PDF → already an e-invoice
await page.setInputFiles('#convert-drop-file', `${DL}/browser-zugferd.pdf`); await page.waitForSelector('#step1 .notice.ok', { timeout: 30000 });
console.log('   e-invoice PDF:', (await page.textContent('#step1 .notice.ok')).replace(/\s+/g, ' '));
await page.click('#step1 .notice.ok button'); await page.waitForSelector('#view-validate .verdict', { timeout: 30000 });
ok(/Valid e-invoice/.test(await page.textContent('#view-validate .verdict')), 'ZUGFeRD PDF opens in Validate as valid');
// F. Validate tab
await page.click('text=Example with errors'); await page.waitForFunction(() => /problem/.test(document.querySelector('#view-validate .verdict')?.textContent || ''), null, { timeout: 30000 });
console.log('   faulty example:', (await page.textContent('#view-validate .verdict')).replace(/\s+/g, ' '));
console.log('   ', (await page.$$eval('#view-validate .finding', els => els.map(e => e.querySelector('.pill:last-child').textContent + ': ' + e.querySelector('.finding-title').textContent))).join('\n    '));
await page.screenshot({ path: `${shots}/validate.png`, fullPage: true });
for (const f of ['/home/claude/gh/xrechnung-testsuite/src/test/business-cases/standard/01.01a-INVOICE_ubl.xml', '/home/claude/gh/xrechnung-testsuite/src/test/business-cases/standard/02.01a-INVOICE_uncefact.xml', `${DL}/plain-invoice.pdf`, '/home/claude/eos/package.json']) {
  await page.setInputFiles('#val-drop-file', f); await page.waitForTimeout(1500);
  await page.waitForFunction(() => !document.querySelector('#view-validate .spinner'), null, { timeout: 30000 });
  console.log('   ' + f.split('/').pop(), '→', ((await page.textContent('#view-validate .verdict').catch(() => null)) || (await page.textContent('#view-validate .notice.err').catch(() => '?'))).replace(/\s+/g, ' ').slice(0, 200));
}
// G. Receive
await page.click('#tab-receive'); await page.waitForTimeout(500);
await page.setInputFiles('#rec-drop-file', '/home/claude/gh/xrechnung-testsuite/src/test/business-cases/standard/01.03a-INVOICE_ubl.xml'); await page.waitForSelector('#view-receive .paper', { timeout: 30000 }); await page.waitForTimeout(500);
await page.screenshot({ path: `${shots}/receive.png`, fullPage: true });
// H. Archive
await page.click('#view-receive >> text=Add to archive'); await page.waitForTimeout(800);
console.log('   toast:', await page.textContent('#toast'));
await page.click('#view-receive >> text=Add to archive'); await page.waitForTimeout(500); console.log('   toast (dup):', await page.textContent('#toast'));
await page.click('#tab-archive'); await page.waitForSelector('#arch-rows tr.rowlink', { timeout: 10000 });
console.log('   archive rows:', (await page.textContent('#arch-rows')).replace(/\s+/g, ' ').slice(0, 300), '| storage:', await page.textContent('#arch-storage'));
await page.screenshot({ path: `${shots}/archive.png`, fullPage: true });
d = await dl(() => page.click('#btn-export'), 'browser-export.zip'); ok(/\.zip$/.test(d.suggested), 'export ' + d.suggested + ' ' + fs.statSync(d.path).size);
await page.click('#arch-rows tr.rowlink'); await page.waitForSelector('#view-archive .detail .notice', { timeout: 15000 }); await page.waitForTimeout(400);
console.log('   detail:', (await page.textContent('#view-archive .detail .notice')).replace(/\s+/g, ' '));
await page.screenshot({ path: `${shots}/archive-detail.png`, fullPage: true });
await page.click('text=Delete…'); await page.click('text=Delete permanently'); await page.waitForTimeout(500);
ok(/No invoices archived yet/.test(await page.textContent('#view-archive')), 'delete returns to empty state');
console.log('logs:', logs.length ? logs : 'none');
await browser.close();
