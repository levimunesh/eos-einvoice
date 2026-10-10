import { open } from './browser.mjs';
const out = '/home/claude/eos/build/shots';
for (const [name, o] of [['desk-light', {}], ['desk-dark', { scheme: 'dark' }], ['phone-light', { width: 400, height: 860 }]]) {
  const { browser, page, logs } = await open(o);
  await page.waitForSelector('#side-verdict .seal.ok, #side-verdict .seal.err, #side-verdict .seal.warn', { timeout: 30000 }).catch(() => logs.push('verdict never appeared'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-convert.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(name, 'verdict:', await page.textContent('#side-verdict').catch(() => '?'), '| overflow', JSON.stringify(overflow), '| logs', logs.length ? logs.slice(0, 6) : 'none');
  await browser.close();
}
