#!/usr/bin/env node
/**
 * Download yearly holiday files from an HTTP source, validate + normalise them, and (re)build the data pack.
 *
 *   node tools/update-holidays.mjs --url 'https://host/holidays/{year}' --years 1405-1410 \
 *        [--header 'Authorization: Bearer TOKEN'] [--path result.items] [--raw data/raw] [--out data/holidays] [--check] [--force]
 *
 * The response must be the raw schema { data: [{ date, shamsiDate, isHoliday, holidayDesription }] } (an array is wrapped;
 * --path locates it inside a larger response). Every year goes through tools/build-holidays.mjs, so a cloned / inconsistent
 * year is REJECTED. This tool never invents data: a year the source does not return is reported and left untouched.
 *
 *   --check   download to a temp dir and compare with the committed pack; exit 2 on drift (use in a scheduled CI job)
 * Exit codes: 0 ok / no drift, 1 validation or download failure, 2 drift detected (--check).
 * Placeholders in --url: {year} (Jalali year), {gy} (Gregorian year of 1 Farvardin).
 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const all = k => args.flatMap((a, i) => (a === '--' + k ? [args[i + 1]] : []));
const urlT = opt('url'), check = args.includes('--check'), force = args.includes('--force');
if (!urlT) { console.error('usage: update-holidays.mjs --url <template with {year}> --years 1405-1410 [--header "K: V"] [--path a.b] [--check]'); process.exit(1); }
const years = String(opt('years', '')).split(',').flatMap(t => { const m = /^(\d{4})-(\d{4})$/.exec(t.trim()); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : /^\d{4}$/.test(t.trim()) ? [+t] : []; });
if (!years.length) { console.error('--years is required (e.g. 1405-1410 or 1405,1406)'); process.exit(1); }
const headers = Object.fromEntries(all('header').map(h => { const i = h.indexOf(':'); return [h.slice(0, i).trim(), h.slice(i + 1).trim()]; }));
const pth = opt('path', null), dig = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const committed = path.resolve(opt('out', path.join(here, '..', 'data', 'holidays')));
const rawDir = check ? fs.mkdtempSync(path.join(os.tmpdir(), 'izi-raw-')) : path.resolve(opt('raw', path.join(here, '..', 'data', 'raw')));
const outDir = check ? fs.mkdtempSync(path.join(os.tmpdir(), 'izi-out-')) : committed;
fs.mkdirSync(rawDir, { recursive: true });
const gYear = y => { const jd = (y0, m, d) => y0; return y + 621; }; // 1 Farvardin of Jalali year y falls in Gregorian year y + 621

let fetchFailed = 0; const got = [];
for (const y of years) {
  const url = urlT.replace(/\{year\}/g, y).replace(/\{gy\}/g, gYear(y));
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(url, { headers, signal: ctl.signal }); clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let body = await res.json(); if (pth) body = dig(body, pth);
    if (Array.isArray(body)) body = { data: body };
    if (!body || !Array.isArray(body.data) || !body.data.length) throw new Error('response has no non-empty "data" array');
    fs.writeFileSync(path.join(rawDir, y + '.json'), JSON.stringify(body));
    got.push(y); console.log(`✓ ${y}: ${body.data.length} rows from ${url}`);
  } catch (e) { fetchFailed++; console.log(`✗ ${y}: ${e.message} (${url})`); }
}
if (!got.length) { console.error('nothing downloaded'); process.exit(1); }
// validate + normalise ONLY the downloaded years (previous years stay as they are)
let code = 0;
for (const y of got) {
  const r = spawnSync(process.execPath, [path.join(here, 'build-holidays.mjs'), '--in', rawDir, '--out', outDir, '--year', String(y), ...(force ? ['--force'] : [])], { encoding: 'utf8' });
  process.stdout.write(r.stdout.split('\n').filter(l => /ERROR|warning|→|^\d{4}/.test(l)).join('\n') + '\n');
  if (r.status) code = 1;
}
if (check) {
  const mf = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).years || {} : {});
  const a = mf(path.join(committed, 'manifest.json')), b = mf(path.join(outDir, 'manifest.json'));
  const drift = got.filter(y => !a[y] || a[y].sha256 !== (b[y] || {}).sha256 && b[y]);
  for (const y of got) console.log(`${y}: ${!a[y] ? 'NEW (not in the committed pack)' : !b[y] ? 'rejected' : a[y].sha256 === b[y].sha256 ? 'unchanged' : 'CHANGED upstream'}`);
  if (code) process.exit(1);
  if (drift.length) { console.log(`\ndrift detected in ${drift.length} year(s): ${drift.join(', ')}`); process.exit(2); }
  console.log('\nno drift'); process.exit(fetchFailed ? 1 : 0);
}
process.exit(code || (fetchFailed ? 1 : 0));
