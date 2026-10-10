// Turn the built page fragment (dist/index.html) into a complete HTML document for ordinary web hosting.
// (When published as a Claude artifact the host adds this skeleton itself.)
import fs from 'node:fs';
const OUT = process.env.DIST || 'dist';
const frag = fs.readFileSync(`${OUT}/index.html`, 'utf8');
if (/^\s*<!doctype/i.test(frag)) { console.log('already a full document'); process.exit(0); }
const cut = frag.indexOf('</style>') + '</style>'.length;
if (cut < 8) throw new Error('unexpected page structure');
const head = frag.slice(0, cut), body = frag.slice(cut);
const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#3A3FB0"/><path d="M6 21a10 10 0 0 1 20 0z" fill="#fff"/><rect x="6" y="23" width="20" height="2.4" rx="1.2" fill="#fff"/></svg>');
const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Create, check, read and archive e-invoices for Germany, France, Poland, Australia and Canada. Everything runs in your browser.">
<meta name="theme-color" content="#3A3FB0">
<link rel="icon" href="${icon}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
${body.trim()}
</body>
</html>
`;
fs.writeFileSync(`${OUT}/index.html`, doc);
fs.copyFileSync('NOTICES.txt', `${OUT}/NOTICES.txt`);
for (const f of ['files.json']) fs.rmSync(`${OUT}/${f}`, { force: true });
console.log('standalone page written:', doc.length, 'bytes');
