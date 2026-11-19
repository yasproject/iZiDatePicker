// node tests/holidays-pack.test.js — holiday pack source (manifest + hash revalidation) and the update tooling
const { JSDOM } = require('jsdom'); const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http'); const { spawn } = require('child_process');
const root = path.join(__dirname, '..'); const src = fs.readFileSync(path.join(root, 'izi-datepicker.js'), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' -> got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (args, env) => new Promise(res => { const c = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env } }); let out = ''; c.stdout.on('data', d => (out += d)); c.stderr.on('data', d => (out += d)); c.on('close', code => res({ code, out })); });
(async () => {
  const raw1405 = JSON.parse(fs.readFileSync(path.join(root, 'data/raw/1405.json'), 'utf8')), raw1406 = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/clone-of-1405.json'), 'utf8')) /* a deliberately cloned year: must be rejected */;
  const JAL = require(path.join(root, 'izi-datepicker.js')).converter;
  // a SYNTHETIC year used only to exercise the tooling (never shipped): internally consistent dates
  const g = (y, m, d) => { const x = JAL.toGregorian(y, m, d); return `${x.gy}-${String(x.gm).padStart(2, '0')}-${String(x.gd).padStart(2, '0')}`; };
  const synth = { data: [[1, 1, 'عید نوروز'], [1, 2, 'عید نوروز'], [11, 22, 'پیروزی انقلاب اسلامی ایران'], [12, 29, 'روز ملی شدن صنعت نفت ایران']].map(([m, d, t]) => ({ date: g(1408, m, d), shamsiDate: `1408/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`, isHoliday: true, holidayDesription: t })) };

  console.log('# update tool against a local HTTP server');
  const seen = []; let served1405 = raw1405;
  const srv = http.createServer((q, r) => { seen.push({ url: q.url, auth: q.headers.authorization }); const send = (c, o) => { r.writeHead(c, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
    if (q.url === '/h/1405') return send(200, served1405); if (q.url === '/h/1406') return send(200, raw1406); if (q.url === '/h/1407') return send(404, {}); if (q.url.startsWith('/h/1408')) return send(200, { result: { items: synth.data } }); if (q.url === '/h/1409') return send(200, { data: [] }); send(404, {}); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}`;
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'izi-t-')), raw = tmp(), out = tmp();
  let r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1405-1407', '--raw', raw, '--out', out, '--header', 'Authorization: Bearer secret']);
  eq(r.code, 1, 'exit 1 when a year is rejected / missing'); ok(/✓ 1405: 26 rows/.test(r.out), '1405 downloaded'); ok(/✗ 1407: HTTP 404/.test(r.out), '1407 reported as a download failure (never invented)'); ok(/CLONE/.test(r.out) || !fs.existsSync(path.join(out, '1406.json')), '1406 (a copy of 1405) is not written');
  ok(fs.existsSync(path.join(out, '1405.json')) && !fs.existsSync(path.join(out, '1406.json')) && !fs.existsSync(path.join(out, '1407.json')), 'only the valid year is in the pack'); eq(Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).years), ['1405'], 'manifest lists exactly the written years'); eq(Object.keys(require(path.join(out, 'bundle.js'))), ['1405'], 'bundle.js has the same years'); ok(seen.every(s => s.auth === 'Bearer secret'), 'custom header sent on every request');
  r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1408', '--path', 'result.items', '--raw', raw, '--out', out]); eq(r.code, 0, 'a valid year via --path (array response is wrapped) -> exit 0'); eq(Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).years), ['1405', '1408'], 'new year added, existing year kept');
  r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1409', '--raw', raw, '--out', out]); ok(r.code === 1 && /no non-empty "data"/.test(r.out), 'an empty response is rejected');
  console.log('# --check (CI drift detection)');
  r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1405', '--out', out, '--check']); eq([r.code, /unchanged/.test(r.out), /no drift/.test(r.out)], [0, true, true], 'identical upstream -> exit 0');
  served1405 = { ...raw1405, data: raw1405.data.map((x, i) => (i === 0 ? { ...x, holidayDesription: 'عنوان تغییر کرده' } : x)) }; r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1405', '--out', out, '--check']); eq([r.code, /CHANGED upstream/.test(r.out)], [2, true], 'upstream edit -> exit 2 (drift)'); ok(JSON.parse(fs.readFileSync(path.join(out, '1405.json'), 'utf8'))[0].title !== 'عنوان تغییر کرده', '--check never modifies the committed pack');
  served1405 = raw1405; r = await run(['tools/update-holidays.mjs', '--url', base + '/h/{year}', '--years', '1405,1408', '--out', tmp(), '--check']); eq([r.code, /NEW/.test(r.out)], [2, true], 'a year missing from the committed pack counts as drift');
  r = await run(['tools/update-holidays.mjs', '--years', '1405']); eq(r.code, 1, 'missing --url -> usage error'); srv.close();

  console.log('# library: type "pack"');
  const mkw = () => { const w = new JSDOM('<body><input id="a"></body>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(src); return w; };
  const entries = [{ jm: 1, jd: 1, title: 'عید سعید فطر', type: 'religious' }, { jm: 1, jd: 3, title: 'عید نوروز' }];
  const mkFetch = (state, calls) => async (url) => { calls.push(url); await sleep(5); if (url.endsWith('manifest.json')) return { ok: true, json: async () => state.manifest }; const y = url.match(/(\d{4})\.json$/)[1]; return state.files[y] ? { ok: true, json: async () => state.files[y] } : { ok: false, status: 404 }; };
  let w = mkw(), P = w.iZiDatePicker, calls = [], state = { manifest: { years: { 1405: { count: 2, sha256: 'aaa' } } }, files: { 1405: entries } };
  let errs = [], loaded = []; let p = new P(w.document.getElementById('a'), { onHolidaysError: e => errs.push(e.year), onHolidaysLoaded: e => loaded.push(e.year + ':' + e.source), holidays: { cache: 'storage', cacheKey: 't', sources: [{ type: 'pack', base: '/h/', fetch: mkFetch(state, calls) }] } });
  p.goTo(1405, 1); p.getState(); await sleep(40); eq([p.provider.getDay(1405, 1, 1).types, p.provider.getDay(1405, 1, 3).primary], [['religious'], 'official'], 'covered year loads from the pack'); eq([calls.length, calls[0], calls[1]], [2, '/h/manifest.json', '/h/1405.json'], 'manifest first, then only that year'); eq(loaded, ['1405:pack'], 'holidaysLoaded names the source');
  eq(JSON.parse(w.localStorage.getItem('izi:h:t:1405')).h, 'aaa', 'the pack hash is stored with the cached year');
  p.goTo(1406, 1); p.getState(); await sleep(40); p.goTo(1406, 5); p.getState(); await sleep(20); eq(errs, [], 'a year the pack does not cover is NOT an error'); eq(p.provider.getDay(1406, 1, 1).primary, 'official', '... the fixed layer is used'); ok(!p.getState().loading, '... and loading clears'); eq(calls.filter(u => u.endsWith('manifest.json')).length, 1, 'the manifest is fetched once and shared'); eq(calls.filter(u => u.endsWith('1406.json')).length, 0, 'no request for an uncovered year'); p.destroy();
  console.log('# library: cached year is re-validated against the manifest hash');
  state.manifest.years[1405] = { count: 2, sha256: 'bbb' }; state.files[1405] = [{ jm: 1, jd: 1, title: 'عنوان جدید', type: 'official' }]; calls = []; loaded = [];
  p = new P(w.document.getElementById('a'), { onHolidaysLoaded: e => loaded.push(e.year + ':' + e.source), holidays: { cache: 'storage', cacheKey: 't', sources: [{ type: 'pack', base: '/h/', fetch: mkFetch(state, calls) }] } });
  p.goTo(1405, 1); p.getState(); eq(p.provider.getDay(1405, 1, 1).titles, ['عید سعید فطر'], 'offline-first: the cached (old) data is served instantly'); await sleep(60);
  eq(p.provider.getDay(1405, 1, 1).titles, ['عنوان جدید'], 'after the manifest check the changed year is reloaded'); eq(loaded, ['1405:pack'], 'holidaysLoaded fired for the refresh'); eq(JSON.parse(w.localStorage.getItem('izi:h:t:1405')).h, 'bbb', 'cache updated with the new hash'); p.destroy();
  calls = []; p = new P(w.document.getElementById('a'), { holidays: { cache: 'storage', cacheKey: 't', sources: [{ type: 'pack', base: '/h/', fetch: mkFetch(state, calls) }] } }); p.goTo(1405, 1); p.getState(); await sleep(40); eq([calls.filter(u => u.endsWith('1405.json')).length, p.provider.getDay(1405, 1, 1).titles], [0, ['عنوان جدید']], 'unchanged hash -> cache is trusted, the year file is not fetched again'); p.destroy();
  console.log('# library: failures');
  errs = []; p = new P(w.document.getElementById('a'), { onHolidaysError: e => errs.push(e.year), holidays: { sources: [{ type: 'pack', base: '/x/', fetch: async () => ({ ok: false, status: 500 }) }] } }); p.goTo(1405, 1); p.getState(); await sleep(30); eq(errs, [1405], 'manifest unreachable -> holidaysError once'); eq(p.provider.getDay(1405, 1, 1).primary, 'official', '... fixed layer fallback'); p.destroy();
  p = new P(w.document.getElementById('a'), { holidays: { sources: [{ type: 'json', name: 'inline', data: { 1405: entries } }, { type: 'pack', base: '/h/', fetch: mkFetch(state, calls = []) }] } }); p.goTo(1405, 1); p.getState(); eq([p.provider.getDay(1405, 1, 1).types, calls.length], [['religious'], 0], "merge:'first': an inline source answering first means the pack is never contacted"); p.destroy();
  console.log('# bundle usage');
  const bundle = require(path.join(root, 'data/holidays/bundle.js')); p = new P(w.document.getElementById('a'), { holidays: { data: bundle } }); eq([p.provider.getDay(1405, 1, 1).types, p.provider.getDay(1405, 12, 29).primary, p.provider.getDay(1406, 1, 1).primary], [['religious'], 'official', 'official'], 'holidays:{data: iZiHolidays} works offline; uncovered years fall back'); p.destroy();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
