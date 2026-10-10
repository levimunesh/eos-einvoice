// Bundle the app into dist/ (page + script files that are published together).
import { build } from 'esbuild'; import fs from 'node:fs';
const OUT = process.env.DIST || 'dist';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
// while a module is still being written, a stand-in keeps the rest of the app buildable (never used for a release)
const missing = ['fa3'].filter(m => !fs.existsSync(`src/${m}.js`));
const stub = { name: 'stub', setup(b) { b.onResolve({ filter: /\/fa3\.js$/ }, () => ({ path: 'fa3-stub', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: "export const FA3_NS='';export const isFA=()=>({fa:false});export const generateFA3=()=>'<Faktura/>';export const parseFA3=()=>null;export const fa3ToFormModel=()=>null;export const fa3Checks=()=>[];export const PL_FIELD_LABEL={};" })); } };
if (missing.length) console.log('WARNING: building with stand-ins for', missing.join(', '));
const r = await build({ entryPoints: ['src/app.js'], bundle: true, splitting: true, format: 'esm', outdir: OUT, minify: !process.env.NOMIN, target: 'es2022', chunkNames: 'chunks/[name]-[hash]', legalComments: 'none', metafile: true, logLevel: 'warning', plugins: missing.length ? [stub] : [], define: { 'process.env.NODE_ENV': '"production"', __EOS_TEST__: process.env.EOS_TEST ? 'true' : 'false' } });
fs.copyFileSync('src/index.html', `${OUT}/index.html`);
const files = Object.entries(r.metafile.outputs).map(([f, o]) => [f, o.bytes]).sort((a, b) => b[1] - a[1]);
for (const [f, b] of files) console.log((b / 1024).toFixed(0).padStart(6) + ' KB  ' + f);
fs.writeFileSync(`${OUT}/files.json`, JSON.stringify(files.map(f => f[0].replace(new RegExp(`^${OUT}/`), ''))));
