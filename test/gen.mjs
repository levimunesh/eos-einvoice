import fs from 'node:fs';
import { samples, auSamples, caSamples } from './samples.mjs';
import { generateCII } from '../src/cii.js';
import { generateUBL } from '../src/ubl.js';
for (const [name, inv] of Object.entries(samples)) { fs.writeFileSync(new URL(`../build/samples/${name}.xml`, import.meta.url), generateCII(inv)); }
fs.mkdirSync(new URL('../build/samples-au/', import.meta.url), { recursive: true });
for (const [name, inv] of Object.entries(auSamples)) { fs.writeFileSync(new URL(`../build/samples-au/${name}.xml`, import.meta.url), generateUBL(inv)); }
fs.mkdirSync(new URL('../build/samples-ca/', import.meta.url), { recursive: true });
for (const [name, inv] of Object.entries(caSamples)) { fs.writeFileSync(new URL(`../build/samples-ca/${name}.xml`, import.meta.url), generateUBL(inv)); }
console.log(Object.keys(caSamples).length, 'Canadian UBL samples;', Object.keys(samples).length, 'CII samples and', Object.keys(auSamples).length, 'UBL samples written');
