#!/usr/bin/env node
/**
 * Build: izi-datepicker.js (source of truth, UMD)  ->  .mjs (ESM), .min.js (+ sourcemap)
 * Fails when the minified+gzipped JS exceeds the budget (package.json config.budgetGzip, default 25 KB) or the source cannot be inlined into HTML.
 *   node tools/build.mjs [--size-only] [--budget 25000]
 */
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), sizeOnly = args.includes('--size-only');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const budget = +(args[args.indexOf('--budget') + 1] || (pkg.config && pkg.config.budgetGzip) || 25000); // package.json > config.budgetGzip
const f = n => path.join(root, n);
const src = fs.readFileSync(f('izi-datepicker.js'), 'utf8');
const css = fs.readFileSync(f('izi-datepicker.css'), 'utf8');
const gz = s => zlib.gzipSync(s, { level: 9 }).length, br = s => zlib.brotliCompressSync(s).length;
for (const n of ['izi-datepicker.js', 'izi-datepicker.locales.js']) { if (/<\/script|<!--/i.test(fs.readFileSync(f(n), 'utf8'))) { console.error(`✗ ${n} contains "</script" or "<!--" and cannot be inlined into HTML`); process.exit(1); } }

const { minify } = await import('terser');
const min = await minify(src, { compress: true, mangle: true, sourceMap: { filename: 'izi-datepicker.min.js', url: 'izi-datepicker.min.js.map' }, format: { comments: /^!/ } });
const row = (n, a, b, c) => console.log(n.padEnd(34), String(a).padStart(8), String(b).padStart(10), String(c).padStart(10));
console.log('\n' + 'artifact'.padEnd(34), 'bytes'.padStart(8), 'gzip'.padStart(10), 'brotli'.padStart(10));
row('izi-datepicker.js (source)', src.length, gz(src), br(src));
row('izi-datepicker.min.js', min.code.length, gz(min.code), br(min.code));
row('izi-datepicker.css', css.length, gz(css), br(css));
const g = gz(min.code);
console.log(`\nJS min+gzip ${g} B (budget ${budget} B) ${g <= budget ? '✓' : '✗ OVER BUDGET'};  JS+CSS combined ${g + gz(css)} B`);
if (g > budget) process.exit(1);
if (sizeOnly) process.exit(0);

const head = src.indexOf('(function (root, factory) {'), body = src.indexOf("  'use strict';"), tail = src.lastIndexOf('});');
if (head < 0 || body < 0 || tail < 0) { console.error('✗ could not locate the UMD wrapper'); process.exit(1); }
fs.writeFileSync(f('izi-datepicker.mjs'), src.slice(0, head) + 'const factory = function () {\n' + src.slice(body, tail) + '};\nconst iZiDatePicker = factory();\nexport { iZiDatePicker };\nexport default iZiDatePicker;\n');
fs.writeFileSync(f('izi-datepicker.min.js'), min.code + '\n//# sourceMappingURL=izi-datepicker.min.js.map\n');
fs.writeFileSync(f('izi-datepicker.min.js.map'), min.map);
// locale pack -> ESM (imports the ESM core)
{
  const L = fs.readFileSync(f('izi-datepicker.locales.js'), 'utf8'), h = L.indexOf('(function (root, factory) {'), fb = L.indexOf("function (JDP) {\n  'use strict';"), te = L.lastIndexOf('});');
  if (h < 0 || fb < 0 || te < 0) { console.error('✗ could not locate the locale pack wrapper'); process.exit(1); }
  fs.writeFileSync(f('izi-datepicker.locales.mjs'), L.slice(0, h) + "import iZiDatePicker from './izi-datepicker.mjs';\nconst factory = " + L.slice(fb, te) + '};\nexport const pack = factory(iZiDatePicker);\nexport default pack;\n');
  console.log('✓ wrote izi-datepicker.locales.mjs');
}
console.log('✓ wrote izi-datepicker.mjs, izi-datepicker.min.js, izi-datepicker.min.js.map');
