// node tests/links.test.js - every relative link, image and #anchor in the Markdown files must resolve; en/fa guides must pair up
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0; const bad = m => { fail++; console.log('  FAIL:', m); }, good = () => pass++;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const md = walk(root).filter(f => f.endsWith('.md'));
const slug = h => h.replace(/[`*_~]/g, c => (c === '_' ? '_' : '')).toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').trim().replace(/\s/g, '-');
const anchors = file => { const t = fs.readFileSync(file, 'utf8'), out = new Set(); let inCode = false; for (const l of t.split('\n')) { if (/^```/.test(l)) inCode = !inCode; const m = !inCode && /^#{1,6}\s+(.*)$/.exec(l); if (m) out.add(slug(m[1].replace(/<[^>]+>/g, ''))); } for (const m of t.matchAll(/<(?:a|h\d)[^>]*\bid="([^"]+)"/g)) out.add(m[1]); return out; };
const cache = {};
for (const f of md) {
  /* code samples are not links */ const t = fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, ''), links = [...t.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(m => m[1]).concat([...t.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]));
  for (const l of links) {
    if (/^(https?:|mailto:|data:|tel:)/.test(l)) continue;
    const [p, hash] = l.split('#'), target = p ? path.resolve(path.dirname(f), decodeURIComponent(p)) : f;
    if (!fs.existsSync(target)) { bad(`${path.relative(root, f)} -> ${l} (missing file)`); continue; }
    if (hash && target.endsWith('.md')) { const a = cache[target] || (cache[target] = anchors(target)); if (!a.has(decodeURIComponent(hash))) { bad(`${path.relative(root, f)} -> ${l} (no such heading; have: ${[...a].slice(0, 6).join(', ')}...)`); continue; } }
    good();
  }
}
const en = fs.readdirSync(path.join(root, 'docs/en')).sort(), fa = fs.readdirSync(path.join(root, 'docs/fa')).sort();
JSON.stringify(en) === JSON.stringify(fa) ? good() : bad('docs/en and docs/fa do not contain the same files: ' + en.filter(x => !fa.includes(x)).concat(fa.filter(x => !en.includes(x))));
for (const f of en) { const a = fs.readFileSync(path.join(root, 'docs/en', f), 'utf8'), b = fs.readFileSync(path.join(root, 'docs/fa', f), 'utf8'), n = s => (s.match(/<!-- test -->/g) || []).length; n(a) === n(b) ? good() : bad(`${f}: ${n(a)} tested samples in en but ${n(b)} in fa`); }
for (const f of walk(path.join(root, 'assets'))) { const kb = fs.statSync(f).size / 1024; kb < 1500 ? good() : bad(`${path.relative(root, f)} is ${Math.round(kb)} KB`); }
console.log(`\n${pass} passed, ${fail} failed (${md.length} markdown files)`); process.exit(fail ? 1 : 0);
