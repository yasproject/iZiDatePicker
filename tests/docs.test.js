// node tests/docs.test.js - runs every code sample marked <!-- test --> in docs/*/*.md and checks the results written in "// ..." comments
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const lib = fs.readFileSync(path.join(root, 'izi-datepicker.js'), 'utf8');
const locales = fs.readFileSync(path.join(root, 'izi-datepicker.locales.js'), 'utf8').replace(/if \(typeof module === 'object' && module\.exports\) module\.exports = factory\(require\('\.\/izi-datepicker\.js'\)\);\s*else factory\(root\.iZiDatePicker\);/, 'factory(root.iZiDatePicker);');
let pass = 0, fail = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
const FIXTURE = '<body>' + ['date', 'range', 'start', 'end', 'booking', 'time'].map(i => `<input id="${i}">`).join('') + '<div id="cal"></div></body>';
// "x.getValue('iso');   // "2026-05-28"   explanation"  ->  check(expr, expected)
const instrument = code => code.split('\n').map(line => {
  const lg = /^(\s*)console\.log\((.*)\);\s*\/\/\s*(.+)$/.exec(line); // console.log(X); // result  -> check X
  const m = lg ? [lg[0], lg[1], lg[2], lg[3]] : /^(\s*)((?:\w+\.)+\w+\([^;]*\)|\w+\.\w+\([^;]*\));\s*\/\/\s*(.+)$/.exec(line);
  if (!m) return line;
  const lit = m[3].split(/\s{2,}/)[0].trim();
  if (!/^(["'`].*["'`]|-?\d[\d.]*|true|false|null|\{.*\}|\[.*\])$/.test(lit)) return line;
  return `${m[1]}__chk(() => ${m[2]}, ${JSON.stringify(lit)}, ${JSON.stringify(m[2])});`;
}).join('\n');
async function run(file) {
  const md = fs.readFileSync(file, 'utf8'), re = /<!-- test -->\s*\n```js\n([\s\S]*?)\n```/g; let m, n = 0;
  while ((m = re.exec(md))) {
    n++; const code = m[1], where = `${path.relative(root, file)} #${n}`;
    const dom = new JSDOM(FIXTURE, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window, errs = [], checks = [];
    w.fetch = async () => ({ ok: true, status: 200, json: async () => [], text: async () => '' });
    w.console = { log() {}, info() {}, warn() {}, error: (...a) => errs.push(a.join(' ')) };
    w.__chk = (fn, lit, expr) => { let got, want; try { got = fn(); want = new w.Function('return (' + lit + ')')(); } catch (e) { return; } /* object key order does not matter */ const key = (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v); const same = JSON.stringify(got, key) === JSON.stringify(want, key); checks.push({ same, expr, lit, got }); };
    w.eval(lib); w.eval(locales);
    const rejections = []; const onRej = e => rejections.push(String(e && e.message || e)); process.on('unhandledRejection', onRej);
    try { w.eval(instrument(code)); await sleep(30); } catch (e) { errs.push('THROWN: ' + e.message); }
    process.off('unhandledRejection', onRej);
    const bad = checks.filter(c => !c.same);
    if (errs.length || rejections.length || bad.length) { fail++; console.log('  FAIL', where, errs.concat(rejections).join(' | '), bad.map(b => `${b.expr} -> ${JSON.stringify(b.got)} (doc says ${b.lit})`).join(' | ')); } else pass++;
    w.close();
  }
  return n;
}
(async () => {
  let total = 0;
  for (const f of ['README.md', 'README.fa.md']) { console.log('# ' + f); if (fs.existsSync(path.join(root, f))) total += await run(path.join(root, f)); }
  for (const lang of ['en', 'fa']) {
    const dir = path.join(root, 'docs', lang); if (!fs.existsSync(dir)) continue;
    console.log('# docs/' + lang);
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md')).sort()) total += await run(path.join(dir, f));
  }
  console.log(`\n${pass} passed, ${fail} failed (${total} samples)`); process.exit(fail ? 1 : 0);
})();
