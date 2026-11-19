// Real-browser tests (layout, positioning, touch, contrast/a11y).
//   npm i -D puppeteer axe-core   &&   node tests/browser/browser.test.mjs
// Use your own Chrome:  CHROME_PATH=/usr/bin/google-chrome node tests/browser/browser.test.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = fs.readFileSync(path.join(root, 'izi-datepicker.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'izi-datepicker.css'), 'utf8');
let axeSrc = null; try { const { createRequire } = await import('node:module'); axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8'); } catch { /* optional */ }

async function launch() {
  const args = ['--no-sandbox', '--disable-dev-shm-usage'];
  try { const p = (await import('puppeteer')).default; return await p.launch({ args, executablePath: process.env.CHROME_PATH || undefined, headless: true }); } catch { /* fall through */ }
  const pc = (await import('puppeteer-core')).default; let exe = process.env.CHROME_PATH, extra = [];
  if (!exe) { const ch = (await import('@sparticuz/chromium')).default; exe = await ch.executablePath(); extra = ch.args; }
  return pc.launch({ args: [...extra, ...args], executablePath: exe, headless: 'shell' });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
const near = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, `${m} -> ${a} vs ${b} (±${tol})`);

const page = (body, init) => `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
body{font-family:system-ui,Tahoma;margin:0;padding:16px;min-height:1500px}input{width:60%;padding:10px;font-size:16px;box-sizing:border-box;margin:6px 0}#tf{transform:translateZ(0);position:relative;margin-top:30px;padding:10px;border:1px dashed #999;height:120px}</style></head><body>${body}<script>${js}</script><script>${init}</script></body></html>`;
const BODY = ['basic', 'rng', 'yr', 'mon', 'sec', 'wk', 'mul', 'en'].map(id => `<input id="${id}">`).join('') + '<div id="tf"><input id="ab"></div>';
const INIT = `const P=iZiDatePicker;window.pk={basic:new P('#basic',{}),rng:new P('#rng',{mode:'range',presets:'default'}),yr:new P('#yr',{yearPicker:'grid',value:'1405/03/07'}),mon:new P('#mon',{mode:'month',value:'1405/03'}),
 sec:new P('#sec',{secondaryCalendar:'gregorian'}),wk:new P('#wk',{mode:'week',value:'1405/03/07'}),mul:new P('#mul',{mode:'multiple',maxDates:4}),en:new P('#en',{locale:'en',theme:'dark'}),ab:new P('#ab',{strategy:'absolute',appendTo:'#tf'})};`;
const vis = p => p.evaluate(() => { const e = [...document.querySelectorAll('.izi-container')].find(x => !x.hidden); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, sheet: e.classList.contains('izi-sheet'), place: e.dataset.placement }; });
const box = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });

const browser = await launch(); const errors = [];
const open = async (w, h, mobile) => { const p = await browser.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text())); await p.setViewport({ width: w, height: h, isMobile: !!mobile, hasTouch: !!mobile }); await p.setContent(page(BODY, INIT)); await sleep(100); return p; };

console.log('# desktop positioning');
let p = await open(900, 800);
await p.click('#basic'); await sleep(150); let v = await vis(p), i = await box(p, '#basic');
near(v.r, i.r, 1, 'RTL: popup right edge aligns with the input right edge'); near(v.t - i.b, 4, 1, 'popup sits 4px below the input'); ok(v.h > 300 && v.w === 340, 'popup has real layout size (340px wide)');
await p.keyboard.press('Escape'); await p.evaluate(() => { const i = document.getElementById('en'); i.style.position = 'fixed'; i.style.top = '30px'; i.style.insetInlineStart = '24px'; });
await p.click('#en'); await sleep(150); v = await vis(p); i = await box(p, '#en'); near(v.l, i.l, 1, 'LTR: popup left edge aligns with the input left edge');
ok(await p.evaluate(() => getComputedStyle(document.querySelector('.izi-container:not([hidden])')).direction) === 'ltr', 'en locale renders LTR'); await p.keyboard.press('Escape');
await p.evaluate(() => { const i = document.getElementById('basic'); i.style.position = 'fixed'; i.style.top = (innerHeight - 56) + 'px'; });
await p.click('#basic'); await sleep(150); v = await vis(p); i = await box(p, '#basic'); ok(v.place === 'top' && v.b <= i.t, 'flips above the input when there is no room below'); await p.keyboard.press('Escape');
await p.evaluate(() => { document.getElementById('basic').style.cssText = ''; scrollTo(0, 120); }); await p.click('#mul'); await sleep(100); const t0 = (await vis(p)).t; await p.evaluate(() => scrollBy(0, 50)); await sleep(120); near(t0 - (await vis(p)).t, 50, 2, 'popup follows the input while scrolling'); await p.keyboard.press('Escape');
await p.evaluate(() => scrollTo(0, 330)); await p.click('#ab'); await sleep(150); const ab = await p.evaluate(() => { const i = document.getElementById('ab').getBoundingClientRect(), r = document.querySelector('#tf .izi-container').getBoundingClientRect(); return r.top - i.bottom; }); near(ab, 4, 1, 'strategy:"absolute" is correct inside a transformed parent'); await p.keyboard.press('Escape');

console.log('# rendering / css regressions');
await p.evaluate(() => scrollTo(0, 0)); await p.click('#yr'); await sleep(120); await p.click('.izi-year-btn'); await sleep(120);
ok(await p.evaluate(() => getComputedStyle(document.querySelector('.izi-container:not([hidden]) .izi-days-grid')).display) === 'none', 'day grid is truly hidden while the year panel is open (hidden attr must beat display:flex)');
ok(await p.evaluate(() => document.querySelector('.izi-container:not([hidden])').offsetHeight < 620), 'popup height stays bounded with the year panel'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
await p.click('#rng'); await sleep(120); await p.click('.izi-container:not([hidden]) .izi-day-cell:not(.izi-faded)'); await sleep(80);
const band = await p.evaluate(() => { const cells = [...document.querySelectorAll('.izi-container:not([hidden]) .izi-day-cell')]; const a = cells.find(c => c.classList.contains('izi-selected-start')); return !!a; }); ok(band, 'range start gets izi-selected-start'); await p.keyboard.press('Escape');
await p.click('#basic'); await p.keyboard.press('ArrowDown'); await sleep(150);
const ring = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { cell: a.classList.contains('izi-day-cell'), w: parseFloat(s.outlineWidth), st: s.outlineStyle }; });
ok(ring.cell && ring.w >= 2 && ring.st !== 'none', 'keyboard focus shows a visible ring (focus-visible)'); await p.keyboard.press('Escape'); await p.close();

console.log('# mobile (390x780, touch)');
p = await open(390, 780, true);
await p.tap('#rng'); await sleep(300); v = await vis(p);
ok(v && v.sheet, 'bottom sheet is used on a phone'); near(v.w, 390, 1, 'sheet spans the full width'); near(v.b, 780, 1, 'sheet is anchored to the bottom edge');
const tt = await p.evaluate(() => { const q = s => { const r = document.querySelector('.izi-container:not([hidden]) ' + s).getBoundingClientRect(); return { width: r.width, height: r.height }; }; return { cell: q('.izi-day-cell'), nav: q('.izi-nav-btn'), chip: q('.izi-chip'), btn: q('.izi-btn') }; });
ok(tt.cell.width >= 44 && tt.cell.height >= 44, `day cells >= 44px (${Math.round(tt.cell.width)}x${Math.round(tt.cell.height)})`); ok(tt.nav.width >= 44 && tt.nav.height >= 44, 'nav buttons >= 44px'); ok(tt.chip.height >= 44 && tt.btn.height >= 44, 'chips and footer buttons >= 44px');
ok(await p.$eval('#rng', e => e.getAttribute('inputmode')) === 'none', 'virtual keyboard suppressed (inputmode=none)'); ok(await p.evaluate(() => document.body.style.overflow) === 'hidden', 'page scroll locked behind the sheet');
const g = await p.$eval('.izi-container:not([hidden]) .izi-days-grid', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const cdp = await p.createCDPSession(); const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const jm0 = await p.evaluate(() => pk.rng.model.view.jm);
await touch('touchStart', g.x - 90, g.y); await touch('touchMove', g.x, g.y); await touch('touchMove', g.x + 90, g.y); await touch('touchEnd', g.x + 90, g.y); await sleep(200);
eq(await p.evaluate(() => pk.rng.model.view.jm), jm0 + 1, 'RTL: swipe right = next month');
await touch('touchStart', g.x + 90, g.y); await touch('touchMove', g.x, g.y); await touch('touchMove', g.x - 90, g.y); await touch('touchEnd', g.x - 90, g.y); await sleep(200);
eq(await p.evaluate(() => pk.rng.model.view.jm), jm0, 'RTL: swipe left = previous month');
await p.touchscreen.tap(195, 30); await sleep(300);
ok(!(await vis(p)) && !(await p.$('.izi-backdrop')), 'backdrop tap closes the sheet and does NOT reopen it (ghost click swallowed)'); ok(await p.evaluate(() => document.body.style.overflow) === '', 'scroll lock released');
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), `${m} -> ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); }
await p.close();

if (axeSrc) {
  console.log('# accessibility (axe-core, WCAG 2.1 AA + best practices)');
  p = await open(900, 800); await p.evaluate(axeSrc);
  for (const [label, id, pre] of [['single', 'sec'], ['range+presets', 'rng'], ['month', 'mon'], ['multiple', 'mul'], ['week', 'wk'], ['year grid', 'yr'], ['dark', 'basic', "pk.basic.setOptions({theme:'dark'})"]]) {
    await p.evaluate(() => { for (const k in pk) pk[k].close(); }); if (pre) await p.evaluate(pre);
    await p.click('#' + id); await sleep(200);
    const res = await p.evaluate(async () => { const el = [...document.querySelectorAll('.izi-container')].find(e => !e.hidden); const r = await axe.run(el, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }); return r.violations.map(x => x.id + ' x' + x.nodes.length); });
    ok(res.length === 0, `axe [${label}]: ${res.join(', ')}`);
  }
  await p.close();
} else console.log('# accessibility: axe-core not installed, skipped');


console.log('# quick ranges: every chip, constraints, drag / wheel / arrows (RTL + LTR)');
{
  const body = ['pa', 'pb', 'pc', 'pd'].map(id => `<input id="${id}">`).join('');
  const init = `const P=iZiDatePicker;window.pk={pa:new P('#pa',{mode:'range',presets:'all'}),pb:new P('#pb',{mode:'range',presets:'default',minRangeDays:2,maxRangeDays:14}),pc:new P('#pc',{mode:'range',presets:'all',presetsLayout:'wrap'}),pd:new P('#pd',{mode:'range',presets:'all',locale:'en',dir:'ltr'})};`;
  const q = await browser.newPage(); q.on('pageerror', e => errors.push(e.message)); await q.setViewport({ width: 900, height: 900 }); await q.setContent(page(body, init)); await sleep(100);
  const R = '.izi-container:not([hidden])', openAt = async id => { if (await q.$(R)) await q.keyboard.press('Escape'); await q.click('#' + id); await sleep(150); };
  await openAt('pa'); const ids = await q.$$eval(R + ' .izi-chip', n => n.map(c => c.dataset.act.slice(7))); eq(ids.length, 23, 'presets:"all" renders 23 chips');
  const bad = [];
  for (const id of ids) {
    await openAt('pa'); await q.evaluate(id => document.querySelector('.izi-container:not([hidden]) [data-act="preset:' + id + '"]').scrollIntoView({ inline: 'center', block: 'nearest' }), id); await sleep(80);
    await (await q.$(R + ' [data-act="preset:' + id + '"]')).click(); await sleep(60);
    const v = await q.$eval('#pa', e => e.value); if (!v || (await q.$(R))) bad.push(id); await q.evaluate(() => pk.pa.clear({ silent: true }));
  }
  ok(bad.length === 0, 'a real click on EVERY chip selects a range and closes the picker (failed: ' + bad.join(',') + ')');
  await openAt('pb'); const flags = await q.$$eval(R + ' .izi-chip', n => Object.fromEntries(n.map(c => [c.dataset.act.slice(7), c.getAttribute('aria-disabled') === 'true'])));
  eq(JSON.stringify(flags), JSON.stringify({ today: true, last7: false, last30: true, thisMonth: true, lastMonth: true }), 'min 2 / max 14: only chips that violate the limits are disabled');
  await q.click(R + ' [data-act="preset:last30"]'); await sleep(60); ok((await q.$eval('#pb', e => e.value)) === '' && !!(await q.$(R)), 'clicking a disabled chip is a no-op and keeps the picker open');
  ok((await q.$eval(R + ' .izi-chip[aria-disabled="true"]', e => e.title)).length > 3, 'a disabled chip explains itself in its tooltip');
  await q.click(R + ' [data-act="preset:last7"]'); await sleep(60); ok((await q.$eval('#pb', e => e.value)).includes(' - '), 'the usable chip still works');
  const bar = () => q.evaluate(() => { const s = document.querySelector('.izi-container:not([hidden]) .izi-presets'); return { sl: Math.round(s.scrollLeft), max: s.scrollWidth - s.clientWidth, more: s.parentNode.dataset.more || '' }; });
  const drag = async dx => { const r = await q.$eval(R + ' .izi-presets', e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await q.mouse.move(r.x, r.y); await q.mouse.down(); for (let i = 1; i <= 10; i++) await q.mouse.move(r.x + dx * i / 10, r.y); await q.mouse.up(); await sleep(200); return r; };
  for (const [label, id, sign] of [['RTL', 'pa', 1], ['LTR', 'pd', -1]]) {
    await openAt(id); let b0 = await bar(); ok(b0.sl === 0 && b0.max > 100, `${label}: bar overflows and opens at the first chip`); ok(b0.more.length > 0, `${label}: edge-fade flag set when more chips exist`);
    await drag(220 * sign); let b1 = await bar(); ok(Math.abs(b1.sl) >= 200, `${label}: mouse drag scrolls the bar (${b0.sl} -> ${b1.sl})`); ok((await q.$eval('#' + id, e => e.value)) === '' && !!(await q.$(R)), `${label}: a drag does not click the chip under the pointer`);
    await drag(-220 * sign); ok(Math.abs((await bar()).sl) < 5, `${label}: dragging back returns to the start`);
    const c = await q.$eval(R + ' .izi-presets', e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await q.mouse.move(c.x, c.y); await q.mouse.wheel({ deltaY: 250 }); await sleep(250); ok(Math.abs((await bar()).sl) >= 200, `${label}: vertical wheel scrolls the bar horizontally`);
    await q.mouse.wheel({ deltaY: -250 }); await sleep(250);
    await q.click(R + ' [data-act="pscroll:' + (id === 'pa' ? '-1' : '1') + '"]'); await sleep(550); ok(Math.abs((await bar()).sl) > 100, `${label}: arrow button scrolls`);
    await q.keyboard.press('Escape'); await openAt(id); ok(Math.abs((await bar()).sl) < 5, `${label}: reopening resets the bar`);
  }
  await openAt('pa'); await q.focus(R + ' .izi-chip'); await q.keyboard.press('ArrowLeft'); eq(await q.evaluate(() => document.activeElement.dataset.act), 'preset:yesterday', 'RTL: ArrowLeft moves focus to the next chip');
  await openAt('pc'); const wrap = await q.$eval(R + ' .izi-presets', e => ({ over: e.scrollWidth - e.clientWidth, nav: getComputedStyle(e.parentNode.querySelector('.izi-presets-nav')).display, kids: e.children.length })); ok(wrap.over === 0 && wrap.nav === 'none' && wrap.kids === 23, 'wrap layout: all chips visible, no arrows');
  await q.close();
}

console.log('# sizes');
{
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl']; const exp = { xs: 260, sm: 300, md: 340, lg: 400, xl: 480 };
  const body = sizes.map(z => `<div class="cell"><input id="s_${z}" style="display:none"></div><div class="cell"><input id="r_${z}" style="display:none"></div>`).join('') + '<div id="fl" style="width:560px"><input id="fi" style="display:none"></div><input id="w4" style="display:none">';
  const init = `const P=iZiDatePicker;window.pk=[];for(const z of ${JSON.stringify(sizes)}){pk.push(new P('#s_'+z,{inline:true,size:z,value:'1405/07/15'}));pk.push(new P('#r_'+z,{inline:true,size:z,mode:'range',presets:'default',timePicker:true,timeFormat:'12h',showWeekNumbers:true,secondaryCalendar:'gregorian',value:'1405/07/15'}));}pk.push(new P('#fi',{inline:true,size:'fluid'}));pk.push(new P('#w4',{inline:true,width:420}));`;
  const q = await browser.newPage(); q.on('pageerror', e => errors.push(e.message)); await q.setViewport({ width: 1600, height: 1000 }); await q.setContent(page(body, init)); await sleep(200);
  const m = await q.evaluate(() => [...document.querySelectorAll('.izi-container')].map(r => { const b = r.getBoundingClientRect(); let over = 0; for (const e of r.querySelectorAll('*')) { if (e.closest('.izi-presets') && !e.classList.contains('izi-presets')) continue; const x = e.getBoundingClientRect(); if (x.width && (x.right > b.right + 1 || x.left < b.left - 1)) over++; } return { w: Math.round(b.width), cell: r.querySelector('.izi-day-cell').getBoundingClientRect().width, font: parseFloat(getComputedStyle(r).fontSize), over, hs: r.scrollWidth > r.clientWidth + 1 }; }));
  sizes.forEach((z, i) => { const a = m[i * 2], r = m[i * 2 + 1]; near(a.w, exp[z], 1, `size ${z}: popup is ${exp[z]}px wide`); ok(!a.over && !a.hs, `size ${z}: nothing overflows`); ok(!r.over && !r.hs, `size ${z}: range + presets + 12h time + week numbers + secondary labels fit`); });
  ok(sizes.every((z, i) => i === 0 || m[i * 2].cell > m[(i - 1) * 2].cell) && sizes.every((z, i) => i === 0 || m[i * 2].font > m[(i - 1) * 2].font), 'cells and fonts grow monotonically with the size');
  near(m[10].w, 560, 2, 'size fluid fills its container'); near(m[11].w, 420, 1, 'width:420 option');
  await q.close();
}

console.log('# styling options (real rendering + axe)');
{
  const V = [['accent rose', "{accent:'rose'}"], ['ocean circle', "{accent:'ocean',cellShape:'circle'}"], ['violet dark', "{accent:'violet',theme:'dark'}"], ['emerald compact square', "{accent:'emerald',density:'compact',cellShape:'square',radius:'none'}"], ['amber comfortable xl', "{accent:'amber',density:'comfortable',shadow:'lg',radius:'xl'}"], ['slate dark circle', "{accent:'slate',theme:'dark',cellShape:'circle'}"], ['no outside days / no weekdays', "{showOutsideDays:false,showWeekdays:false}"], ['long weekdays no highlights', "{weekdayFormat:'long',highlightWeekend:false,highlightHolidays:false,highlightToday:false}"], ['custom colours', "{colors:{primary:'#7c2d12',background:'#fff7ed',surface:'#ffedd5',text:'#431407',border:'#fdba74',weekend:'#9a3412',weekendBg:'#ffedd5'}}"], ['range presets rose dark', "{mode:'range',presets:'default',accent:'rose',theme:'dark',value:null}"], ['en ocean', "{locale:'en',accent:'ocean'}"], ['font 20 serif', "{fontSize:20,fontFamily:'Georgia, serif',width:460}"]];
  const body = V.map((v, i) => `<input id="v${i}" style="display:none">`).join('');
  const init = `const P=iZiDatePicker;window.pk=[${V.map((v, i) => `new P('#v${i}',{inline:true,value:'1405/07/15',...${v[1]}})`).join(',')}];`;
  const q = await browser.newPage(); q.on('pageerror', e => errors.push(e.message)); await q.setViewport({ width: 1600, height: 1200 }); await q.setContent(page(body, init)); await sleep(200);
  const cols = await q.evaluate(() => { const bg = i => getComputedStyle(document.querySelectorAll('.izi-container')[i].querySelector('.izi-selected-start')).backgroundImage; return [bg(0), bg(1), bg(2)]; });
  ok(new Set(cols).size === 3, 'different accents produce different selected-cell colours');
  const shape = await q.evaluate(() => [1, 3].map(i => getComputedStyle(document.querySelectorAll('.izi-container')[i].querySelector('.izi-day-cell:not(.izi-faded)')).borderTopLeftRadius));
  ok(shape[0].includes('%') || parseFloat(shape[0]) > 15, 'cellShape circle gives round cells (' + shape[0] + ')'); ok(parseFloat(shape[1]) === 0, 'cellShape square + radius none gives sharp cells (' + shape[1] + ')');
  const gap = await q.evaluate(() => [3, 4].map(i => document.querySelectorAll('.izi-container')[i].querySelector('.izi-day-cell').getBoundingClientRect().height));
  ok(gap[0] < gap[1], 'compact cells are shorter than comfortable ones (' + Math.round(gap[0]) + ' < ' + Math.round(gap[1]) + ')');
  const blank = await q.evaluate(() => { const r = document.querySelectorAll('.izi-container')[6]; return { vis: getComputedStyle(r.querySelector('.izi-day-cell.izi-empty')).visibility, hiddenRows: [...r.querySelectorAll('.izi-week')].filter(x => x.hidden).length, header: getComputedStyle(r.querySelector('.izi-weekdays')).display }; });
  ok(blank.vis === 'hidden' && blank.header === 'none', 'showOutsideDays:false / showWeekdays:false actually hide them');
  const hl = await q.evaluate(() => { const r = document.querySelectorAll('.izi-container')[7]; const w = r.querySelector('.izi-weekend-cell:not(.izi-faded)'); return getComputedStyle(w).backgroundColor; }); ok(hl === 'rgba(0, 0, 0, 0)', 'highlightWeekend:false removes the weekend tint');
  const font = await q.evaluate(() => { const r = document.querySelectorAll('.izi-container')[11]; return [getComputedStyle(r).fontFamily.includes('Georgia'), r.getBoundingClientRect().width]; }); ok(font[0] && Math.abs(font[1] - 460) < 1, 'fontFamily + width apply');
  if (axeSrc) { await q.evaluate(axeSrc); const res = await q.evaluate(async () => { const o = []; for (const [i, el] of [...document.querySelectorAll('.izi-container')].entries()) { const r = await axe.run(el, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }); o.push(r.violations.map(v => v.id + ' x' + v.nodes.length).join(',')); } return o; }); V.forEach((v, i) => ok(res[i] === '', `axe [${v[0]}]: ${res[i]}`)); }
  await q.close();
}


console.log('# v5.3: several months, drag selection, holiday list, time modes, compare, Gregorian');
{
  const rawJson = fs.readFileSync(path.join(root, 'tests', '1405.json'), 'utf8');
  let locJs = fs.readFileSync(path.join(root, 'izi-datepicker.locales.js'), 'utf8'); locJs = locJs.replace(/if \(typeof module === 'object' && module.exports\) module.exports = factory\(require\('\.\/izi-datepicker\.js'\)\);\s*else factory\(root\.iZiDatePicker\);/, 'factory(root.iZiDatePicker);');
  const pre = `const RAW=${rawJson};${locJs};const P=iZiDatePicker;`;
  const mkp = async (w, h, body, init, mobile) => { const q = await browser.newPage(); q.on('pageerror', e => errors.push(e.message)); await q.setViewport({ width: w, height: h, isMobile: !!mobile, hasTouch: !!mobile }); await q.setContent(page(body, pre + init)); await sleep(150); return q; };
  const RR = '.izi-container:not([hidden]):not(.inline)';
  const rect = (q, sel) => q.$eval(sel, e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });

  // --- several months + responsive wrap
  for (const [vw, label, mobile] of [[1300, 'desktop', false], [560, 'narrow window', false], [390, 'phone (sheet)', true]]) {
    const q = await mkp(vw, 900, '<input id="m2">', "window.pk={m2:new P('#m2',{mode:'range',months:2})};", mobile);
    mobile ? await q.tap('#m2') : await q.click('#m2'); await sleep(300);
    const m = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'), b = e.getBoundingClientRect(), t = [...e.querySelectorAll('.izi-days-grid')].map(x => Math.round(x.getBoundingClientRect().top)); return { w: b.width, l: b.left, r: b.right, same: t[0] === t[1], n: t.length, hs: e.scrollWidth > e.clientWidth + 1 }; });
    ok(m.n === 2 && m.r <= vw + 1 && m.l >= -1 && !m.hs, `months:2 fits on ${label} (${Math.round(m.w)}px)`); ok(label === 'desktop' ? m.same && Math.abs(m.w - 680) < 2 : !m.same, `months:2 ${label}: ${label === 'desktop' ? 'two columns, 2 x 340' : 'months wrap under each other'}`); await q.close();
  }
  // --- a popup that grows while open is re-positioned (it used to overflow the viewport)
  {
    const q = await mkp(1300, 900, '<input id="m">', "window.pk={m:new P('#m',{mode:'range'})};"); await q.click('#m'); await sleep(200);
    await q.evaluate(() => pk.m.setOptions({ months: 3 })); await sleep(200); const bx = await q.evaluate(() => { const b = pk.m.view.root.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; });
    ok(bx.w > 1000 && bx.l >= -1 && bx.r <= 1301, `growing an open popup via setOptions (${Math.round(bx.w)}px) keeps it inside the viewport (${Math.round(bx.l)}..${Math.round(bx.r)})`);
    await q.evaluate(() => pk.m.setOptions({ months: 1, compare: true })); await sleep(150); const b2 = await q.evaluate(() => { const b = pk.m.view.root.getBoundingClientRect(); return { t: b.top, b: b.bottom }; }); ok(b2.t >= -1 && b2.b <= 901, 'adding the compare row (taller popup) keeps it inside the viewport vertically');
    await q.close();
  }
  // --- drag selection with the real mouse across two months
  {
    const q = await mkp(1300, 900, '<input id="r">', "window.pk={r:new P('#r',{mode:'range',months:2})};"); await q.click('#r'); await sleep(250);
    const vm = await q.evaluate(() => pk.r.model.view); const key = (d, off = 0) => { const i = vm.jy * 12 + vm.jm - 1 + off; return Math.floor(i / 12) * 10000 + (i % 12 + 1) * 100 + d; };
    const pos = k => q.evaluate(k => { const c = document.querySelector('.izi-container:not([hidden]) .izi-day-cell[data-key="' + k + '"]').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; }, k);
    const a = await pos(key(10)), z = await pos(key(6, 1)); await q.mouse.move(a.x, a.y); await q.mouse.down(); let preview = 0; for (let i = 1; i <= 12; i++) { await q.mouse.move(a.x + (z.x - a.x) * i / 12, a.y + (z.y - a.y) * i / 12); if (i === 7) preview = (await q.$$(RR + ' .izi-range-preview')).length; } await q.mouse.up(); await sleep(250);
    const v = await q.$eval('#r', e => e.value), ex = [key(10), key(6, 1)].map(k => `${String(k).slice(0, 4)}/${String(k).slice(4, 6)}/${String(k).slice(6)}`).join(' - '); eq(v, ex, 'mouse drag from one month into the next selects the range'); ok(preview > 0, 'a live preview band is drawn while dragging (' + preview + ' cells)'); ok(!(await q.$(RR)), 'picker closes after the drag completes');
    await q.click('#r'); await sleep(250); const c1 = await pos(key(3)), c2 = await pos(key(5)); await q.mouse.click(c1.x, c1.y); await q.mouse.click(c2.x, c2.y); await sleep(200); const fm = k => `${String(k).slice(0, 4)}/${String(k).slice(4, 6)}/${String(k).slice(6)}`; eq(await q.$eval('#r', e => e.value), fm(key(3)) + ' - ' + fm(key(5)), 'click-click still works right after a drag (no swallowed clicks)');
    await q.click('#r'); await sleep(250); const f = await pos(key(8)); await q.mouse.move(f.x, f.y); await q.mouse.down(); await q.mouse.move(f.x + 70, f.y, { steps: 4 }); await q.mouse.move(4, 4, { steps: 5 }); await q.mouse.up(); await sleep(200); ok(!!(await q.$(RR)), 'releasing the drag outside any day cancels it (picker stays open)'); await q.close();
  }
  // --- holiday list
  {
    const q = await mkp(1300, 900, '<input id="h"><input id="g">', "window.pk={h:new P('#h',{holidayList:true,holidays:{data:{1405:RAW}},value:'1405/04/04'}),g:new P('#g',{calendar:'gregorian',locale:'en',holidayList:{position:'bottom'},holidays:{fixed:[{m:12,d:25,title:'Christmas Day'}]},value:'2026-12-25'})};");
    await q.click('#h'); await sleep(300); const h = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'), b = e.getBoundingClientRect(), l = e.querySelector('.izi-hlist').getBoundingClientRect(), m = e.querySelector('.izi-main').getBoundingClientRect(); return { w: b.width, r: b.right, items: e.querySelectorAll('.izi-hl-item').length, side: l.left >= m.right - 1 || l.right <= m.left + 1, hs: e.scrollWidth > e.clientWidth + 1 }; });
    ok(h.items >= 3 && h.side && h.r <= 1301 && !h.hs, `side panel beside the calendar with ${h.items} holidays`); ok(await q.evaluate(async () => (await pk.h.downloadHolidays({ year: 1405, format: 'ics' })) === true), 'downloadHolidays creates a real Blob download'); await q.keyboard.press('Escape');
    await q.click('#g'); await sleep(250); const g = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'), l = e.querySelector('.izi-hlist').getBoundingClientRect(), m = e.querySelector('.izi-days-grid').getBoundingClientRect(); return { below: l.top >= m.bottom - 1, items: e.querySelectorAll('.izi-hl-item').length }; }); ok(g.below && g.items === 1, 'bottom panel below the grid (Gregorian, English): Christmas Day listed'); await q.close();
  }
  // --- holiday list: a click is VISIBLE and navigates; the panel never grows the popup
  {
    const q = await mkp(1300, 900, '<input id="v"><input id="y">', "window.pk={v:new P('#v',{holidayList:true,holidays:{data:{1405:RAW}},value:'1405/04/04'}),y:new P('#y',{holidayList:{listScope:'year'},holidays:{data:{1405:RAW}}})};");
    const RP = '.izi-container:not([hidden]):not(.inline)', outline = k => q.evaluate(k => { const c = document.querySelector('.izi-container:not([hidden]) .izi-day-cell[data-key="' + k + '"]'); const t = getComputedStyle(c); return { cls: c.className, style: t.outlineStyle, w: t.outlineWidth }; }, k);
    await q.click('#v'); await sleep(300); const it = (await q.$$(RP + ' .izi-hl-item'))[3]; const key = await it.evaluate(e => +e.dataset.hlKey);
    await it.hover(); await sleep(120); let o = await outline(key); ok(/izi-peek/.test(o.cls) && o.style === 'dashed', 'hovering a list item draws a dashed outline around its day'); 
    await it.click(); await sleep(250); o = await outline(key); ok(/izi-located/.test(o.cls) && o.style === 'solid' && parseFloat(o.w) >= 3, `clicking a list item gives the day a solid ${o.w} outline (it used to be an invisible focus)`);
    ok(/[\u0600-\u06ff]/.test(await q.$eval(RP + ' .izi-live', e => e.textContent)), 'and announces it for screen readers'); await q.keyboard.press('Escape'); await sleep(100);
    await q.click('#y'); await sleep(300); await q.evaluate(() => pk.y.goTo(1405, 1)); await sleep(150);
    const geo = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden]):not(.inline)'), l = e.querySelector('.izi-hl-list'), mn = e.querySelector('.izi-main'); return { pop: e.getBoundingClientRect().height, main: mn.getBoundingClientRect().height, scrolls: l.scrollHeight > l.clientHeight + 20, vh: innerHeight, items: e.querySelectorAll('.izi-hl-item').length, heads: e.querySelectorAll('.izi-hl-month').length }; });
    ok(geo.items > 50 && geo.heads >= 10 && geo.pop <= geo.vh && Math.abs(geo.pop - geo.main) < 4 && geo.scrolls, `year-scope list (${geo.items} items, ${geo.heads} month headings) stays as tall as the calendar (${Math.round(geo.pop)}px) and scrolls inside`);
    const far = await q.evaluate(() => { const x = [...document.querySelectorAll('.izi-container:not([hidden]) .izi-hl-item')].find(e => Math.floor(+e.dataset.hlKey / 100) % 100 === 8); x.scrollIntoView({ block: 'center' }); return +x.dataset.hlKey; }); await sleep(80);
    await (await q.$(`${RP} .izi-hl-item[data-hl-key="${far}"]`)).click(); await sleep(300);
    const nav = await q.evaluate(k => { const e = document.querySelector('.izi-container:not([hidden]):not(.inline)'); return { month: e.querySelector('.izi-month-select').value, located: !!e.querySelector(`.izi-day-cell[data-key="${k}"].izi-located`) }; }, far);
    eq([nav.month, nav.located], ['8', true], 'clicking a holiday of another month navigates there and marks the day'); await q.close();
  }
  // --- time-only / slots / compare / Gregorian locales
  {
    const body = ['t', 's', 'c', 'en', 'de', 'ar'].map(id => `<input id="${id}">`).join('');
    const init = "window.pk={t:new P('#t',{mode:'time',timeFormat:'24h'}),s:new P('#s',{timeSlots:{step:30,duration:30,min:'09:00',max:'18:00'},timeFormat:'24h',digits:'latn'}),c:new P('#c',{mode:'range',compare:true,digits:'latn'}),en:new P('#en',{calendar:'gregorian',locale:'en'}),de:new P('#de',{calendar:'gregorian',locale:'de',showWeekNumbers:true,value:'2026-01-15'}),ar:new P('#ar',{calendar:'gregorian',locale:'ar',value:'2026-05-28'})};";
    const q = await mkp(1100, 900, body, init);
    await q.click('#t'); await sleep(200); const t = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'); return { w: e.getBoundingClientRect().width, grid: !!e.querySelector('.izi-days-grid'), sel: e.querySelectorAll('.izi-time-select').length }; }); ok(t.w < 340 && !t.grid && t.sel === 2, `time-only popup is compact (${Math.round(t.w)}px), no calendar`);
    await q.select(R_T('hour'), '14'); await q.select(R_T('minute'), '45'); await q.click(RR + ' [data-action="confirm"]'); await sleep(150); eq(await q.$eval('#t', e => e.value), '14:45', 'real selects + Confirm -> "14:45"'); await q.keyboard.press('Escape');
    await q.click('#s'); await sleep(200); ok(await q.$$eval(RR + ' .izi-slot', n => n.length === 18 && n.every(b => b.getAttribute('aria-disabled') === 'true')), '18 slots, all disabled until a date is chosen');
    const cell = await q.$(RR + ' .izi-day-cell:not(.izi-faded):not(.izi-disabled)'); await cell.click(); await sleep(100); await q.click(RR + ' .izi-slot:nth-child(4)'); await q.click(RR + ' [data-action="confirm"]'); await sleep(150); ok(/ 10:30 - 11:00$/.test(await q.$eval('#s', e => e.value)), 'real clicks: date, slot 4, Confirm -> "... 10:30 - 11:00"');
    await q.click('#c'); await sleep(200); const keys = await q.$$eval(RR + ' .izi-day-cell[data-key]:not(.izi-faded)', n => n.slice(9, 20).map(c => +c.dataset.key)); await (await q.$(RR + ` .izi-day-cell[data-key="${keys[0]}"]`)).click(); await (await q.$(RR + ` .izi-day-cell[data-key="${keys[3]}"]`)).click(); await q.click(RR + ' .izi-cmp-check'); await sleep(150);
    const cmp = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'), s = e.querySelector('.izi-cmp-start'), b = e.querySelector('.izi-cmp-between'); return { start: !!s, between: !!b, dashed: s ? getComputedStyle(s).borderTopStyle : '', mainStyle: getComputedStyle(e.querySelector('.izi-selected-start')).borderTopStyle }; }); ok(cmp.start && cmp.dashed === 'dashed' && cmp.mainStyle !== 'dashed', 'comparison range is drawn with a dashed amber outline, distinct from the main range');
    await q.click(RR + ' [data-action="confirm"]'); await sleep(150); ok(/ - .* vs .* - /.test(await q.$eval('#c', e => e.value)), 'Confirm writes "range vs comparison"');
    await q.click('#en'); await sleep(200); const en = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'); return { dir: getComputedStyle(e).direction, first: e.querySelector('.izi-weekday').textContent, month: e.querySelector('.izi-month-select').selectedOptions[0].textContent }; }); eq([en.dir, en.first], ['ltr', 'S'], 'Gregorian/en: LTR, Sunday first'); await q.keyboard.press('Escape');
    await q.click('#de'); await sleep(200); const de = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'); return { first: e.querySelector('.izi-weekday:not(.izi-weekno-head)').title, wk: [...e.querySelectorAll('.izi-weekno')].map(x => x.textContent), month: e.querySelector('.izi-month-select').selectedOptions[0].textContent }; }); eq([de.first, de.month, de.wk.slice(0, 4)], ['Montag', 'Januar', ['1', '2', '3', '4']], 'Gregorian/de: Monday first, German month, ISO week numbers (Jan 2026 starts in week 1)'); await q.keyboard.press('Escape');
    await q.click('#ar'); await sleep(200); const ar = await q.evaluate(() => { const e = document.querySelector('.izi-container:not([hidden])'), b = e.getBoundingClientRect(), i = document.getElementById('ar').getBoundingClientRect(); return { dir: getComputedStyle(e).direction, align: Math.abs(b.right - i.right), month: e.querySelector('.izi-month-select').selectedOptions[0].textContent }; }); ok(ar.dir === 'rtl' && ar.align <= 1 && /[\u0600-\u06ff]/.test(ar.month), 'Gregorian/ar: RTL, right edge aligned with the input, Arabic month names'); await q.close();
  }
  // --- axe over the new UIs
  if (axeSrc) {
    const V = [["{timeSlots:{step:30,duration:30,min:'09:00',max:'18:00',disabled:(d,t)=>t==='11:00'},timeFormat:'24h',value:'1405/07/15 10:30'}", 'slots'], ["{mode:'time',value:'09:30'}", 'time-only'], ["{mode:'timerange',timeFormat:'24h',theme:'dark',value:['09:00','17:30']}", 'time range dark'], ["{mode:'range',compare:{enabled:true},value:['1405/07/10','1405/07/16'],holidays:{data:{1405:RAW}}}", 'compare'], ["{mode:'range',compare:{enabled:true,mode:'custom'},theme:'dark',value:'1405/07/10 - 1405/07/16 vs 1405/06/01 - 1405/06/05'}", 'compare custom dark'], ["{calendar:'gregorian',locale:'en',mode:'range',value:['2026-05-10','2026-05-20']}", 'gregorian en'], ["{calendar:'gregorian',locale:'de',value:'2026-05-28',showWeekNumbers:true}", 'gregorian de weeknums'], ["{calendar:'gregorian',locale:'ar',value:'2026-05-28'}", 'gregorian ar'], ["{calendar:'gregorian',locale:'ja',value:'2026-05-28'}", 'gregorian ja'], ["{months:2,mode:'range',holidayList:true,holidays:{data:{1405:RAW}},size:'sm',value:['1405/07/10','1405/08/05']}", 'two months + list'], ["{calendar:'gregorian',locale:'en',holidayList:{position:'bottom'},holidays:{fixed:[{m:12,d:25,title:'Christmas Day'}]},value:'2026-12-25'}", 'list bottom'], ["{calendar:'gregorian',locale:'en',timeSlots:{step:60,duration:60},timeFormat:'12h',value:'2026-05-28 10:00'}", 'slots en 12h']];
    const q = await mkp(1700, 1000, V.map((v, i) => `<input id="i${i}" style="display:none">`).join(''), 'window.pks=[' + V.map((v, i) => `new P('#i${i}',{inline:true,...${v[0]}})`).join(',') + '];'); await q.evaluate(axeSrc);
    const res = await q.evaluate(async () => { const o = []; for (const el of document.querySelectorAll('.izi-container')) { const r = await axe.run(el, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }); o.push(r.violations.map(v => v.id + ' x' + v.nodes.length).join(',')); } return o; });
    V.forEach((v, i) => ok(res[i] === '', `axe [${v[1]}]: ${res[i]}`)); await q.close();
  }
}
function R_T(f) { return '.izi-container:not([hidden]) .izi-' + f + '-select'; }

ok(errors.length === 0, 'no console / page errors: ' + errors.join(' | '));
await browser.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
