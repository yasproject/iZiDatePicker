#!/usr/bin/env node
/**
 * Holiday data pipeline: validates raw yearly files and emits normalized files the library can load directly.
 *
 *   node tools/build-holidays.mjs [--in data/raw] [--out data/holidays] [--force] [--year 1405]
 * Also writes bundle.json / bundle.js (all years in one file, works offline: holidays:{ data: iZiHolidays }).
 *
 * Raw input  : { data: [{ date:'YYYY-MM-DD', shamsiDate:'YYYY/MM/DD', isHoliday, holidayDesription }], totalCount }
 * Output     : <out>/<year>.json  -> [{ jm, jd, title, titles, type }]   (one entry per day, explicit type)
 *              <out>/manifest.json -> { years: { "1405": { count, sha256 } } }
 *
 * A year with ERRORS is not written (use --force to override, not recommended).
 * Checks: schema, date<->shamsi consistency, year match, duplicates (merged), required fixed holidays,
 *         lunar plausibility between consecutive years (a clone of last year's file is detected).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const JDP = require(path.join(here, '..', 'izi-datepicker.js'));
const C = JDP.converter;
const norm = new JDP.HolidayProvider({ loaded() {}, failed() {} }); // reuse the library's own normaliser/classifier

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const force = args.includes('--force');
const inDir = path.resolve(opt('in', path.join(here, '..', 'data', 'raw')));
const outDir = path.resolve(opt('out', path.join(here, '..', 'data', 'holidays')));
const only = opt('year', null);

const FIXED = ['1-1', '1-2', '1-3', '1-4', '1-12', '1-13', '3-14', '3-15', '11-22', '12-29'];
const iso = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
const files = fs.readdirSync(inDir).filter(f => /^\d{4}\.json$/.test(f)).sort();
const parsed = {};
const report = {};
let failed = 0;

for (const f of files) {
  const year = +f.slice(0, 4);
  const errs = [], warns = [], info = [];
  let raw;
  try { raw = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8')); } catch (e) { errs.push('invalid JSON: ' + e.message); }
  const list = raw && Array.isArray(raw.data) ? raw.data : [];
  if (raw && !Array.isArray(raw.data)) errs.push('missing "data" array');
  if (raw && raw.totalCount != null && raw.totalCount !== list.length) warns.push(`totalCount (${raw.totalCount}) != entries (${list.length})`);

  const byDay = new Map();
  for (const [i, it] of list.entries()) {
    const at = `entry #${i + 1}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) { errs.push(`${at}: bad "date"`); continue; }
    const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(it.shamsiDate || '');
    if (!m) { errs.push(`${at}: bad "shamsiDate"`); continue; }
    const [jy, jm, jd] = [+m[1], +m[2], +m[3]];
    if (jy !== year) errs.push(`${at}: shamsiDate year ${jy} != file year ${year}`);
    if (!C.isValid(jy, jm, jd)) { errs.push(`${at}: ${it.shamsiDate} is not a valid Jalali date`); continue; }
    const g = C.toGregorian(jy, jm, jd);
    const want = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
    if (want !== it.date) errs.push(`${at}: ${it.shamsiDate} should be ${want}, file says ${it.date}`);
    const title = String(it.holidayDesription || '').replace(/^[\s\-\u2013]+/, '').trim();
    if (!title) warns.push(`${at}: empty title on ${it.shamsiDate}`);
    if (it.isHoliday === false) continue;
    const key = jm + '-' + jd;
    const e = byDay.get(key) || { jm, jd, date: it.date, titles: [] };
    if (title && !e.titles.includes(title)) e.titles.push(title);
    byDay.set(key, e);
  }
  if (list.length > byDay.size) info.push(`${list.length - byDay.size} duplicate/non-holiday rows merged`);

  const entries = [...byDay.values()].sort((a, b) => a.jm - b.jm || a.jd - b.jd).map(e => {
    const typed = norm._norm(e.titles.map(t => ({ jm: e.jm, jd: e.jd, title: t })));
    const type = typed.some(t => t.type === 'religious') ? 'religious' : 'official';
    return { jm: e.jm, jd: e.jd, title: e.titles.join(' / '), titles: e.titles, type, _date: e.date };
  });
  for (const k of FIXED) if (!byDay.has(k)) warns.push(`fixed holiday ${k.replace('-', '/')} is not listed`);
  const fridays = entries.filter(e => C.dayOfWeek(C.toJDN(year, e.jm, e.jd)) === 5).length;
  info.push(`${entries.length} holiday days (${entries.filter(e => e.type === 'religious').length} religious, ${fridays} on Fridays)`);
  parsed[year] = entries;
  report[year] = { errs, warns, info, file: f };
}

// ---- cross-year lunar plausibility: a religious event moves ~354/355 days between consecutive Gregorian dates
const titleKey = t => t.replace(/[\s\u200c]+/g, '').replace(/^تعطیلبهمناسبت/, '');
for (const y of Object.keys(parsed).map(Number)) {
  const prev = parsed[y - 1];
  if (!prev) continue;
  const rel = parsed[y].filter(e => e.type === 'religious'), relp = new Map(prev.filter(e => e.type === 'religious').map(e => [titleKey(e.titles[0]), e]));
  let checked = 0, clones = 0;
  for (const e of rel) {
    const p = relp.get(titleKey(e.titles[0]));
    if (!p) continue;
    checked++;
    const delta = iso(e._date) - iso(p._date);
    if (delta === 365 || delta === 366) clones++;
    else if (delta < 352 || delta > 357) report[y].warns.push(`lunar shift for "${e.titles[0]}" is ${delta} days (expected ~354-355)`);
  }
  if (checked >= 3 && clones / checked > 0.6) report[y].errs.push(`${clones}/${checked} religious holidays moved exactly 365/366 days from ${y - 1}: this file looks like a CLONE of the previous year (lunar dates drift ~11 days/year)`);
}

fs.mkdirSync(outDir, { recursive: true });
const manifest = fs.existsSync(path.join(outDir, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8')) : { years: {} };
for (const y of Object.keys(report).map(Number)) {
  if (only && +only !== y) continue; // other years were parsed only as context for the cross-year checks
  const r = report[y];
  console.log(`\n${y}  (${r.file})`);
  r.info.forEach(m => console.log('  ·', m));
  r.warns.forEach(m => console.log('  ! warning:', m));
  r.errs.forEach(m => console.log('  ✗ ERROR:', m));
  if (r.errs.length && !force) { failed++; console.log('  → NOT written'); continue; }
  const out = parsed[y].map(({ jm, jd, title, titles, type }) => ({ jm, jd, title, titles, type }));
  const body = JSON.stringify(out, null, 1) + '\n';
  fs.writeFileSync(path.join(outDir, y + '.json'), body);
  manifest.years[y] = { count: out.length, sha256: crypto.createHash('sha256').update(body).digest('hex').slice(0, 16) };
  console.log(`  → wrote ${path.relative(process.cwd(), path.join(outDir, y + '.json'))}`);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ years: Object.fromEntries(Object.entries(manifest.years).sort()) }, null, 1) + '\n');
// ---- one-file bundle of every year in <out>: bundle.json ({ "1405": [...] }) and bundle.js (global iZiHolidays / CommonJS)
{
  const all = {};
  for (const f of fs.readdirSync(outDir).filter(n => /^\d{4}\.json$/.test(n)).sort()) all[f.slice(0, 4)] = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  fs.writeFileSync(path.join(outDir, 'bundle.json'), JSON.stringify(all));
  fs.writeFileSync(path.join(outDir, 'bundle.js'), `/* generated by tools/build-holidays.mjs - do not edit. Usage: holidays: { data: iZiHolidays } */\n(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.iZiHolidays = f(); })(typeof self !== 'undefined' ? self : this, function () { return ${JSON.stringify(all)}; });\n`);
  console.log(`\nbundle: ${Object.keys(all).join(', ') || '(no years)'} -> bundle.json, bundle.js`);
}
if (failed) { console.log(`\n${failed} year(s) rejected.`); process.exit(1); }
