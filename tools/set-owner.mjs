#!/usr/bin/env node
/**
 * Replace the OWNER placeholder with your GitHub user / organisation name in the files that reference the repository.
 *   node tools/set-owner.mjs your-github-name
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const owner = process.argv[2];
if (!owner || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) { console.error('usage: set-owner.mjs <github-user-or-org>'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.git') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(md|json|yml|yaml|html)$/.test(e.name)) { const t = fs.readFileSync(p, 'utf8'); if (t.includes('OWNER')) { fs.writeFileSync(p, t.replace(/\bOWNER\b/g, owner)); n++; console.log('updated', path.relative(root, p)); } } } };
walk(root);
console.log(n ? `done: ${n} file(s)` : 'nothing to replace (already set?)');
