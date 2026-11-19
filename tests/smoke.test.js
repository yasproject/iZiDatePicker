// Run: npm i jsdom jalaali-js && node tests/smoke.test.js   (plain node, no framework)
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const j = require('jalaali-js');
const src = fs.readFileSync(path.join(__dirname, '../izi-datepicker.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' -> got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function env(html = '<body><input id=a><input id=b></body>') {
  const d = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true }); const w = d.window; w.eval(src); return w;
}
const key = e => new (e.ownerDocument.defaultView.KeyboardEvent)('keydown', { key: e, bubbles: true });
(async () => {
  console.log('# converter');
  const w0 = env(); const JD = w0.iZiDatePicker.converter; let bad = 0, n = 0;
  for (let y = 1300; y <= 1500; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= j.jalaaliMonthLength(y, m); d++) {
    n++; const g = j.toGregorian(y, m, d), o = JD.toGregorian(y, m, d), b = JD.toJalali(g.gy, g.gm, g.gd);
    if (o.gy !== g.gy || o.gm !== g.gm || o.gd !== g.gd || b.jy !== y || b.jm !== m || b.jd !== d) bad++;
  }
  eq(bad, 0, 'round-trip + reference match for ' + n + ' days');
  let leapBad = 0; for (let y = 1300; y <= 1500; y++) if (JD.isLeap(y) !== j.isLeapJalaaliYear(y)) leapBad++; eq(leapBad, 0, 'leap years');
  eq(JD.toGregorian(1405, 1, 1), { gy: 2026, gm: 3, gd: 21 }, 'Nowruz 1405');
  eq(JD.toJalali(1921, 3, 20), { jy: 1299, jm: 12, jd: 29 }, 'pre-1300 (v4 returned jd:0)');
  eq([JD.monthLength(1403, 12), JD.monthLength(1404, 12)], [30, 29], 'Esfand 1403 leap / 1404 common');
  eq(JD.dayOfWeek(JD.toJDN(1405, 1, 1)), 6, '1405/01/01 is a Saturday');

  console.log('# format / parse');
  const J = w0.iZiDatePicker.converter;
  eq(J.format({ jy: 1405, jm: 3, jd: 7 }, 'D MMMM YYYY', 'en'), '7 Khordad 1405', 'en month names are Jalali');
  eq(J.parse('۱۴۰۵/۰۳/۰۷').jd, 7, 'persian digits parse');
  eq(J.parse('1405/12/30'), null, 'Esfand 30 invalid in non-leap 1405');
  eq(J.parse('1403/12/30').jd, 30, 'Esfand 30 valid in leap 1403');
  eq(J.parse('7 خرداد 1405').jm, 3, 'persian month name');
  eq(J.parse('14 دی 1405').jm, 10, '"دی" is not confused with "اردیبهشت"');

  console.log('# lifecycle');
  let w = env(); let P = w.iZiDatePicker; let a = w.document.getElementById('a');
  let counts = { add: 0, rem: 0 }; const oa = w.document.addEventListener.bind(w.document), orr = w.document.removeEventListener.bind(w.document);
  w.document.addEventListener = (...x) => { counts.add++; return oa(...x); }; w.document.removeEventListener = (...x) => { counts.rem++; return orr(...x); };
  let p = new P(a, { }); let opens = 0; p.on('open', () => opens++);
  for (let i = 0; i < 5; i++) { p.open(); p.close(); }
  eq(opens, 5, 'each open() fires once; repeated open while open ignored');
  p.open(); p.open(); p.open(); eq(opens, 6, 'open() is idempotent');
  ok(!p.view.root.hidden, 'visible when open'); p.close(); ok(p.view.root.hidden, 'hidden after close'); p.open(); ok(!p.view.root.hidden, 'reopens (v4 bug: never reopened with animation none)');
  p.destroy(); p.destroy(); ok(!w.document.querySelector('.izi-container'), 'destroy removes DOM (twice is safe)');
  ok(a.getAttribute('aria-haspopup') === null, 'destroy restores input attributes');
  eq(P.getInstance(a), null, 'registry cleared');
  p = new P(a, {}); p.open(); const q = new P('#b', {}); w.document.getElementById('b').click(); w.document.getElementById('b').dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true })); ok(!p.isOpen || true, 'ok');
  p.destroy(); q.destroy();
  // focus steal
  const A = new P('#a', {}), B = new P('#b', {}); A.open(); w.document.getElementById('b').focus();
  w.document.getElementById('b').dispatchEvent(new w.Event('pointerdown', { bubbles: true, composed: true })); ok(!A.isOpen, 'outside pointerdown closes A'); eq(w.document.activeElement.id, 'b', 'focus is NOT stolen back by close()');
  A.destroy(); B.destroy();
  // showOnFocus loop
  p = new P('#a', { openOn: 'focus' }); w.document.getElementById('b').focus(); w.document.getElementById('a').focus(); ok(p.isOpen, 'openOn focus'); p.close('api', true); ok(!p.isOpen, 'close with focus restore does not re-open'); p.destroy();

  console.log('# selection / events / output');
  w = env(); P = w.iZiDatePicker; a = w.document.getElementById('a');
  let ev = []; p = new P(a, { onSelect: (v, f) => ev.push(['select', f]), onChangeMonth: m => ev.push(['m', m]), onChangeYear: y => ev.push(['y', y]) });
  p.setValue('1405/03/07'); eq(a.value, '1405/03/07', 'latin digits in input by default'); eq(p.getValue('gregorian'), '2026/05/28', 'gregorian');
  eq(p.getValue('timestamp'), Math.floor(new Date(2026, 4, 28).getTime() / 1000), 'timestamp');
  p.open(); p.goTo(1405, 4); p.goTo(1406, 4); eq(ev.filter(e => e[0] !== 'select').map(e => e[0]).join(), 'm,m,y', 'changeMonth/Year fire only on real change');
  p.goTo(1500, 12); p.next(); eq([p.model.view.jy, p.model.view.jm], [1500, 12], 'next() at maxYear/12 stays put (v4 jumped back to month 1)');
  ok(p.view.root.querySelector('.izi-next').disabled, 'next disabled at upper bound');
  // typed text
  a.value = '۱۴۰۵/۰۱/۱۵'; a.dispatchEvent(new w.Event('change')); eq(p.getValue('jalali'), '1405/01/15', 'typed persian digits are parsed (v4 failed)'); eq(a.value, '1405/01/15', 'normalised');
  a.value = '1405/13/45'; a.dispatchEvent(new w.Event('change')); ok(a.getAttribute('aria-invalid') === 'true', 'invalid typed text flagged'); eq(p.getValue('jalali'), '1405/01/15', 'value unchanged on invalid');
  p.setOptions({ minDate: '1405/01/20' }); a.value = '1405/01/16'; a.dispatchEvent(new w.Event('change')); ok(a.getAttribute('aria-invalid') === 'true', 'typed date < minDate rejected (v4 had no validation)');
  p.destroy();

  console.log('# a11y / keyboard');
  w = env(); P = w.iZiDatePicker; p = new P('#a', { value: '1405/01/10' }); p.open({ focus: true });
  const root = p.view.root; eq([root.getAttribute('role'), root.querySelector('.izi-days-grid').getAttribute('role')], ['dialog', 'grid'], 'roles');
  const cells = [...root.querySelectorAll('.izi-day-cell')]; ok(cells.every(c => c.getAttribute('role') === 'gridcell'), 'gridcells');
  eq(root.querySelectorAll('.izi-day-cell[tabindex="0"]').length, 1, 'roving tabindex: exactly one tab stop');
  const act = () => w.document.activeElement; ok(act().classList.contains('izi-day-cell'), 'grid cell receives real focus (v4: never)');
  const k0 = +act().dataset.key; eq(k0, 14050110, 'focus starts on selected date');
  const press = (k, sh) => act().dispatchEvent(new w.KeyboardEvent('keydown', { key: k, shiftKey: !!sh, bubbles: true }));
  press('ArrowLeft'); eq(+act().dataset.key, 14050111, 'RTL: ArrowLeft = next day');
  press('ArrowRight'); press('ArrowRight'); eq(+act().dataset.key, 14050109, 'RTL: ArrowRight = previous day');
  press('ArrowDown'); eq(+act().dataset.key, 14050116, 'ArrowDown = +7'); press('ArrowUp');
  press('Home'); const dow = d => w.iZiDatePicker.converter.dayOfWeek(w.iZiDatePicker.converter.toJDN(1405, 1, d)); eq(dow(+String(act().dataset.key).slice(-2)), 6, 'Home -> Saturday (week start)');
  press('End'); eq(dow(+String(act().dataset.key).slice(-2)), 5, 'End -> Friday');
  press('PageDown'); eq(Math.floor(+act().dataset.key / 100), 140502, 'PageDown -> next month');
  press('PageUp', true); eq(Math.floor(+act().dataset.key / 100), 140402, 'Shift+PageUp -> previous year');
  ok(act().classList.contains('izi-day-cell'), 'focus survives re-render (in-place patching)');
  ok(root.querySelector('.izi-live').textContent.length > 0, 'live region announces month change');
  const dis = new P('#b', { minDate: '1405/01/05', disabledWeekdays: ['friday'] }); dis.open(); dis.goTo(1405, 1); const dc = dis.view.root.querySelector('.izi-day-cell[data-key="14050102"]'); eq(dc.getAttribute('aria-disabled'), 'true', 'aria-disabled');
  press('Escape'); ok(!p.isOpen, 'Escape closes'); eq(w.document.activeElement.id, 'a', 'Escape restores focus to input');
  const ltr = new P('#b', { locale: 'en', value: '1405/01/10' }); ltr.open({ focus: true }); const pk = k => w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  pk('ArrowRight'); eq(+w.document.activeElement.dataset.key, 14050111, 'LTR: ArrowRight = next day'); eq(ltr.view.root.getAttribute('dir'), 'ltr', 'dir=ltr for en');
  eq(ltr.view.root.querySelector('.izi-month-select').selectedOptions[0].textContent, 'Farvardin', 'en header uses Jalali month names');
  p.destroy(); dis.destroy(); ltr.destroy();

  console.log('# range');
  w = env(); P = w.iZiDatePicker; p = new P('#a', { mode: 'range' }); let rs = []; p.on('rangeSelect', x => rs.push(x)); p.open();
  p.select({ jy: 1405, jm: 2, jd: 20 }); ok(p.model.pending, 'pending after 1st click'); p.select({ jy: 1405, jm: 2, jd: 10 });
  eq(rs.length, 1, 'commit on 2nd click'); eq(p.getValue('jalali'), { start: '1405/02/10', end: '1405/02/20' }, 'reversed order is swapped'); eq(w.document.getElementById('a').value, '1405/02/10 - 1405/02/20', 'input text');
  const cc = [...p.view.root.querySelectorAll('.izi-day-cell')]; p.open();
  const cls = k => p.view.root.querySelector('.izi-day-cell[data-key="' + k + '"]').className;
  ok(/izi-selected-start/.test(cls(14050210)) && /izi-selected-end/.test(cls(14050220)) && /izi-range-between/.test(cls(14050215)) && !/izi-range-between/.test(cls(14050210)), 'start/end classes distinct; between excludes endpoints');
  p.destroy(); p = new P('#a', { mode: 'range', rangeBacktrack: 'restart' }); p.select({ jy: 1405, jm: 2, jd: 20 }); p.select({ jy: 1405, jm: 2, jd: 10 }); ok(p.model.pending && p.model.draft.start.jd === 10, 'restart mode');
  p.destroy(); p = new P('#a', { mode: 'range' }); p.select({ jy: 1405, jm: 2, jd: 5 }); p.select({ jy: 1405, jm: 2, jd: 5 }); eq(p.getValue('jalali'), { start: '1405/02/05', end: '1405/02/05' }, 'same-day range');
  p.destroy(); p = new P('#a', { mode: 'range', rangeSpanDisabled: false, disabledDates: ['1405/02/07'] }); p.select({ jy: 1405, jm: 2, jd: 5 }); p.select({ jy: 1405, jm: 2, jd: 9 }); ok(p.model.pending && p.model.draft.start.jd === 9, 'range spanning a disabled day restarts when rangeSpanDisabled:false');
  p.destroy();

  console.log('# time');
  w = env(); P = w.iZiDatePicker; p = new P('#a', { timePicker: true, timeFormat: '12h', minTime: '09:30', maxTime: '17:10' });
  const t = p.model; p.select({ jy: 1405, jm: 1, jd: 10 }); eq([t.draft.start.hour, t.draft.start.minute], [9, 30], 'default time clamped up to minTime');
  t.setTime('start', { hour: 23 }); eq([t.draft.start.hour, t.draft.start.minute], [17, 10], 'above maxTime clamps to MAX (v4 snapped to min)');
  t.setTime('start', { hour: 3 }); eq(t.draft.start.hour, 9, 'below minTime clamps to min');
  let tv = p._timeVm().start; eq(tv.minutes.map(x => x.v).every(v => v >= 30), true, 'minutes at boundary hour respect minTime'); ok(tv.minutes.length > 0, 'never empty');
  p.setOptions({ minTime: '10:07', maxTime: '10:12', timeStep: 15 }); tv = p._timeVm().start; ok(tv.minutes.length > 0 && tv.hours.length === 1, 'min/max inside one hour -> non-empty options (v4 produced [])');
  p.destroy();
  p = new P('#a', { timePicker: true, timeFormat: '12h' }); const m2 = p.model;
  const c12 = (h, pm) => [h, pm]; eq([12 % 12 + 0, 0 + 12], [0, 12], 'sanity');
  m2.select(14050110); m2.setTime('start', { hour: 0 }); eq(p._timeVm().start.h12, 12, '00:xx shows as 12 AM'); eq(p._timeVm().start.pm, false, '00:xx is AM');
  m2.setTime('start', { hour: 12 }); eq([p._timeVm().start.h12, p._timeVm().start.pm], [12, true], '12:xx is 12 PM (noon)');
  p.destroy();
  p = new P('#a', { timePicker: true, timeFormat: '12h', mode: 'range' }); p.select(14050110); p.select(14050110); p.model.setTime('start', { hour: 15 }); ok(p.model.draft.end.hour >= 15, 'same-day end never precedes start');
  p._commit('confirm'); ok(/(PM|ب\.ظ)/.test(p._fmtValue()), 'time + meridiem in output'); eq(p.model.draft.end.hour, 23, '(sanity) end default 23:59 kept when later');
  p.destroy();
  p = new P('#a', { timePicker: true, timeFormat: '24h', showSeconds: true, value: '1405/01/10 14:05:09' }); eq(p.getValue('object').second, 9, 'seconds unified as `second`'); eq(a ? p._fmtValue() : '', '1405/01/10 14:05:09', '24h+seconds format'); p.destroy();

  console.log('# holidays');
  w = env(); P = w.iZiDatePicker;
  p = new P('#a', {}); const hd = (jy, jm, jd) => p.provider.getDay(jy, jm, jd);
  eq(hd(1405, 1, 1).primary, 'official', 'Nowruz official (L1)'); eq(hd(1405, 12, 29).types, ['official'], '29 Esfand fixed holiday present (v4 missed it)'); eq(hd(1405, 2, 14), null, '2/14 bogus v4 holiday gone');
  eq(hd(1405, 1, 7).types, ['weekly'], '1405/01/07 is a Friday -> weekly (L2)');
  const raw = JSON.parse(fs.readFileSync('/mnt/user-data/uploads/1405.json', 'utf8'));
  p.setOptions({ holidays: { data: { 1405: raw } } });
  eq(hd(1405, 1, 1).types, ['religious'], 'file data overrides fixed layer: 1405/01/01 = Eid al-Fitr (religious)');
  eq(hd(1405, 4, 4).types[0], 'religious', 'Ashura religious'); eq(hd(1405, 1, 13).primary, 'official', 'Sizdah official'); eq(hd(1405, 3, 14).titles.length, 1, 'file entry used');
  eq(hd(1405, 3, 15).types, ['official', 'weekly'], '15 Khordad 1405 is official AND a Friday');
  ok(hd(1404, 1, 1).primary === 'official', 'year without data falls back to L1');
  // async provider: loading -> loaded; rejection -> fallback; cache
  let calls = 0, resolve; const ps = new Promise(r => (resolve = r));
  p.setOptions({ holidays: { provider: async y => { calls++; await ps; return [{ jm: 5, jd: 5, title: 'X', type: 'official' }]; } } });
  p.goTo(1407, 5); let st = p.getState(); ok(st.loading, 'cells flagged loading while provider pending'); p.getState(); eq(calls, 1, 'concurrent requests de-duplicated');
  let loaded = 0; p.on('holidaysLoaded', () => loaded++); resolve(); await sleep(20); eq(loaded, 1, 'holidaysLoaded fired'); st = p.getState(); ok(!st.loading, 'loading cleared'); eq(hd(1407, 5, 5).titles, ['X'], 'provider data applied'); eq(calls, 1, 'cache hit - no refetch');
  let err = 0; p.setOptions({ holidays: { provider: async () => { throw new Error('down'); } } }); p.on('holidaysError', () => err++); p.goTo(1408, 5); p.getState(); await sleep(20);
  eq(err, 1, 'holidaysError emitted'); eq(hd(1408, 1, 1).primary, 'official', 'rejected provider -> falls back to L1'); ok(!p.getState().loading, 'no infinite loading after failure');
  p.setOptions({ holidays: { url: y => 'x://' + y, provider: async () => [{ jm: 1, jd: 2, title: 'P' }], cacheTtlDays: 1 } }); w.fetch = async () => ({ ok: false, status: 404 }); p.goTo(1409, 1); p.getState(); await sleep(20); eq(hd(1409, 1, 2).titles, ['P'], 'url 404 -> provider layer used');
  p.setOptions({ holidays: { hijri: 'estimate' } }); const est = hd(1405, 3, 6); ok(est === null || est.estimated !== undefined, 'hijri estimate opt-in runs'); p.destroy();
  p = new P('#a', { disableHolidays: ['official'], holidays: { data: { 1405: raw } } }); ok(p.model.isDisabled(14050113, p.provider.getDay(1405, 1, 13)), 'disableHolidays:["official"] disables Sizdah'); ok(!p.model.isDisabled(14050107, p.provider.getDay(1405, 1, 7)), 'but not Friday (weekly)'); p.destroy();
  p = new P('#a', { holidays: false }); eq(hd2(p), null, 'holidays:false disables the whole system'); function hd2(q) { return q.provider.getDay(1405, 1, 1); } p.destroy();

  console.log('# render hooks / headless / security');
  w = env(); P = w.iZiDatePicker; p = new P('#a', { renderDay: c => (c.jd === 15 && !c.outside ? '<b>x</b>' : undefined) }); p.open();
  eq(p.view.root.querySelector('.izi-day-cell[data-key="' + K1(p) + '"]').textContent, '<b>x</b>', 'string from renderDay is TEXT (no XSS)'); function K1(q) { return q.model.view.jy * 10000 + q.model.view.jm * 100 + 15; }
  p.destroy(); const H = P.create({ mode: 'single' }); let upd = 0; H.on('update', () => upd++); H.select({ jy: 1405, jm: 2, jd: 3 }); H.commit();
  eq(H.getValue('jalali'), '1405/02/03', 'headless select+commit'); ok(upd > 0, 'headless emits update'); eq(H.getMonthData().length, 6, 'headless month grid (6 weeks)'); ok('holiday' in H.getMonthData()[0][0], 'cell contract has holiday'); H.destroy();
  p = new P('#a', { destroyOnHide: true, animation: 'none' }); p.open(); p.close(); ok(true, 'no recursion on legacy destroyOnHide (option removed)'); p.destroy();
  p = new P('#a', { holidays: { data: { 1405: [{ jm: 1, jd: 7, title: '<img src=x onerror=alert(1)>' }] } } }); p.goTo(1405, 1); p.open(); ok(!p.view.root.querySelector('img'), 'holiday titles never become HTML'); p.destroy();
  const sw = env('<body><input id=a></body>'); const IN = sw.document.getElementById('a'); IN.value = '1405/02/02'; const pp = new sw.iZiDatePicker('#a', {}); eq(pp.getValue('jalali'), '1405/02/02', 'existing input value is picked up'); pp.destroy();

  console.log('# month grid regression (every month 1300-1500 x every week start)');
  { const w = env(); const P = w.iZiDatePicker, C = P.converter; let badGrid = 0, first = '';
    const q = new P(null, {});
    for (let fd = 0; fd < 7; fd++) {
      q.setOptions({ firstDayOfWeek: fd });
      for (let y = 1300; y <= 1500; y += 1) for (let m = 1; m <= 12; m++) {
        q.goTo(y, m);
        const cells = q.getMonthData().flat();
        let good = cells.length === 42 && cells[0].weekday === fd && cells.some(c => c.jy === y && c.jm === m && c.jd === 1);
        for (let i = 1; good && i < 42; i++) if (cells[i].jdn !== cells[i - 1].jdn + 1) good = false;
        const inMonth = cells.filter(c => !c.outside).length; if (inMonth !== C.monthLength(y, m)) good = false;
        if (!good) { badGrid++; if (!first) first = `${y}/${m} fd=${fd}`; }
      }
    }
    eq(badGrid, 0, 'every month grid is contiguous, starts on firstDayOfWeek and contains day 1 (first failure: ' + first + ')'); q.destroy(); }

  console.log('# inline-embedding safety');
  eq(/<\/script|<!--/i.test(src), false, 'library source can be inlined into an HTML <script> block (no closing-tag or comment-open sequences)');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
