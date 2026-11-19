// node tests/features.test.js — modes, presets, ranges, year grid, secondary labels, sheet, data pipeline output
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const w=new JSDOM('<body><input id=a><input id=b></body>',{runScripts:'outside-only',pretendToBeVisual:true}).window;w.eval(fs.readFileSync(path.join(__dirname,'../izi-datepicker.js'),'utf8'));const P=w.iZiDatePicker;
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL',m))};const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+' got '+JSON.stringify(a)+' exp '+JSON.stringify(b));
// presets
let p=new P('#a',{mode:'range',presets:'default',timeZone:'UTC'});p.open();
const t=p.model.today();
eq([...p.view.root.querySelectorAll('.izi-chip')].map(c=>c.textContent),['امروز','۷ روز گذشته','۳۰ روز گذشته','این ماه','ماه گذشته'],'preset chips (fa)');
p.view.root.querySelector('[data-act="preset:last7"]').click(); const r=p.getValue('object');
eq(w.iZiDatePicker.converter.toJDN(r.end.jy,r.end.jm,r.end.jd)-w.iZiDatePicker.converter.toJDN(r.start.jy,r.start.jm,r.start.jd),6,'last7 spans 7 days inclusive'); ok(!p.isOpen,'preset closes picker');
p.open(); ok(p.view.root.querySelector('.izi-chip-active').textContent==='۷ روز گذشته','active chip reflects value');
p.setValue(['1405/01/01','1405/01/31']); p.view.root.querySelector('[data-act="preset:thisMonth"]'); 
const pc=P.create({mode:'range',presets:[{id:'q',label:'فصل',range:()=>['1405/01/01','1405/03/31']}]}); pc.setValue(['1405/01/01','1405/03/31']); ok(pc._presetsVm()[0].active,'custom preset active'); eq(pc._presetsVm()[0].text,'فصل','custom label'); pc.destroy();
// min/max range
p.destroy(); p=new P('#a',{mode:'range',minRangeDays:3,maxRangeDays:7}); p.goTo(1405,2); p.select(14050210);
const cells=()=>Object.fromEntries(p.getMonthData().flat().map(c=>[c.key,c.disabled]));
let d=cells(); eq([d[14050210],d[14050211],d[14050212],d[14050216],d[14050217]],[true,true,false,false,true],'cells disabled by min/max length while start pending');
p.select(14050211); ok(p.model.pending,'too-short second click rejected'); p.select(14050214); eq(p.getValue('jalali'),{start:'1405/02/10',end:'1405/02/14'},'valid length accepted');
ok(!p.setValue(['1405/02/01','1405/02/20']),'setValue rejects over-long range');
// week mode
p.destroy(); p=new P('#a',{mode:'week'}); p.goTo(1405,2); p.select(14050213); eq(p.getValue('jalali'),{start:'1405/02/12',end:'1405/02/18'},'week = Sat..Fri containing Sunday 1405/02/13');
w.document.getElementById('a').value=''; const wk2=new P('#b',{mode:'week',value:'1405/03/07'}); eq(wk2.getValue('jalali'),{start:'1405/03/02',end:'1405/03/08'},'week mode accepts a single initial date and snaps it (Sat..Fri)'); w.document.getElementById('b').value='1405/03/20'; w.document.getElementById('b').dispatchEvent(new w.Event('change')); eq(wk2.getValue('jalali').start,'1405/03/16','typing one date in week mode snaps to its week'); wk2.destroy();
p.model.hover=14050220; const pv=p.getMonthData().flat().filter(c=>c.preview).map(c=>c.jd); eq(pv.length,7,'week hover previews 7 days');
p.destroy(); p=new P('#a',{mode:'week',firstDayOfWeek:'monday'}); p.select(14050213); eq(p.getValue('jalali').start,'1405/02/07','week start follows firstDayOfWeek (Monday)');
// multiple
p.destroy(); w.document.getElementById('a').value=''; p=new P('#a',{mode:'multiple',maxDates:3}); let ev=[]; p.on('select',e=>ev.push(e.values.length));
p.select(14050210);p.select(14050205);p.select(14050220);p.select(14050221); eq(p.getValue('jalali'),['1405/02/05','1405/02/10','1405/02/20'],'multiple sorted, max 3'); eq(ev,[1,2,3],'event per toggle (4th rejected)');
p.select(14050210); eq(p.getValue('jalali'),['1405/02/05','1405/02/20'],'toggle off'); eq(w.document.getElementById('a').value,'1405/02/05, 1405/02/20','input text joined');
const a=w.document.getElementById('a'); a.value='1405/03/01، ۱۴۰۵/۰۳/۰۲'; a.dispatchEvent(new w.Event('change')); eq(p.getValue('jalali'),['1405/03/01','1405/03/02'],'typed list (Persian comma + digits)');
ok(p.setValue(['1405/04/01']),'setValue array'); ok(!p.setValue(['1405/04/01','1405/04/02','1405/04/03','1405/04/04']),'setValue over maxDates rejected');
// month mode
p.destroy(); p=new P('#a',{mode:'month',value:'1405/03'}); eq(a.value,'1405/03','month format'); eq(p.getValue('jalali'),'1405/03/01','month value = day 1'); p.open();
eq(p.view.root.querySelectorAll('.izi-month-cell').length,12,'12 month cells'); eq([...p.view.root.querySelectorAll('.izi-month-cell')].slice(0,3).map(c=>c.textContent),['فروردین','اردیبهشت','خرداد'],'month names');
ok(p.view.root.querySelector('.izi-month-cell.izi-selected-start').textContent==='خرداد','selected month'); ok(!p.view.root.querySelector('.izi-month-select'),'no month select in month mode');
p.view.root.querySelector('[data-key="14050607"]')&&0; p.view.root.querySelectorAll('.izi-month-cell')[7].click(); eq(a.value,'1405/08','click month commits'); ok(!p.isOpen,'closes');
p.open({focus:true}); const k=x=>w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:x,bubbles:true})); k('ArrowLeft'); eq(+w.document.activeElement.dataset.key,14050901,'RTL month nav ← = next month'); k('PageUp'); eq(Math.floor(+w.document.activeElement.dataset.key/10000),1404,'PageUp = previous year');
p.destroy(); p=new P('#a',{mode:'month'}); p.open(); const y0=p.model.view.jy; p.next(); eq(p.model.view.jy,y0+1,'next() = next year in month mode');
a.value='خرداد ۱۴۰۵'; a.dispatchEvent(new w.Event('change')); eq(p.getValue('jalali'),'1405/03/01','typed month name + year');
// year grid
p.destroy(); p=new P('#a',{yearPicker:'grid',value:'1405/03/07'}); p.open(); ok(p.view.yb&&!p.view.ys,'year button replaces select'); eq(p.view.yb.textContent,'۱۴۰۵','year button text');
p.view.yb.click(); ok(!p.view.yp.hidden&&p.view.grid.hidden,'panel open, grid hidden'); eq(p.view.yb.getAttribute('aria-expanded'),'true','aria-expanded'); ok(w.document.activeElement.classList.contains('izi-year-cell'),'focus moves into year grid');
eq(p.view.yc.length,12,'12 year cells'); const sel=p.view.yp.querySelector('.izi-year-selected'); eq(sel.textContent,'۱۴۰۵','current year highlighted');
p.view.yb.click(); p.view.yb.click(); p.view.yp.querySelector('[data-act="ypage:-1"]').click(); ok(p.view.yp.querySelector('.izi-years-label').textContent.length>3,'paging works');
p.view.yp.querySelector('.izi-year-cell:not(:disabled)').click(); ok(p.view.yp.hidden,'selecting a year closes panel'); ok(p.model.view.jy!==1405,'view moved to chosen year');
p.view.yb.click(); w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); ok(p.isOpen&&p.view.yp.hidden,'Esc closes year panel first, not the picker');
// secondary
p.destroy(); p=new P('#a',{secondaryCalendar:'gregorian'}); p.open(); p.goTo(1405,1); const c1=p.view.root.querySelector('.izi-day-cell[data-key="14050101"]'); eq([c1.querySelector('.izi-d').textContent,c1.querySelector('.izi-sec').textContent],['۱','21'],'gregorian secondary shows day-of-month (Nowruz = 21 March)'); const c12=p.view.root.querySelector('.izi-day-cell[data-key="14050112"]'); eq(c12.querySelector('.izi-sec').textContent,'4/1','1st of a Gregorian month shows month/day');
p.setOptions({secondaryCalendar:'hijri'}); p.goTo(1405,1); ok(/^\d+(\/\d+)?$/.test(p.view.root.querySelector('.izi-sec').textContent),'hijri secondary renders');
// min/max strings follow outputCalendar
p.destroy(); p=new P('#a',{outputCalendar:'gregorian',minDate:'2026-05-01'}); ok(p.model.isDisabled(14050201),'gregorian minDate string parsed in gregorian (2026-05-01 = 1405/02/11)'); ok(!p.model.isDisabled(14050212),'after min is enabled');
// fa-AF
p.destroy(); p=new P('#a',{locale:'fa-AF'}); eq([p.loc.months[0],p.loc.months[4],p.loc.months[11]],['حمل','اسد','حوت'],'Dari month names'); eq(p.provider.getDay(1405,1,1),null,'Iranian fixed holidays not applied to fa-AF'); p.destroy();
// sheet
w.matchMedia=q=>({matches:/max-width/.test(q)}); p=new P('#a',{}); p.open(); ok(p.view.root.classList.contains('izi-sheet'),'sheet class on small viewport'); ok(!!w.document.querySelector('.izi-backdrop'),'backdrop present'); eq(w.document.body.style.overflow,'hidden','scroll locked');
w.document.querySelector('.izi-backdrop').dispatchEvent(new w.Event('pointerdown',{bubbles:true,composed:true})); ok(!p.isOpen,'backdrop tap closes'); ok(!w.document.querySelector('.izi-backdrop'),'backdrop removed'); eq(w.document.body.style.overflow,'','scroll restored');
w.matchMedia=q=>({matches:/pointer: coarse/.test(q)}); p.destroy(); p=new P('#a',{}); eq(w.document.getElementById('a').getAttribute('inputmode'),'none','inputmode none on coarse pointer'); p.destroy(); eq(w.document.getElementById('a').getAttribute('inputmode'),null,'inputmode restored on destroy');

// pipeline output (tools/build-holidays.mjs) loads straight into holidays.data
const norm=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/holidays/1405.json'),'utf8'));
p=new P('#a',{holidays:{data:{1405:norm}}}); const gd=(m,d)=>p.provider.getDay(1405,m,d);
eq(gd(1,1).types,['religious'],'normalized file: Eid al-Fitr is religious'); eq(gd(4,4).titles,['عاشورای حسینی'],'normalized file: Ashura title'); eq(gd(1,3).primary,'official','normalized file: Nowruz official'); eq(gd(12,29).titles,['روز ملی شدن صنعت نفت ایران'],'leading dash cleaned by the pipeline'); p.destroy();
// data-izi auto init
w.document.body.insertAdjacentHTML('beforeend','<input id="auto1" data-izi=\'{"mode":"range","presets":"default"}\'><input id="auto2" data-izi>'); const made=P.autoInit(); eq(made.length,2,'autoInit finds [data-izi]'); eq(made[0].o.mode,'range','JSON options from data-izi'); eq(P.autoInit()[0]===made[0],true,'autoInit is idempotent'); made.forEach(m=>m.destroy());
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
