import { open } from './browser.mjs';
const { browser, page, logs } = await open({});
await page.waitForTimeout(1500);
await page.setInputFiles('#convert-drop-file', process.argv[2]);
await page.waitForSelector('#step1 .filechip', { timeout: 30000 }); await page.waitForTimeout(500);
const r = await page.evaluate(() => ({ text: window.__eos.S.source.text, number: window.__eos.S.inv.number, field: document.querySelector('#f-number').value, seller: window.__eos.S.inv.seller.vatId, buyer: window.__eos.S.inv.buyer.vatId }));
console.log(r.text.slice(0, 1500)); console.log(JSON.stringify({ number: r.number, field: r.field, seller: r.seller, buyer: r.buyer })); console.log(logs);
await browser.close();
