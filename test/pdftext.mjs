import { open } from './browser.mjs';
const { browser, page } = await open({});
await page.setInputFiles('#convert-drop-file', process.argv[2]);
await page.waitForSelector('#step1 .filechip', { timeout: 30000 });
// read text back through a second extraction in page context is not exposed; use pdftotext-like check by reading S via the DOM is not possible, so re-run reader through dynamic import of the chunk
const text = await page.evaluate(async () => { const f = document.querySelector('#convert-drop-file'); return 'n/a'; });
await browser.close();
