import { chromium } from 'playwright'; import fs from 'node:fs';
const exe = fs.existsSync('/opt/pw-browsers/chromium/chrome') ? '/opt/pw-browsers/chromium/chrome' : '/opt/pw-browsers/chromium';

const FONT_CSS = [['Barlow Semi Condensed',500,'barlow-semi-condensed-latin-500-normal'],['Barlow Semi Condensed',600,'barlow-semi-condensed-latin-600-normal'],['Barlow Semi Condensed',700,'barlow-semi-condensed-latin-700-normal'],['IBM Plex Sans',400,'IBMPlexSans-Regular'],['IBM Plex Sans',500,'IBMPlexSans-Medium'],['IBM Plex Sans',600,'IBMPlexSans-SemiBold'],['IBM Plex Mono',400,'IBMPlexMono-Regular'],['IBM Plex Mono',500,'IBMPlexMono-Medium']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(http://127.0.0.1:${process.env.PORT || 8765}/_fonts/${file}.woff2) format('woff2')}`).join('\n');
export async function open({ width = 1280, height = 900, scheme = 'light', hash = '', init = null } = {}) {
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, acceptDownloads: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const logs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => logs.push('[requestfailed] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
  if (init) await page.addInitScript(init);
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS }));
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8765}/_test.html` + hash);
  return { browser, ctx, page, logs };
}
