import { open } from './browser.mjs';
const shots = '/home/claude/eos/build/shots';
const [cc, tab = 'convert', width = '1280', scheme = 'light', what = 'example', clip = ''] = process.argv.slice(2);
const { browser, page, logs } = await open({ width: Number(width), height: 900, scheme });
await page.selectOption('#country', cc); await page.waitForTimeout(1500);
if (tab !== 'convert') { await page.click('#tab-' + tab); await page.waitForTimeout(800); if (what !== 'example') { await page.click(`#view-${tab} >> text=${what === 'faulty' ? 'Example with errors' : what === 'supplier' ? 'Supplier invoice' : 'Valid example'}`); await page.waitForTimeout(2500); } }
const sel = clip ? await page.$(clip) : null;
if (sel) await sel.screenshot({ path: `${shots}/s-${cc}-${tab}-${width}-${scheme}.png` }); else await page.screenshot({ path: `${shots}/s-${cc}-${tab}-${width}-${scheme}.png`, fullPage: true });
console.log('logs:', logs.length ? logs : 'none'); await browser.close();
