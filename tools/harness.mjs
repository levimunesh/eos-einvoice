// Wrap dist/index.html in the same document skeleton the publisher adds, for local testing.
import fs from 'node:fs';
const OUT = process.env.DIST || 'dist';
const reset = ':root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
const body = fs.readFileSync(`${OUT}/index.html`, 'utf8');
fs.writeFileSync(`${OUT}/_test.html`, `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${reset}</style></head><body>${body}</body></html>`);
fs.cpSync('build/_fonts', `${OUT}/_fonts`, { recursive: true });
