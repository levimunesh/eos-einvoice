// Exercise the capability code paths with stand-ins that follow the published call contract.
import { open } from './browser.mjs';
const init = () => {
  window.__saved = []; window.__prompts = [];
  const docs = new Map(); const listeners = new Set();
  const segOk = p => p.split('/').every(s => /^[A-Za-z0-9_\-.~:@+]+$/.test(s) && s !== '.' && s !== '..');
  const snap = (id, body) => ({ id, exists: body !== undefined, data: () => (body === undefined ? undefined : JSON.parse(JSON.stringify(body))), metadata: { fromCache: false, hasPendingWrites: false } });
  const notify = () => { for (const l of listeners) l(); };
  const docRef = path => { const segs = path.split('/'); if (segs.length % 2 || !segOk(path)) throw new TypeError('bad document path ' + path); return {
    id: segs[segs.length - 1], path,
    get: async () => snap(segs[segs.length - 1], docs.get(path)),
    set: async data => { if (!data || typeof data !== 'object' || Array.isArray(data)) throw { code: 'invalid_argument', message: 'body' }; if (JSON.stringify(data).length > 256 * 1024) throw { code: 'invalid_argument', message: 'too big' }; docs.set(path, JSON.parse(JSON.stringify(data))); notify(); },
    update: async data => { if (!docs.has(path)) throw { code: 'invalid_argument' }; docs.set(path, { ...docs.get(path), ...data }); notify(); },
    delete: async () => { docs.delete(path); notify(); },
    collection: sub => colRef(path + '/' + sub),
  }; };
  const colRef = (path, q = {}) => { const segs = path.split('/'); if (segs.length % 2 === 0 || !segOk(path)) throw new TypeError('bad collection path ' + path);
    const run = () => { let list = [...docs.entries()].filter(([p]) => p.startsWith(path + '/') && p.split('/').length === segs.length + 1).map(([p, b]) => snap(p.split('/').pop(), b));
      if (q.order) list.sort((a, b) => String(a.data()[q.order] ?? '').localeCompare(String(b.data()[q.order] ?? '')) * (q.dir === 'desc' ? -1 : 1)); if (q.limit) list = list.slice(0, q.limit);
      return { docs: list, size: list.length, empty: !list.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }; };
    return { path, doc: id => docRef(path + '/' + (id || 'auto' + Math.random().toString(36).slice(2, 12))), add: async data => { const r = docRef(path + '/auto' + Math.random().toString(36).slice(2, 12)); await r.set(data); return r; },
      where: () => colRef(path, q), orderBy: (f, dir) => colRef(path, { ...q, order: f, dir }), limit: n => colRef(path, { ...q, limit: n }), get: async () => run(),
      onSnapshot: (next) => { const l = () => next(run()); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); } }; };
  const db = { doc: docRef, collection: p => colRef(p) };
  window.__db = docs;
  const sample = Object.assign(async () => ({ text: 'x', truncated: false }), { json: async (prompt) => { window.__prompts.push(prompt); await new Promise(r => setTimeout(r, 300));
    return { typeCode: '380', number: 'R-77', issueDate: '2026-09-30', dueDate: '14.10.2026', currency: 'EUR', seller: { name: 'Malerbetrieb Yilmaz', street: 'Hafenstr. 4', postcode: '20457', city: 'Hamburg', country: 'de', vatId: 'DE 811 222 333', taxNumber: '', contactName: 'Deniz Yilmaz', contactPhone: '040 5550111', contactEmail: 'info@yilmaz.example', email: '' }, buyer: { name: 'Praxis Dr. Sommer', street: 'Elbchaussee 1', postcode: '22763', city: 'Hamburg', country: 'DE' }, payment: { meansCode: '58', iban: 'DE89 3704 0044 0532 0130 00' },
      lines: [{ name: 'Wände streichen, 2 Räume', quantity: '18,5', unit: 'HUR', unitPrice: '52.00', vatCategory: 'S', vatRate: 19 }, { name: 'Farbe weiß 10 l', quantity: 3, unit: 'pcs', unitPrice: '39.9', vatCategory: 'S', vatRate: '19' }], allowances: [], stated: { net: '1081.70', vat: '205.52', gross: '1287.22' }, doubts: ['The delivery date is not stated.'] }; } });
  window.claude = { use: async name => ({ downloads: { save: async ({ filename, data }) => { let size = typeof data === 'string' ? data.length : data.size ?? data.byteLength; let head = ''; try { const u = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data instanceof ArrayBuffer ? new Uint8Array(data) : data; head = String.fromCharCode(...u.slice(0, 4)); } catch {} if (!/\.(pdf|zip|csv|txt|json|html|svg|xlsx|docx|png)$/.test(filename)) throw { code: 'rejected_extension', message: filename }; window.__saved.push({ filename, size, head }); return { status: 'saved' }; } }, sample, db, user: { id: async () => 'u_test1', isOwner: async () => true } })[name] ?? null };
};
const { browser, page, logs } = await open({ init });
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const waitChecked = async () => { await page.waitForFunction(() => { const s = document.querySelector('#side-verdict .seal'); return s && !s.classList.contains('wait'); }, null, { timeout: 30000 }); };
await waitChecked();
await page.click('#btn-save-pdf'); await page.waitForFunction(() => window.__saved.length === 1, null, { timeout: 30000 });
await page.click('#btn-save-xml'); await page.waitForFunction(() => window.__saved.length === 2, null, { timeout: 30000 });
const saved = await page.evaluate(() => window.__saved); console.log('   saved via capability:', JSON.stringify(saved));
ok(saved[0].filename.endsWith('.pdf') && saved[0].head === '%PDF' && saved[1].filename.endsWith('.zip') && saved[1].head.startsWith('PK'), 'PDF saved as .pdf, XML saved inside a .zip');
// AI reader
await page.setInputFiles('#convert-drop-file', '/home/claude/eos/build/dl/plain-invoice.pdf');
await page.waitForSelector('#btn-ai', { timeout: 30000 });
await page.click('#btn-ai'); await page.waitForFunction(() => /Read with Claude\. Check/.test(document.querySelector('#step1').textContent), null, { timeout: 30000 }); await page.waitForTimeout(700); await waitChecked();
console.log('   prompt length:', await page.evaluate(() => window.__prompts[0].length), '| verdict:', (await page.textContent('#side-verdict')).replace(/\s+/g, ' '));
console.log('   form:', await page.inputValue('#f-number'), await page.inputValue('#f-issueDate'), await page.inputValue('#f-dueDate'), '|', await page.inputValue('#f-seller-name'), await page.inputValue('#f-seller-vatId'), await page.inputValue('#f-seller-country'), '|', await page.inputValue('#f-payment-iban'), '| line1', await page.inputValue('#l-0-quantity'), await page.inputValue('#l-0-unit'), '| line2 unit', await page.inputValue('#l-1-unit'));
console.log('   step1:', (await page.textContent('#step1 .notice.warn').catch(() => '')).replace(/\s+/g, ' '), '| compare:', (await page.textContent('#side .notice').catch(() => 'none')).replace(/\s+/g, ' '));
// archive in the private data space
await page.click('#btn-archive-out'); await page.waitForTimeout(600); console.log('   toast:', await page.textContent('#toast'));
await page.click('#tab-archive'); await page.waitForSelector('#arch-rows tr.rowlink', { timeout: 10000 });
console.log('   storage line:', await page.textContent('#arch-storage'));
console.log('   db paths:', JSON.stringify(await page.evaluate(() => [...window.__db.keys()])));
const meta = await page.evaluate(() => { const [k, v] = [...window.__db.entries()].find(([k]) => k.split('/').length === 4); return v; }); console.log('   meta doc:', JSON.stringify(meta));
await page.click('#arch-rows tr.rowlink'); await page.waitForSelector('#view-archive .detail .notice', { timeout: 15000 });
ok(/Unchanged/.test(await page.textContent('#view-archive .detail .notice')), 'archived file reads back intact from the data store');
ok(await page.textContent('#arch-count') === '1', 'archive count badge shows 1');
await page.click('text=Save the original XML'); await page.waitForFunction(() => window.__saved.length === 3, null, { timeout: 10000 });
await page.click('text=Delete…'); await page.click('text=Delete permanently'); await page.waitForTimeout(500);
ok((await page.evaluate(() => window.__db.size)) === 0, 'delete removes the document and its parts');
console.log('logs:', logs.length ? logs : 'none');
await browser.close();
