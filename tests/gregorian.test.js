// node tests/gregorian.test.js — Gregorian calendar, Intl locales, coexistence with Jalali pickers
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../izi-datepicker.js'), 'utf8');
const mk = () => { const w = new JSDOM('<body><input id="a"><input id="b"><input id="c"></body>', { runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(src); return w; };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' -> got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const w = mk(), P = w.iZiDatePicker, el = id => w.document.getElementById(id);
  const G = (o = {}) => new P(null, { calendar: 'gregorian', locale: 'en', ...o });

  console.log('# calendar math (vs the JS Date engine)');
  const g = P.gregorian; let bad = 0, n = 0;
  for (let y = 1900; y <= 2100; y++) for (let m = 1; m <= 12; m++) { const len = new Date(Date.UTC(y, m, 0)).getUTCDate(); if (g.monthLength(y, m) !== len) bad++; for (const d of [1, len]) { n++; const j = g.toJDN(y, m, d), dt = new Date(Date.UTC(y, m - 1, d)); if (g.dayOfWeek(j) !== dt.getUTCDay()) bad++; const r = g.fromJDN(j); if (r.gy !== y || r.gm !== m || r.gd !== d) bad++; } }
  eq(bad, 0, 'monthLength / weekday / JDN round-trip for 1900-2100 (' + n + ' dates)');
  ok(g.isLeap(2024) && !g.isLeap(2100) && g.isLeap(2000) && !g.isLeap(1900), 'leap-year rules (2100 and 1900 are not leap, 2000 is)'); ok(g.isValid(2024, 2, 29) && !g.isValid(2023, 2, 29) && !g.isValid(2026, 4, 31), 'isValid');
  eq(P.converter.toGregorian(1405, 1, 1), { gy: 2026, gm: 3, gd: 21 }, 'static converter is still Jalali');

  console.log('# month grids: every month 1900-2100 x every week start');
  const q = G(); let badGrid = 0, first = '';
  for (let fd = 0; fd < 7; fd++) { q.setOptions({ firstDayOfWeek: fd }); for (let y = 1900; y <= 2100; y += 1) for (let m = 1; m <= 12; m++) { q.goTo(y, m); const c = q.getMonthData().flat(); let good = c.length === 42 && c[0].weekday === fd && c.some(x => x.jy === y && x.jm === m && x.jd === 1) && c.filter(x => !x.outside).length === g.monthLength(y, m); for (let i = 1; good && i < 42; i++) if (c[i].jdn !== c[i - 1].jdn + 1) good = false; if (good) { const x = c.find(z => !z.outside); good = new Date(Date.UTC(y, m - 1, x.jd)).getUTCDay() === x.weekday; } if (!good) { badGrid++; first = first || `${y}-${m} fd=${fd}`; } } }
  eq(badGrid, 0, '42 contiguous cells, correct start weekday, correct length (first failure: ' + first + ')'); q.destroy();

  console.log('# defaults per calendar / locale');
  let p = G(); eq([p.cal.id, p.c.minYear, p.c.maxYear], ['gregorian', 1900, 2100], 'year range 1900-2100'); eq([p.c.firstDay, [...p.c.weekend]], [0, [6, 0]], 'en: Sunday first, weekend Sat/Sun'); eq(p.provider.getDay(2026, 3, 21), null, 'no Iranian holidays in a Gregorian picker'); eq([...p.provider.weekly], [], 'no weekly holiday by default'); eq(p.fmt, 'YYYY-MM-DD', 'ISO default format'); p.destroy();
  p = G({ locale: 'de' }); eq(p.c.firstDay, 1, 'de: Monday first'); eq(p.loc.months[2], 'März', 'de month names from Intl'); eq(p.loc.weekdays[1], 'Montag', 'de weekday names'); eq(p.loc.dir, 'ltr', 'de is LTR'); p.destroy();
  p = G({ locale: 'ja' }); eq([p.loc.months[0], p.loc.weekdays[0]], ['1月', '日曜日'], 'ja names from Intl'); p.destroy();
  p = G({ locale: 'ar' }); eq(p.loc.dir, 'rtl', 'ar is RTL'); ok(p.loc.months[0].length > 2, 'ar month names'); p.destroy();
  p = G({ locale: 'ar-SA' }); ok(Array.isArray(p.loc.digits) || p.loc.digits === 'latn', 'digits resolved from Intl'); p.destroy();
  p = G({ locale: 'fr', firstDayOfWeek: 'sunday', weekend: [5] }); eq([p.c.firstDay, [...p.c.weekend]], [0, [5]], 'explicit options override locale defaults'); p.destroy();
  p = G({ locale: { base: 'en', months: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12'], today: 'Hoy' } }); eq([p.loc.months[0], p.loc.today], ['A1', 'Hoy'], 'locale object override'); p.destroy();

  console.log('# format / parse');
  p = G({ locale: 'en' }); const fmt = (v, f) => p._one ? null : null;
  p.setValue('2026-05-28'); eq([p.getValue('string'), p.getValue('gregorian'), p.getValue('jalali')], ['2026-05-28', '2026/05/28', '1405/03/07'], 'string / gregorian / jalali views of one date'); eq(p.getValue('iso'), '2026-05-28', 'iso');
  eq(p.getValue('object').year + '-' + p.getValue('object').month + '-' + p.getValue('object').day, '2026-5-28', 'year/month/day aliases'); eq(p.getValue('timestamp'), Math.floor(new Date(2026, 4, 28).getTime() / 1000), 'timestamp (local midnight)');
  for (const [txt, order, exp] of [['2026-05-28', 'dmy', '2026-05-28'], ['28/05/2026', 'dmy', '2026-05-28'], ['05/28/2026', 'mdy', '2026-05-28'], ['28 May 2026', 'dmy', '2026-05-28'], ['May 28, 2026', 'dmy', '2026-05-28'], ['2026.05.28', 'dmy', '2026-05-28'], ['\u0662\u0660\u0662\u0666-\u0660\u0665-\u0662\u0668', 'dmy', '2026-05-28'], ['\u0968\u0966\u0968\u096c-\u0966\u096b-\u0968\u096e', 'dmy', '2026-05-28']]) { p.setOptions({ dateOrder: order }); p.clear({ silent: true }); el('a').value = ''; const ok1 = p._applyText ? null : null; const r = p._toDT(txt); ok(r && P.gregorian && `${r.jy}-${String(r.jm).padStart(2, '0')}-${String(r.jd).padStart(2, '0')}` === exp, `parse "${txt}" (${order}) -> ${r && r.jy + '-' + r.jm + '-' + r.jd}`); }
  eq([p._toDT('2026-02-30'), p._toDT('2023-02-29') , p._toDT('2024-02-29') && 1], [null, null, 1], 'invalid dates rejected, Feb 29 only in leap years');
  p.setOptions({ format: 'dddd, D MMMM YYYY', locale: 'de' }); p.setValue('2026-05-28'); eq(p.getValue('string'), 'Donnerstag, 28 Mai 2026', 'format with German names');
  p.setOptions({ locale: 'en', format: 'MM/DD/YYYY hh:mm A', dateOrder: 'mdy', timePicker: true }); p.setValue('05/28/2026 03:30 PM'); eq([p.getValue('string'), p.getRange().start.hour], ['05/28/2026 03:30 PM', 15], '12h + mdy round trip'); p.destroy();
  p = G({ outputCalendar: 'jalali', format: 'YYYY/MM/DD' }); p.setValue('1405/03/07'); eq([p.getValue('jalali'), p.getValue('gregorian')], ['1405/03/07', '2026/05/28'], 'Gregorian picker can read/write Jalali text (outputCalendar)'); p.destroy();
  p = G({ minDate: '2026-05-10', maxDate: new Date(2026, 5, 10), disabledDates: ['2026-05-20', { year: 2026, month: 5, day: 21 }] }); eq([p.model.isDisabled(20260509), p.model.isDisabled(20260510), p.model.isDisabled(20260520), p.model.isDisabled(20260521), p.model.isDisabled(20260611)], [true, false, true, true, true], 'min/max/disabled as strings, Date and {year,month,day}'); p.destroy();

  console.log('# DOM: rendering, keyboard, a11y labels');
  p = new P(el('a'), { calendar: 'gregorian', locale: 'en', value: '2026-05-28' }); p.open({ focus: true }); const r = p.view.root;
  eq([r.getAttribute('dir'), r.querySelector('.izi-month-select').selectedOptions[0].textContent, r.querySelector('.izi-year-select').value], ['ltr', 'May', '2026'], 'header shows Gregorian month/year');
  eq([...r.querySelectorAll('.izi-weekday')].map(x => x.textContent).slice(0, 3), ['S', 'M', 'T'], 'narrow weekday letters (Sunday first)');
  const cell = r.querySelector('.izi-day-cell[data-key="20260528"]'); ok(/Thursday/.test(cell.getAttribute('aria-label')) && /May/.test(cell.getAttribute('aria-label')), 'aria-label: ' + cell.getAttribute('aria-label'));
  const press = k => w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true })); eq(+w.document.activeElement.dataset.key, 20260528, 'focus on the selected date');
  press('ArrowRight'); eq(+w.document.activeElement.dataset.key, 20260529, 'LTR: ArrowRight = next day'); press('PageDown'); eq(Math.floor(+w.document.activeElement.dataset.key / 100), 202606, 'PageDown = next month'); press('PageUp'); press('PageUp'); press('ArrowDown');
  p.goTo(2024, 2); eq(r.querySelectorAll('.izi-day-cell:not(.izi-faded)').length, 29, 'Feb 2024 has 29 days'); p.goTo(2100, 2); eq(r.querySelectorAll('.izi-day-cell:not(.izi-faded)').length, 28, 'Feb 2100 has 28 days'); p.goTo(2100, 12); p.next(); eq([p.model.view.jy, p.model.view.jm], [2100, 12], 'cannot go past maxYear');
  p.close(); p.destroy();
  p = new P(el('a'), { calendar: 'gregorian', locale: 'en', maxYear: 2030 }); p.setValue('2030-12-31'); eq(p.getValue(), '2030-12-31', 'last day of maxYear is reachable (was clamped to Dec 29)'); p.destroy();
  p = new P(el('a'), { calendar: 'gregorian', locale: 'en', value: '2026-05-28', showWeekNumbers: true, firstDayOfWeek: 'monday' }); p.open(); p.goTo(2026, 1); const wn = [...p.view.root.querySelectorAll('.izi-weekno')].map(x => x.textContent); eq(wn.slice(0, 3), ['1', '2', '3'], 'ISO week numbers: the week containing Thursday 1 Jan 2026 is week 1'); p.goTo(2026, 12); eq([...p.view.root.querySelectorAll('.izi-weekno')].map(x => x.textContent).includes('53'), true, 'week 53 appears at the end of 2026 (ISO)'); p.destroy();
  p = new P(el('a'), { calendar: 'gregorian', locale: 'en', secondaryCalendar: 'jalali', value: '2026-03-21' }); p.open(); p.goTo(2026, 3); eq(p.view.root.querySelector('.izi-day-cell[data-key="20260321"] .izi-sec').textContent, '1/1', 'secondary Jalali label: 21 Mar 2026 is 1 Farvardin'); p.destroy();

  console.log('# modes and presets in the Gregorian calendar');
  p = G({ mode: 'range', presets: 'all', timeZone: 'UTC' }); const T = p.model.today(), tk = T.jy * 10000 + T.jm * 100 + T.jd; const pr = id => p._presetRange({ id });
  eq(pr('thisMonth')[0] % 100, 1, 'thisMonth starts on day 1'); eq(pr('thisMonth')[1] % 100, g.monthLength(T.jy, T.jm), 'thisMonth ends on the last day'); ok(pr('thisYear')[0] % 10000 === 101 && pr('thisYear')[1] % 10000 === 1231, 'thisYear = Jan 1 - Dec 31'); ok(pr('thisQuarter')[0] % 10000 % 100 === 1 && [1, 4, 7, 10].includes(Math.floor(pr('thisQuarter')[0] % 10000 / 100)), 'thisQuarter on a quarter boundary'); eq(pr('last7')[1], tk, 'last7 ends today'); p.destroy();
  p = G({ mode: 'range' }); p.select(20260510); p.select(20260503); eq(p.getValue('gregorian'), { start: '2026/05/03', end: '2026/05/10' }, 'range (reversed click swaps)'); p.destroy();
  p = G({ mode: 'week', firstDayOfWeek: 'monday' }); p.select(20260528); eq(p.getValue('iso'), { start: '2026-05-25', end: '2026-05-31' }, 'week mode (Mon-Sun)'); p.destroy();
  p = G({ mode: 'month' }); p.select(20260528); eq([p.getValue('string'), p.getValue('iso')], ['2026-05', '2026-05-01'], 'month mode'); p.destroy();
  p = G({ mode: 'multiple', maxDates: 3 }); [20260110, 20260105, 20260120].forEach(k => p.select(k)); eq(p.getValue('iso'), ['2026-01-05', '2026-01-10', '2026-01-20'], 'multiple mode'); p.destroy();
  p = G({ timePicker: true, timeFormat: '24h', minTime: '09:00', maxTime: '17:30' }); p.select(20260528); p.model.setTime('start', { hour: 23 }); eq([p.model.draft.start.hour, p.model.draft.start.minute], [17, 30], 'time limits work in the Gregorian calendar'); p.destroy();

  console.log('# holidays for Gregorian pickers (any source)');
  p = G({ holidays: { fixed: [{ m: 12, d: 25, title: 'Christmas' }, { m: 1, d: 1, title: "New Year's Day" }] } }); eq([p.provider.getDay(2026, 12, 25).titles, p.provider.getDay(2030, 1, 1).titles, p.provider.getDay(2026, 7, 4)], [['Christmas'], ["New Year's Day"], null], 'fixed list: recurring month/day entries'); p.destroy();
  p = G({ holidays: { sources: [{ type: 'json', data: { 2026: [{ date: '2026-07-04', title: 'Independence Day' }, { date: '2027-01-01', title: 'Other year' }] } }, { type: 'map', years: [2027], data: { '12-25': 'Xmas', '2027-07-05': 'Observed' } }] } });
  eq([p.provider.getDay(2026, 7, 4).titles, p.provider.getDay(2026, 1, 1)], [['Independence Day'], null], 'json rows with Gregorian dates; rows of other years are ignored'); eq([p.provider.getDay(2027, 12, 25).titles, p.provider.getDay(2027, 7, 5).titles], [['Xmas'], ['Observed']], 'map keys: MM-DD recurring and YYYY-MM-DD'); p.destroy();
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261225\r\nSUMMARY:Christmas Day\r\nEND:VEVENT\r\nEND:VCALENDAR'; const calls = [];
  p = G({ holidays: { sources: [{ type: 'url', url: 'https://x/{year}.ics', format: 'ics', fetch: async (u) => { calls.push(u); return { ok: true, text: async () => ics }; } }] } }); p.goTo(2026, 12); p.getState(); await sleep(15); eq([p.provider.getDay(2026, 12, 25).titles, calls[0]], [['Christmas Day'], 'https://x/2026.ics'], 'ICS source; {year} is the Gregorian year'); p.destroy();
  p = G({ holidays: { sources: [{ type: 'api', url: 'https://date.nager.at/api/v3/PublicHolidays/{year}/US', path: 'data', fields: { date: 'date', title: 'localName' }, fetch: async () => ({ ok: true, json: async () => ({ data: [{ date: '2026-07-04', localName: 'Independence Day' }] }) }) }] }, weeklyHolidays: ['sunday'] }); p.goTo(2026, 7); p.getState(); await sleep(15); eq(p.provider.getDay(2026, 7, 4).titles, ['Independence Day'], 'REST API shape mapped with path + fields (mock)'); eq(p.provider.getDay(2026, 7, 5).types, ['weekly'], 'weeklyHolidays: sunday'); p.destroy();
  p = G({ holidays: { sources: [{ type: 'json', data: [{ shamsiDate: '1405/01/01', title: 'Jalali row' }] }] } }); eq(p.provider.getDay(1405, 1, 1), null, 'Jalali-dated rows are ignored by a Gregorian picker'); p.destroy();
  p = G({ holidays: { fixed: [{ m: 5, d: 28, title: 'Today test' }] }, disableHolidays: ['official'] }); ok(p.model.isDisabled(20260528, p.provider.getDay(2026, 5, 28)), 'disableHolidays works for Gregorian holiday data'); p.destroy();

  console.log('# Jalali and Gregorian pickers side by side (no calendar bleed)');
  const J1 = new P(el('a'), { value: '1405/03/07' }), G1 = new P(el('b'), { calendar: 'gregorian', locale: 'en', value: '2026-05-28' }), J2 = new P(el('c'), { mode: 'range', presets: ['last7'] });
  const seen = []; G1.on('select', e => { seen.push(['G', e.formatted, P.converter.toGregorian(1405, 1, 1).gy]); J1.setValue('1405/04/01'); seen.push(['J-in-G', J1.getValue('jalali')]); });
  J1.open(); G1.open(); G1.setValue('2027-02-03'); J1.goTo(1406, 5); G1.goTo(2030, 6);
  eq([J1.getValue('jalali'), G1.getValue('string')], ['1405/04/01', '2027-02-03'], 'values stay in their own calendar after nested/alternating calls'); eq([seen[0][1], seen[0][2], seen[1][1]], ['2027-02-03', 2026, '1405/04/01'], 'static converter stays Jalali inside a Gregorian callback');
  eq([J1.model.view.jy, J1.model.view.jm, G1.model.view.jy, G1.model.view.jm], [1406, 5, 2030, 6], 'each picker keeps its own view'); eq(J1.view.root.querySelector('.izi-month-select').selectedOptions[0].textContent, 'مرداد', 'Jalali picker still renders Jalali month names'); eq(G1.view.root.querySelector('.izi-month-select').selectedOptions[0].textContent, 'June', 'Gregorian picker renders Gregorian ones');
  J1.next(); G1.next(); eq([J1.model.view.jm, G1.model.view.jm], [6, 7], 'next() on both'); J2.open(); J2._applyPreset('last7'); ok(J2.getValue('jalali').start && J2.getValue('jalali').start.startsWith('14'), 'a third (Jalali) picker is unaffected');
  [J1, G1, J2].forEach(x => x.destroy());
  // async holiday load of a Gregorian picker finishing while a Jalali picker is the "active" one
  const GA = new P(el('a'), { calendar: 'gregorian', locale: 'en', holidays: { sources: [{ type: 'url', url: '/x', fetch: async () => { await sleep(20); return { ok: true, json: async () => [{ date: '2026-12-25', title: 'Xmas' }] }; } }] } }), JA = new P(el('b'), { value: '1405/03/07' });
  GA.goTo(2026, 12); GA.getState(); JA.goTo(1405, 5); await sleep(60); eq([GA.provider.getDay(2026, 12, 25).titles, JA.model.view.jy], [['Xmas'], 1405], 'async source resolves in the right calendar while another picker is in use'); GA.destroy(); JA.destroy();

  console.log('# switching calendar at runtime');
  p = new P(el('a'), { value: '1405/03/07' }); p.setOptions({ calendar: 'gregorian', locale: 'en' }); eq([p.cal.id, el('a').value, p.getValue()], ['gregorian', '', null], 'switching calendar clears the (now meaningless) value'); p.setValue('2026-05-28'); eq(p.getValue('jalali'), '1405/03/07', 'and works afterwards'); p.setOptions({ calendar: 'jalali', locale: 'fa' }); eq([p.cal.id, p.model.view.jy > 1300 && p.model.view.jy < 1500], ['jalali', true], 'switch back'); p.destroy();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
