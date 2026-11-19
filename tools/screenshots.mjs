#!/usr/bin/env node
/**
 * Regenerates the README / docs pictures from the REAL library (no mock-ups):  node tools/screenshots.mjs
 * Needs puppeteer (devDependency) - or puppeteer-core + @sparticuz/chromium. Output: assets/screenshots/*.png
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = rd('izi-datepicker.js'), css = rd('izi-datepicker.css'), data1405 = rd('tests/1405.json');
const loc = rd('izi-datepicker.locales.js').replace(/if \(typeof module === 'object' && module\.exports\) module\.exports = factory\(require\('\.\/izi-datepicker\.js'\)\);\s*else factory\(root\.iZiDatePicker\);/, 'factory(root.iZiDatePicker);');
const out = path.join(root, 'assets', 'screenshots'); fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function launch() {
  try { const p = (await import('puppeteer')).default; return await p.launch({ headless: 'new', args: ['--no-sandbox'] }); }
  catch { const p = (await import('puppeteer-core')).default, c = (await import('@sparticuz/chromium')).default; return p.launch({ args: [...c.args, '--no-sandbox'], executablePath: await c.executablePath(), headless: 'shell' }); }
}
const pageHtml = (body, init, bg, extraCss = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
html,body{margin:0}body{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}
#stage{display:inline-flex;gap:28px;padding:28px;align-items:flex-start;background:${bg}}
.cap{font:600 13px system-ui,Tahoma,sans-serif;color:#475569;margin:0 0 8px;text-align:center}.col{display:flex;flex-direction:column;align-items:center}
${extraCss}</style></head><body>${body}<script>${js}</script><script>${loc}</script><script>const RAW=${data1405};const P=iZiDatePicker;${init}</script></body></html>`;
const browser = await launch();
async function shot(name, { body, init, bg = '#eef2f7', w = 900, h = 900, dpr = 1.5, extraCss = '', mobile = false, sel = '#stage' }) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await p.setContent(pageHtml(body, init, bg, extraCss)); await sleep(400);
  const el = await p.$(sel); await el.screenshot({ path: path.join(out, name + '.png') });
  console.log('✓', name); await p.close();
}
const inp = id => `<input id="${id}" style="display:none">`;
const H = { data: { 1405: 'RAW' } };
// 1. Jalali, single, holidays highlighted
await shot('jalali', { w: 480, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,value:'1405/07/15',holidays:{data:{1405:RAW}}});` });
// 2. range + quick ranges
await shot('range-presets', { w: 480, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,mode:'range',presets:'default',value:['1405/07/10','1405/07/16'],holidays:{data:{1405:RAW}}});` });
// 3. dark
await shot('dark', { w: 480, bg: '#0b1220', body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,theme:'dark',mode:'range',value:['1405/07/10','1405/07/16'],holidays:{data:{1405:RAW}}});` });
// 4. two months
await shot('two-months', { w: 900, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,months:2,mode:'range',value:['1405/07/20','1405/08/08'],holidays:{data:{1405:RAW}}});` });
// 5. holiday list
await shot('holiday-list', { w: 900, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,holidayList:true,value:'1405/04/04',holidays:{data:{1405:RAW}}});` });
// 6. Gregorian in several languages
await shot('languages', { w: 1500, body: `<div id="stage">${['en', 'de', 'ar', 'ja'].map(l => `<div class="col"><p class="cap">locale: '${l}'</p>${inp('i' + l)}</div>`).join('')}</div>`,
  init: `['en','de','ar','ja'].forEach(l=>new P('#i'+l,{inline:true,calendar:'gregorian',locale:l,value:'2026-05-28',size:'sm',showWeekNumbers:l==='de',holidays:{fixed:[{m:5,d:25,title:'Memorial Day'},{m:5,d:14,title:'Ascension'}]}}));` });
// 7. booking slots
await shot('time-slots', { w: 480, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,calendar:'gregorian',locale:'en',timeFormat:'24h',timeSlots:{step:30,duration:30,min:'09:00',max:'17:00',disabled:(d,t)=>['10:00','11:30','14:00'].includes(t)},value:'2026-06-03 10:30',confirm:false});` });
// 8. compare
await shot('compare', { w: 480, body: `<div id="stage">${inp('a')}</div>`, init: `new P('#a',{inline:true,mode:'range',compare:{enabled:true,mode:'previousPeriod'},value:['1405/07/10','1405/07/16']});` });
// 9. time only + time range
await shot('time-only', { w: 700, body: `<div id="stage"><div class="col"><p class="cap">mode: 'time'</p>${inp('a')}</div><div class="col"><p class="cap">mode: 'timerange'</p>${inp('b')}</div></div>`, init: `new P('#a',{inline:true,mode:'time',timeFormat:'24h',value:'14:30'});new P('#b',{inline:true,mode:'timerange',timeFormat:'24h',value:['09:00','17:30']});` });
// 10. accent themes
await shot('themes', { w: 1500, body: `<div id="stage">${['blue', 'rose', 'emerald', 'violet', 'amber'].map(a => `<div class="col"><p class="cap">accent: '${a}'</p>${inp('i' + a)}</div>`).join('')}</div>`,
  init: `['blue','rose','emerald','violet','amber'].forEach(a=>new P('#i'+a,{inline:true,calendar:'gregorian',locale:'en',accent:a,size:'xs',mode:'range',value:['2026-05-08','2026-05-14'],highlightHolidays:false}));` });
// 11. phone bottom sheet
{
  const p = await browser.newPage(); await p.setViewport({ width: 390, height: 820, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.setContent(pageHtml(`<input id="a" placeholder="تاریخ را انتخاب کنید" style="width:90%;margin:24px 5%;padding:12px;font-size:16px;box-sizing:border-box">`, `window.pk=new P('#a',{mode:'range',presets:'default',holidays:{data:{1405:RAW}}});`, '#e2e8f0'));
  await sleep(300); await p.tap('#a'); await sleep(500); await p.screenshot({ path: path.join(out, 'mobile.png') }); console.log('✓ mobile'); await p.close();
}

// ---- hero (top of the README) and the 1280x640 GitHub "social preview" image
const logoSvg = rd('assets/logo.svg').replace('<svg ', '<svg width="100%" height="100%" ');
const brandCss = `body{margin:0}.hero{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;color:#fff;background:radial-gradient(1200px 500px at 85% -10%,rgba(6,182,212,.55),transparent 60%),linear-gradient(135deg,#1e1b4b 0%,#4338ca 48%,#0891b2 100%);box-sizing:border-box}
.hero h1{margin:0;font-size:58px;font-weight:800;letter-spacing:-1.5px;line-height:1}.hero .lg{width:92px;height:92px;flex:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.35))}
.chips{display:flex;flex-wrap:wrap;gap:10px}.chips span{padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-weight:600;font-size:15px;backdrop-filter:blur(4px)}`;
{
  const p = await browser.newPage(); await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.25 });
  await p.setContent(pageHtml(`<div id="hero" class="hero" style="width:1600px;padding:54px 64px 60px">
    <div style="display:flex;align-items:center;gap:24px"><div class="lg">${logoSvg}</div><div><h1>iZiDatePicker</h1>
    <div style="font-size:23px;margin-top:10px;opacity:.95">Easy dates for the Persian (Jalali) &amp; Gregorian calendars</div><div dir="rtl" style="font-size:21px;margin-top:6px;opacity:.9">تقویم ساده برای تاریخ شمسی و میلادی</div></div></div>
    <div style="display:flex;gap:30px;margin-top:40px;justify-content:center;align-items:flex-start">${inp('a')}${inp('b')}${inp('c')}</div>
    <div class="chips" style="margin-top:38px;justify-content:center"><span>⚡ Zero dependencies</span><span>↔️ RTL-first</span><span>♿ Accessible</span><span>🎉 Holidays</span><span>🗓️ Quick ranges</span><span>⏰ Time slots</span><span>🆚 Compare ranges</span><span>📱 Mobile sheet</span></div></div>`,
    `new P('#a',{inline:true,mode:'range',presets:'default',value:['1405/07/10','1405/07/16'],holidays:{data:{1405:RAW}}});
     new P('#b',{inline:true,calendar:'gregorian',locale:'en',theme:'dark',accent:'violet',mode:'range',value:['2026-05-08','2026-05-14'],holidays:{fixed:[{m:5,d:25,title:'Memorial Day'}]}});
     new P('#c',{inline:true,calendar:'gregorian',locale:'de',timeFormat:'24h',confirm:false,timeSlots:{step:30,duration:30,min:'09:00',max:'17:00',disabled:(d,t)=>['10:00','11:30','14:00'].includes(t)},value:'2026-06-03 10:30'});`, '#0f172a', brandCss));
  await sleep(500); await (await p.$('#hero')).screenshot({ path: path.join(out, 'hero.png') }); console.log('✓ hero'); await p.close();
}
{
  const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });
  await p.setContent(pageHtml(`<div id="soc" class="hero" style="width:1280px;height:640px;padding:70px 80px;display:flex;align-items:center;justify-content:space-between">
    <div style="max-width:640px"><div style="display:flex;align-items:center;gap:22px"><div class="lg" style="width:104px;height:104px">${logoSvg}</div><h1 style="font-size:64px">iZiDatePicker</h1></div>
    <div style="font-size:30px;margin-top:28px;line-height:1.3;font-weight:600">Easy Persian &amp; Gregorian date picker</div><div dir="rtl" style="font-size:25px;margin-top:10px;opacity:.92;text-align:left">تقویم ساده برای تاریخ شمسی و میلادی</div>
    <div class="chips" style="margin-top:34px"><span>Zero deps</span><span>RTL-first</span><span>Accessible</span><span>Holidays</span><span>Time slots</span></div></div>
    <div style="transform:rotate(3deg) scale(.96);transform-origin:center">${inp('a')}</div></div>`,
    `new P('#a',{inline:true,mode:'range',presets:'default',size:'md',value:['1405/07/10','1405/07/16'],holidays:{data:{1405:RAW}}});`, '#0f172a', brandCss));
  await sleep(500); await (await p.$('#soc')).screenshot({ path: path.join(out, 'social-preview.png') }); console.log('✓ social-preview'); await p.close();
}
// ---- frames of a drag-select (assemble into assets/demo.gif with any tool, e.g. ffmpeg or Pillow)
{
  const frames = path.join(root, 'assets', '_frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const p = await browser.newPage(); await p.setViewport({ width: 760, height: 700, deviceScaleFactor: 1 });
  await p.setContent(pageHtml(`<div id="stage">${inp('a')}</div>`, `window.pk=new P('#a',{inline:true,months:2,mode:'range',presets:'default',holidays:{data:{1405:RAW}},value:null});pk.goTo(1405,7);`, '#eef2f7'));
  await sleep(400);
  const el = await p.$('#stage'), pos = k => p.evaluate(k => { const c = document.querySelector('.izi-day-cell[data-key="' + k + '"]').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; }, k);
  let n = 0; const snap = async (times = 1) => { for (let i = 0; i < times; i++) await el.screenshot({ path: path.join(frames, String(n++).padStart(3, '0') + '.png') }); };
  const a = await pos(14050712), z = await pos(14050806);
  await snap(6); await p.mouse.move(a.x - 30, a.y - 20); await p.mouse.move(a.x, a.y); await snap(2); await p.mouse.down(); await snap(2);
  for (let i = 1; i <= 16; i++) { await p.mouse.move(a.x + (z.x - a.x) * i / 16, a.y + (z.y - a.y) * i / 16); await sleep(20); await snap(1); }
  await p.mouse.up(); await sleep(200); await snap(14); await p.close(); console.log('✓ frames:', n);
}
await browser.close();
