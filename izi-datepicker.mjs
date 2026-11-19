/*!
 * iZiDatePicker v1.0.0 - zero-dependency Jalali (Solar Hijri) + Gregorian datepicker
 * MIT License.
 * Calendar arithmetic follows the algorithm published in jalaali-js (Borkowski /
 * Amini); re-implemented here and cross-checked against it for every day 1300-1500.
 */
const factory = function () {
  'use strict';

  /* ==========================================================================
   * 1. Utilities (no DOM)
   * ======================================================================== */
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const div = (a, b) => Math.trunc(a / b);
  const mod = (a, b) => a - Math.trunc(a / b) * b; // truncating: required by the converter
  const wmod = (a, b) => ((a % b) + b) % b; // always >= 0: use for weekday offsets
  const isObj = v => v !== null && typeof v === 'object';
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]'; // realm-safe (iframes / test runners)
  const isNode = v => isObj(v) && typeof v.nodeType === 'number';
  const uid = (() => { let n = 0; return () => 'izi-' + (++n); })();
  const faDigit = d => String.fromCharCode(0x06f0 + Number(d));
  const toDigits = (s, kind) => (kind === 'fa' ? String(s).replace(/\d/g, faDigit) : Array.isArray(kind) ? String(s).replace(/\d/g, d => kind[d]) : String(s));
  const ZEROS = [0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xf20, 0x1040, 0x17e0, 0x1810, 0xff10];
  /** Any Unicode decimal digit (Persian, Arabic-Indic, Devanagari, Bengali, Thai, ...) -> ASCII. */
  const fromDigits = s => String(s).replace(/[^\x00-\x7f]/g, c => { const n = c.codePointAt(0), z = ZEROS.find(q => n >= q && n < q + 10); return z === undefined ? c : n - z; });
  const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  /* ==========================================================================
   * 2. JalaliConverter - pure math, O(1), timezone independent
   *    Julian Day Number (JDN) is the pivot. Weekday: 0 = Sunday ... 6 = Saturday.
   *    Valid for Jalali years -61 .. 3176.
   * ======================================================================== */
  const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const calCache = new Map();

  function jalCal(jy) {
    let c = calCache.get(jy);
    if (c) return c;
    if (!Number.isInteger(jy) || jy < BREAKS[0] || jy >= BREAKS[BREAKS.length - 1]) throw new RangeError('Invalid Jalali year: ' + jy);
    const gy = jy + 621;
    let leapJ = -14, jp = BREAKS[0], jump = 0, n;
    for (let i = 1; i < BREAKS.length; i++) {
      const jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    c = { leap, gy, march };
    calCache.set(jy, c);
    return c;
  }
  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd };
  }
  /** Calendar systems. Every date helper works on the ACTIVE calendar (`CAL`); fields are still called jy/jm/jd internally
   *  (= year/month/day of the picker's calendar) so Jalali and Gregorian pickers share one code path. */
  const JAL = {
    id: 'jalali',
    isLeap: jy => jalCal(jy).leap === 0,
    monthLength: (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : JAL.isLeap(jy) ? 30 : 29),
    toJDN(jy, jm, jd) {
      const r = jalCal(jy);
      return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
    },
    fromJDN(jdn) {
      const gy = d2g(jdn).gy;
      let jy = gy - 621;
      const r = jalCal(jy);
      let k = jdn - g2d(gy, 3, r.march);
      if (k >= 0) {
        if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
        k -= 186;
      } else {
        jy -= 1;
        k += 179;
        if (r.leap === 1) k += 1;
      }
      return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
    },
    isValid(jy, jm, jd) {
      return Number.isInteger(jy) && Number.isInteger(jm) && Number.isInteger(jd) &&
        jy >= BREAKS[0] && jy < BREAKS[BREAKS.length - 1] && jm >= 1 && jm <= 12 && jd >= 1 && jd <= JAL.monthLength(jy, jm);
    }
  };
  const GRE = {
    id: 'gregorian',
    isLeap: y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0,
    monthLength: (y, m) => (m === 2 ? (GRE.isLeap(y) ? 29 : 28) : m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31),
    toJDN: (y, m, d) => g2d(y, m, d),
    fromJDN(jdn) { const g = d2g(jdn); return { jy: g.gy, jm: g.gm, jd: g.gd }; },
    isValid: (y, m, d) => Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d) && y >= 1 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= GRE.monthLength(y, m)
  };
  let CAL = JAL; // ambient calendar, switched per instance by bindCal()
  const J = {
    isLeap: y => CAL.isLeap(y),
    monthLength: (y, m) => CAL.monthLength(y, m),
    toJDN: (y, m, d) => CAL.toJDN(y, m, d),
    fromJDN: j => CAL.fromJDN(j),
    /** Gregorian parts of a date in the active calendar. */
    toGregorian: (y, m, d) => d2g(CAL.toJDN(y, m, d)),
    /** Active-calendar fields of a Gregorian date (named for history: identity for a Gregorian picker). */
    toJalali: (gy, gm, gd) => CAL.fromJDN(g2d(gy, gm, gd)),
    dayOfWeek: jdn => mod(jdn + 1, 7),
    isValid: (y, m, d) => CAL.isValid(y, m, d)
  };
  /** Public converter: always Jalali, whatever calendar the current picker uses. */
  const JALCONV = { isLeap: JAL.isLeap, monthLength: JAL.monthLength, toJDN: JAL.toJDN, fromJDN: JAL.fromJDN, toGregorian: (y, m, d) => d2g(JAL.toJDN(y, m, d)), toJalali: (gy, gm, gd) => JAL.fromJDN(g2d(gy, gm, gd)), dayOfWeek: J.dayOfWeek, isValid: JAL.isValid };
  /** Run every method of `Cls` with the instance's calendar active, so the shared helpers need no calendar parameter. */
  function bindCal(Cls) {
    for (const k of Object.getOwnPropertyNames(Cls.prototype)) {
      const d = Object.getOwnPropertyDescriptor(Cls.prototype, k);
      if (k === 'constructor' || typeof d.value !== 'function') continue;
      const fn = d.value;
      Cls.prototype[k] = function (...a) { const prev = CAL; CAL = this.cal || prev; try { return fn.apply(this, a); } finally { CAL = prev; } };
    }
  }
  /** Sortable integer key YYYYMMDD (works as Map key and for comparisons). */
  const K = (jy, jm, jd) => jy * 10000 + jm * 100 + jd;
  const unK = k => ({ jy: div(k, 10000), jm: div(mod(k, 10000), 100), jd: mod(k, 100) });
  const keyJDN = k => J.toJDN(div(k, 10000), div(mod(k, 10000), 100), mod(k, 100));
  const jdnKey = j => { const d = J.fromJDN(j); return K(d.jy, d.jm, d.jd); };
  const dtKey = d => K(d.jy, d.jm, d.jd);
  const addDays = (k, n) => jdnKey(keyJDN(k) + n);
  function addMonths(k, n) {
    const d = unK(k);
    let t = d.jy * 12 + (d.jm - 1) + n;
    const jy = Math.floor(t / 12), jm = t - jy * 12 + 1;
    return K(jy, jm, Math.min(d.jd, J.monthLength(jy, jm)));
  }

  /* ==========================================================================
   * 3. Time-zone helpers - "today" and timestamps never depend on the host zone
   *    unless timeZone is 'local' (the default).
   * ======================================================================== */
  const dtfCache = {};
  function zoneParts(ms, tz) {
    if (!tz || tz === 'local') {
      const d = new Date(ms);
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds() };
    }
    const f = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }));
    const o = {};
    for (const p of f.formatToParts(ms)) o[p.type] = +p.value;
    return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
  }
  function zonedToEpoch(y, m, d, h, mi, s, tz) {
    if (!tz || tz === 'local') return new Date(y, m - 1, d, h, mi, s).getTime();
    const guess = Date.UTC(y, m - 1, d, h, mi, s);
    const off = t => { const p = zoneParts(t, tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - t; };
    return guess - off(guess - off(guess));
  }
  function nowIn(tz) {
    const p = zoneParts(Date.now(), tz);
    const j = J.toJalali(p.y, p.m, p.d);
    return { jy: j.jy, jm: j.jm, jd: j.jd, hour: p.h, minute: p.mi, second: p.s };
  }

  /* ==========================================================================
   * 4. LocaleRegistry - ALL human-language strings live here.
   * ======================================================================== */
  const LOCALES = {
    en: {
      dir: 'ltr', digits: 'latn',
      months: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      am: 'AM', pm: 'PM', today: 'Today', clear: 'Clear', confirm: 'Confirm', cancel: 'Cancel',
      prevMonth: 'Previous month', nextMonth: 'Next month', month: 'Month', year: 'Year',
      hour: 'Hour', minute: 'Minute', second: 'Second', meridiem: 'AM/PM', start: 'Start', end: 'End', time: 'Time', week: 'Week',
      dialog: 'Choose date', rangePlaceholder: 'Select a range', pickEnd: 'Now choose the end date',
      selected: 'selected', cleared: 'Selection cleared', loadingHolidays: 'Loading holidays', invalid: 'Invalid date',
      previewFormat: 'dddd, D MMMM YYYY',
      compare: 'Compare', compareWith: 'Compare with', previousPeriod: 'Previous period', previousYear: 'Previous year', customRange: 'Custom range', primaryRange: 'Main range', compareRange: 'Comparison range', compareHint: 'Pick the comparison range',
      slotsLabel: 'Available times', pickDateFirst: 'Select a date to see available times',
      holidaysTitle: 'Holidays', holidayFilter: 'Holiday types', noHolidays: 'No holidays in this period', download: 'Download', exportLabel: 'Export',
      weekdaysAbbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], scrollLeft: 'Scroll left', scrollRight: 'Scroll right',
      presetLast: 'Last {n} days', presetNext: 'Next {n} days',
      presetReasons: { disabled: 'Contains a disabled day', short: 'Shorter than the minimum range', long: 'Longer than the maximum range', bounds: 'Outside the allowed dates', invalid: 'Not available' },
      presetsLabel: 'Quick ranges', years: 'Years', prevYears: 'Previous years', nextYears: 'Next years', prevYear: 'Previous year', nextYear: 'Next year',
      presets: { today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow', last7: 'Last 7 days', last14: 'Last 14 days', last30: 'Last 30 days', last90: 'Last 90 days', next7: 'Next 7 days', next14: 'Next 14 days', next30: 'Next 30 days', thisWeek: 'This week', lastWeek: 'Last week', nextWeek: 'Next week', weekToDate: 'Week to date', thisMonth: 'This month', lastMonth: 'Last month', nextMonth: 'Next month', monthToDate: 'Month to date', thisQuarter: 'This quarter', lastQuarter: 'Last quarter', thisYear: 'This year', lastYear: 'Last year', yearToDate: 'Year to date' },
      holidayTypes: { official: 'Public holiday', religious: 'Religious holiday', weekly: 'Weekly day off' }, estimated: 'approximate',
      fixedHolidays: {
        '1-1': 'Nowruz', '1-2': 'Nowruz', '1-3': 'Nowruz', '1-4': 'Nowruz', '1-12': 'Islamic Republic Day', '1-13': 'Nature Day (Sizdah Bedar)',
        '3-14': 'Demise of Imam Khomeini', '3-15': '15 Khordad Uprising', '11-22': 'Islamic Revolution Victory Day', '12-29': 'Oil Nationalization Day'
      },
      hijriTitles: {
        eidFitr: 'Eid al-Fitr', eidFitr2: 'Eid al-Fitr holiday', eidAdha: 'Eid al-Adha', ghadir: 'Eid al-Ghadir', tasua: 'Tasua', ashura: 'Ashura',
        arbaeen: 'Arbaeen', prophetDemise: 'Demise of the Prophet', imamReza: 'Martyrdom of Imam Reza', askari: 'Martyrdom of Imam Hasan al-Askari',
        prophetBirth: 'Birth of the Prophet', fatima: 'Martyrdom of Fatima', aliBirth: 'Birth of Imam Ali', mabath: "Mab'ath",
        qaem: 'Birth of Imam Mahdi', aliMartyr: 'Martyrdom of Imam Ali', sadiq: 'Martyrdom of Imam Sadiq'
      }
    },
    fa: {
      dir: 'rtl', digits: 'fa',
      months: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
      weekdays: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
      weekdaysShort: ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'],
      am: 'ق.ظ', pm: 'ب.ظ', today: 'امروز', clear: 'حذف', confirm: 'تأیید', cancel: 'انصراف',
      prevMonth: 'ماه قبل', nextMonth: 'ماه بعد', month: 'ماه', year: 'سال',
      hour: 'ساعت', minute: 'دقیقه', second: 'ثانیه', meridiem: 'قبل/بعد از ظهر', start: 'شروع', end: 'پایان', time: 'زمان', week: 'هفته',
      dialog: 'انتخاب تاریخ', rangePlaceholder: 'انتخاب محدوده', pickEnd: 'تاریخ پایان را انتخاب کنید',
      selected: 'انتخاب شد', cleared: 'انتخاب پاک شد', loadingHolidays: 'در حال بارگذاری تعطیلات', invalid: 'تاریخ نامعتبر',
      previewFormat: 'dddd D MMMM YYYY',
      compare: 'مقایسه', compareWith: 'مقایسه با', previousPeriod: 'دورهٔ قبل', previousYear: 'سال قبل', customRange: 'بازهٔ دلخواه', primaryRange: 'بازهٔ اصلی', compareRange: 'بازهٔ مقایسه', compareHint: 'بازهٔ مقایسه را انتخاب کنید',
      slotsLabel: 'زمان‌های قابل رزرو', pickDateFirst: 'برای دیدن زمان‌های قابل رزرو، ابتدا تاریخ را انتخاب کنید',
      holidaysTitle: 'تعطیلات', holidayFilter: 'نوع تعطیلی', noHolidays: 'در این بازه تعطیلی‌ای نیست', download: 'دانلود', exportLabel: 'خروجی',
      weekdaysAbbr: ['یکش', 'دوش', 'سه‌ش', 'چهار', 'پنج', 'جمعه', 'شنبه'], scrollLeft: 'پیمایش به چپ', scrollRight: 'پیمایش به راست',
      presetLast: '{n} روز گذشته', presetNext: '{n} روز آینده',
      presetReasons: { disabled: 'شامل روز غیرفعال است', short: 'کوتاه‌تر از حداقل بازهٔ مجاز', long: 'بلندتر از حداکثر بازهٔ مجاز', bounds: 'خارج از محدودهٔ مجاز', invalid: 'در دسترس نیست' },
      presetsLabel: 'بازه‌های سریع', years: 'سال‌ها', prevYears: 'سال‌های قبل', nextYears: 'سال‌های بعد', prevYear: 'سال قبل', nextYear: 'سال بعد',
      presets: { today: 'امروز', yesterday: 'دیروز', tomorrow: 'فردا', last7: '۷ روز گذشته', last14: '۱۴ روز گذشته', last30: '۳۰ روز گذشته', last90: '۹۰ روز گذشته', next7: '۷ روز آینده', next14: '۱۴ روز آینده', next30: '۳۰ روز آینده', thisWeek: 'این هفته', lastWeek: 'هفتهٔ گذشته', nextWeek: 'هفتهٔ آینده', weekToDate: 'از ابتدای هفته', thisMonth: 'این ماه', lastMonth: 'ماه گذشته', nextMonth: 'ماه آینده', monthToDate: 'از ابتدای ماه', thisQuarter: 'این فصل', lastQuarter: 'فصل گذشته', thisYear: 'امسال', lastYear: 'سال گذشته', yearToDate: 'از ابتدای سال' },
      holidayTypes: { official: 'تعطیل رسمی', religious: 'تعطیل مذهبی', weekly: 'تعطیل آخر هفته' }, estimated: 'تقریبی',
      religiousPattern: '\\((?:ع|ص|س)\\)|فطر|قربان|غدیر|تاسوعا|عاشورا|اربعین|مبعث|ولادت|شهادت|رحلت|قائم|نیمه شعبان',
      fixedHolidays: {
        '1-1': 'عید نوروز', '1-2': 'عید نوروز', '1-3': 'عید نوروز', '1-4': 'عید نوروز', '1-12': 'روز جمهوری اسلامی ایران', '1-13': 'روز طبیعت',
        '3-14': 'رحلت امام خمینی (ره)', '3-15': 'قیام خونین ۱۵ خرداد', '11-22': 'پیروزی انقلاب اسلامی ایران', '12-29': 'روز ملی شدن صنعت نفت ایران'
      },
      hijriTitles: {
        eidFitr: 'عید سعید فطر', eidFitr2: 'تعطیل به مناسبت عید سعید فطر', eidAdha: 'عید سعید قربان', ghadir: 'عید سعید غدیر خم',
        tasua: 'تاسوعای حسینی', ashura: 'عاشورای حسینی', arbaeen: 'اربعین حسینی', prophetDemise: 'رحلت حضرت رسول اکرم (ص)',
        imamReza: 'شهادت امام رضا (ع)', askari: 'شهادت امام حسن عسکری (ع)', prophetBirth: 'ولادت حضرت رسول اکرم (ص)',
        fatima: 'شهادت حضرت فاطمه زهرا (س)', aliBirth: 'ولادت امام علی (ع)', mabath: 'مبعث حضرت رسول اکرم (ص)',
        qaem: 'ولادت حضرت قائم عجل الله تعالی فرجه', aliMartyr: 'شهادت حضرت علی (ع)', sadiq: 'شهادت امام جعفر صادق (ع)'
      }
    }
  };
  /** Dari (Afghanistan) month names. Needs native-speaker review before production; holidays intentionally empty (Iranian list does not apply). */
  LOCALES['fa-AF'] = { ...LOCALES.fa, months: ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'], fixedHolidays: {}, religiousPattern: undefined };
  /** [hijriMonth, hijriDay (-1 = last day of month), titleKey] - Iranian official lunar holidays. */
  const HIJRI_EVENTS = [
    [1, 9, 'tasua'], [1, 10, 'ashura'], [2, 20, 'arbaeen'], [2, 28, 'prophetDemise'], [2, -1, 'imamReza'], [3, 8, 'askari'],
    [3, 17, 'prophetBirth'], [6, 3, 'fatima'], [7, 13, 'aliBirth'], [7, 27, 'mabath'], [8, 15, 'qaem'], [9, 21, 'aliMartyr'],
    [10, 1, 'eidFitr'], [10, 2, 'eidFitr2'], [10, 25, 'sadiq'], [12, 10, 'eidAdha'], [12, 18, 'ghadir']
  ];
  const RTL_LANGS = ['ar', 'he', 'fa', 'ur', 'ps', 'dv', 'yi', 'ku', 'ckb', 'sd', 'ug'];
  /** Month/weekday/AM-PM/digit names for a BCP-47 tag from the platform's Intl data (works for any language the runtime knows). */
  function intlNames(tag) {
    try {
      const f = o => new Intl.DateTimeFormat(tag, { ...o, timeZone: 'UTC' }), mo = f({ month: 'long' }), wl = f({ weekday: 'long' }), ws = f({ weekday: 'short' }), wn = f({ weekday: 'narrow' });
      const dp = h => { const p = f({ hour: 'numeric', hour12: true }).formatToParts(Date.UTC(2021, 0, 1, h)).find(x => x.type === 'dayPeriod'); return p ? p.value : null; };
      const nf = new Intl.NumberFormat(tag, { useGrouping: false }), dg = Array.from({ length: 10 }, (_, i) => nf.format(i));
      const lang = String(tag).toLowerCase().split('-')[0], day = i => Date.UTC(2021, 7, 1 + i); // 2021-08-01 is a Sunday
      return {
        dir: RTL_LANGS.includes(lang) ? 'rtl' : 'ltr', digits: dg.every((x, i) => x === String(i)) ? 'latn' : dg,
        months: Array.from({ length: 12 }, (_, i) => mo.format(Date.UTC(2021, i, 15))),
        weekdays: Array.from({ length: 7 }, (_, i) => wl.format(day(i))), weekdaysAbbr: Array.from({ length: 7 }, (_, i) => ws.format(day(i))), weekdaysShort: Array.from({ length: 7 }, (_, i) => wn.format(day(i))),
        am: dp(9) || 'AM', pm: dp(15) || 'PM'
      };
    } catch (e) { return {}; }
  }
  /** First weekday (0 = Sunday) and weekend days of a locale (Intl.Locale weekInfo when available). */
  function weekInfo(tag) {
    try { const l = new Intl.Locale(tag), w = l.getWeekInfo ? l.getWeekInfo() : l.weekInfo; if (w) return { first: w.firstDay % 7, weekend: w.weekend.map(x => x % 7) }; } catch (e) { /* ignore */ }
    return { first: /^(en(-US|-CA)?|ja|ko|zh|he|hi|pt-BR|es-MX)$/i.test(String(tag)) ? 0 : 1, weekend: [6, 0] };
  }
  function resolveLocale(spec, calId) {
    if (calId === 'gregorian') {
      const over = isObj(spec) ? spec : null, tag = (over ? over.base : spec) || 'en', lang = String(tag).split('-')[0];
      const l = { ...LOCALES.en, ...(LOCALES[lang] || {}), ...(LOCALES[tag] || {}), ...intlNames(tag), ...(over || {}), fixedHolidays: {}, hijriTitles: {} };
      for (const k of ['holidayTypes', 'presets', 'presetReasons']) l[k] = { ...LOCALES.en[k], ...(LOCALES[lang] || {})[k], ...(LOCALES[tag] || {})[k], ...(over || {})[k] };
      l.tag = tag;
      return l;
    }
    let base = 'fa', over = null;
    if (isObj(spec)) { over = spec; base = spec.base || 'fa'; } else if (spec) base = spec;
    const l = { ...LOCALES.en, ...(LOCALES[base] || LOCALES.fa), ...(over || {}) };
    l.holidayTypes = { ...LOCALES.en.holidayTypes, ...(LOCALES[base] || {}).holidayTypes, ...(over || {}).holidayTypes };
    return l;
  }

  /* ==========================================================================
   * 5. Formatter / Parser (single implementation for every output path)
   * ======================================================================== */
  const PRESET_IDS = ['today', 'yesterday', 'tomorrow', 'last7', 'last14', 'last30', 'last90', 'next7', 'next14', 'next30', 'thisWeek', 'lastWeek', 'nextWeek', 'weekToDate', 'thisMonth', 'lastMonth', 'nextMonth', 'monthToDate', 'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear', 'yearToDate'];
  /** Built-in quick ranges as [startKey, endKey] relative to today's key `t`; `fd` = first weekday. `lastN` / `nextN` accept any N. */
  function presetRange(id, t, fd) {
    const tj = keyJDN(t), d = unK(t), mEnd = (y, m) => K(y, m, J.monthLength(y, m)), k = jdnKey;
    const wk = j => { const s0 = j - wmod(J.dayOfWeek(j) - fd, 7); return [k(s0), k(s0 + 6)]; };
    const mo = n => { const q = unK(addMonths(K(d.jy, d.jm, 1), n)); return [K(q.jy, q.jm, 1), mEnd(q.jy, q.jm)]; };
    const qt = n => { const b = d.jy * 4 + div(d.jm - 1, 3) + n, y = Math.floor(b / 4), q = b - y * 4; return [K(y, q * 3 + 1, 1), mEnd(y, q * 3 + 3)]; };
    const yr = n => [K(d.jy + n, 1, 1), mEnd(d.jy + n, 12)];
    const m = /^(last|next)(\d+)$/.exec(id);
    if (m) { const n = +m[2]; if (n < 1 || n > 3660) return null; return m[1] === 'last' ? [k(tj - n + 1), t] : [t, k(tj + n - 1)]; }
    switch (id) {
      case 'today': return [t, t];
      case 'yesterday': return [k(tj - 1), k(tj - 1)];
      case 'tomorrow': return [k(tj + 1), k(tj + 1)];
      case 'thisWeek': return wk(tj);
      case 'lastWeek': return wk(tj - 7);
      case 'nextWeek': return wk(tj + 7);
      case 'weekToDate': return [wk(tj)[0], t];
      case 'thisMonth': return mo(0);
      case 'lastMonth': return mo(-1);
      case 'nextMonth': return mo(1);
      case 'monthToDate': return [K(d.jy, d.jm, 1), t];
      case 'thisQuarter': return qt(0);
      case 'lastQuarter': return qt(-1);
      case 'thisYear': return yr(0);
      case 'lastYear': return yr(-1);
      case 'yearToDate': return [K(d.jy, 1, 1), t];
      default: return null;
    }
  }
  const hijriCache = new Map();
  let hijriFmt;
  function hijriOf(jdn) {
    if (hijriCache.has(jdn)) return hijriCache.get(jdn);
    let r = null;
    try {
      hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });
      if (/islamic/.test(hijriFmt.resolvedOptions().calendar)) {
        const g = d2g(jdn), o = {};
        for (const p of hijriFmt.formatToParts(Date.UTC(g.gy, g.gm - 1, g.gd, 12))) o[p.type] = +p.value;
        r = { m: o.month, d: o.day };
      }
    } catch (e) { /* no Intl calendar support */ }
    hijriCache.set(jdn, r);
    return r;
  }
  /** Small secondary label under each day number (always Latin digits). */
  function secondaryText(cell, kind) {
    if (kind === 'gregorian') { const g = cell.gregorian; return g.gd === 1 ? g.gm + '/' + g.gd : String(g.gd); }
    if (kind === 'jalali') { const q = JAL.fromJDN(cell.jdn); return q.jd === 1 ? q.jm + '/' + q.jd : String(q.jd); }
    if (kind === 'hijri') { const h = hijriOf(cell.jdn); return h ? (h.d === 1 ? h.m + '/' + h.d : String(h.d)) : ''; }
    return '';
  }
  const TOKEN_RE = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|m|ss|s|A/g;
  /** ctx = { loc, cal: 'jalali'|'gregorian', digits: 'fa'|'latn' } */
  function format(v, fmt, ctx) {
    const jdn = J.toJDN(v.jy, v.jm, v.jd);
    let y = v.jy, m = v.jm, d = v.jd;
    if (ctx.cal !== CAL.id) { const t = ctx.cal === 'gregorian' ? GRE.fromJDN(jdn) : JAL.fromJDN(jdn); y = t.jy; m = t.jm; d = t.jd; }
    const h = v.hour | 0, mi = v.minute | 0, s = v.second | 0, dow = J.dayOfWeek(jdn), loc = ctx.loc;
    const mn = (ctx.months || (ctx.cal === 'gregorian' ? GREG_MONTHS : loc.months))[m - 1];
    const map = {
      YYYY: pad(y, 4), YY: pad(y % 100), MMMM: mn, MMM: mn, MM: pad(m), M: m, dddd: loc.weekdays[dow], ddd: loc.weekdaysShort[dow],
      DD: pad(d), D: d, HH: pad(h), H: h, hh: pad(h % 12 || 12), h: h % 12 || 12, mm: pad(mi), m: mi, ss: pad(s), s, A: h < 12 ? loc.am : loc.pm
    };
    return String(fmt).replace(TOKEN_RE, (t, esc) => (esc !== undefined ? esc : toDigits(map[t], ctx.digits)));
  }
  const normMer = s => String(s).replace(/[.\s]/g, '').toLowerCase();
  /** Lenient parser. Returns {jy,jm,jd,hour,minute,second,hasTime} or null. Never throws. */
  function parse(str, ctx) {
    let s = fromDigits(str == null ? '' : str).trim();
    if (!s) return null;
    let hour = 0, minute = 0, second = 0, hasTime = false;
    const tm = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([A-Za-z\u0600-\u06FF.]+))?/);
    if (tm) {
      hasTime = true; hour = +tm[1]; minute = +tm[2]; second = +(tm[3] || 0);
      if (tm[4]) {
        const x = normMer(tm[4]);
        if (x === normMer(ctx.loc.pm) || x === 'pm') { if (hour < 12) hour += 12; }
        else if ((x === normMer(ctx.loc.am) || x === 'am') && hour === 12) hour = 0;
      }
      s = s.replace(tm[0], ' ').trim();
    }
    if (hour > 23 || minute > 59 || second > 59) return null;
    if (ctx.timeOnly && hasTime && !s) { const t = ctx.todayFn(); return { jy: t.jy, jm: t.jm, jd: t.jd, hour, minute, second, hasTime: true }; } // "14:30" in a time-only picker
    let y, m, d, mt;
    if ((mt = s.match(/(\d{1,4})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{1,4})/))) {
      if (mt[1].length === 4) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
      else if (mt[3].length === 4) { if (ctx.mdy) { m = +mt[1]; d = +mt[2]; } else { d = +mt[1]; m = +mt[2]; } y = +mt[3]; }
      else return null;
    } else if (ctx.month && (mt = s.match(/^(\d{4})\s*[/.\-]\s*(\d{1,2})$/))) {
      y = +mt[1]; m = +mt[2]; d = 1;
    } else {
      const names = (ctx.months || (ctx.cal === 'gregorian' ? GREG_MONTHS : ctx.loc.months)).map(n => n.toLowerCase());
      const toks = s.toLowerCase().split(/[\s,\u060c]+/).filter(Boolean);
      const mi = toks.findIndex(t => names.includes(t));
      const nums = toks.filter(t => /^\d+$/.test(t));
      if (mi < 0 || (nums.length !== 2 && !(ctx.month && nums.length === 1))) return null;
      m = names.indexOf(toks[mi]) + 1;
      const yi = nums.findIndex(t => t.length === 4);
      if (yi < 0) return null;
      y = +nums[yi]; d = nums.length === 2 ? +nums[1 - yi] : 1;
    }
    if (ctx.cal !== CAL.id) { // typed in another calendar -> convert to the picker's calendar
      const src = ctx.cal === 'gregorian' ? GRE : JAL;
      if (!src.isValid(y, m, d)) return null;
      return { ...CAL.fromJDN(src.toJDN(y, m, d)), hour, minute, second, hasTime };
    }
    if (!J.isValid(y, m, d)) return null;
    return { jy: y, jm: m, jd: d, hour, minute, second, hasTime };
  }
  function parseTimeStr(t) {
    if (t == null || t === '') return null;
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(fromDigits(t).trim());
    if (!m || +m[1] > 23 || +m[2] > 59 || +(m[3] || 0) > 59) return null;
    return +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0);
  }
  const secToT = sec => ({ hour: div(sec, 3600), minute: div(mod(sec, 3600), 60), second: mod(sec, 60) });
  const tToSec = t => t.hour * 3600 + t.minute * 60 + t.second;
  const to12 = h => ({ h: h % 12 || 12, pm: h >= 12 });
  const to24 = (h12, pm) => (h12 % 12) + (pm ? 12 : 0);
  const ymIdx = ym => div(ym, 100) * 12 + mod(ym, 100) - 1; // YYYYMM -> linear month index
  const keyOf = v => (v == null ? null : typeof v === 'number' ? v : isObj(v) && 'jy' in v ? K(v.jy, v.jm, v.jd) : null);

  /* ==========================================================================
   * 6. Emitter - the ONLY path for events (internal + public callbacks)
   * ======================================================================== */
  class Emitter {
    constructor() { this._h = new Map(); }
    on(n, f) { (this._h.get(n) || this._h.set(n, new Set()).get(n)).add(f); return () => this.off(n, f); }
    once(n, f) { const off = this.on(n, p => { off(); return f(p); }); return off; }
    off(n, f) { const s = this._h.get(n); if (s) { if (f) s.delete(f); else s.clear(); } }
    /** Returns false if any listener returned false (cancelable events). */
    emit(n, p) {
      let ok = true;
      const s = this._h.get(n);
      if (s) for (const f of [...s]) { try { if (f(p) === false) ok = false; } catch (e) { console.error('[iZiDatePicker] listener error', e); } }
      return ok;
    }
    clear() { this._h.clear(); }
  }

  /* ==========================================================================
   * 7. HolidayProvider - layered, offline-first, async-capable
   *
   *  L1 fixed recurring official holidays (locale titles)  - always offline
   *  L2 weekly days off (default Friday)                   - always additive
   *  L3 bundled/lazy per-year data (JSON)                  - AUTHORITATIVE for that year
   *  L4 async provider(jy)                                 - AUTHORITATIVE for that year
   *  L5 optional Hijri estimate (Intl umalqura)            - opt-in, flagged `estimated`
   *
   *  Resolution for a year: L3/L4 data (if any) replaces L1+L5; otherwise L1 (+L5).
   *  L2 is added in every case. Failures fall back to L1(+L5) and are retried later.
   * ======================================================================== */
  const TYPE_ORDER = ['religious', 'official', 'weekly'];
  const isReligious = t => Object.values(LOCALES).some(l => l.religiousPattern && new RegExp(l.religiousPattern).test(t));

  const SYNC_TYPES = new Set(['json', 'map', 'dom']);
  const icsEsc = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const icsFold = ln => { const cps = Array.from(ln), n = /[^\x00-\x7f]/.test(ln) ? 24 : 73; if (cps.length <= n) return ln; const out = []; for (let i = 0; i < cps.length; i += n) out.push((i ? ' ' : '') + cps.slice(i, i + n).join('')); return out.join('\r\n'); };
  /** items: [{ gy, gm, gd, title, type }] -> RFC 5545 all-day events. */
  function buildICS(items) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//izi-datepicker//holidays//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const it of items) {
      const a = it.gy * 10000 + it.gm * 100 + it.gd, nx = d2g(g2d(it.gy, it.gm, it.gd) + 1);
      L.push('BEGIN:VEVENT', 'UID:izi-' + a + '-' + it.type + '@izi-datepicker', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + (nx.gy * 10000 + nx.gm * 100 + nx.gd), icsFold('SUMMARY:' + icsEsc(it.title)), 'CATEGORIES:' + it.type, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  const csvCell = v => { const t = String(v == null ? '' : v); return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const buildCSV = items => ['date,local_date,weekday,title,type,estimated'].concat(items.map(i => [i.date, i.localDate, i.weekday, i.title, i.type, i.estimated ? 'true' : 'false'].map(csvCell).join(','))).join('\r\n') + '\r\n';
  const dig = (o, path) => String(path).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  /** iCalendar (.ics) -> [{date:'YYYY-MM-DD', title, type?}] */
  function parseICS(text) {
    const out = [];
    let ev = null;
    for (const ln of String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
      if (ln === 'BEGIN:VEVENT') ev = {};
      else if (ln === 'END:VEVENT') { if (ev && ev.date) out.push(ev); ev = null; }
      else if (ev) {
        const i = ln.indexOf(':');
        if (i < 0) continue;
        const key = ln.slice(0, i).split(';')[0].toUpperCase(), v = ln.slice(i + 1);
        if (key === 'DTSTART') { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v); if (m) ev.date = m[1] + '-' + m[2] + '-' + m[3]; }
        else if (key === 'SUMMARY') ev.title = v.replace(/\\n/g, ' ').replace(/\\([,;\\])/g, '$1');
        else if (key === 'CATEGORIES' && /relig/i.test(v)) ev.type = 'religious';
      }
    }
    return out;
  }
  /** CSV (header row; , ; or tab) -> rows keyed by date|shamsiDate|jm|jd|title|type. */
  function parseCSV(text) {
    const t = String(text).replace(/^\uFEFF/, ''), delim = (t.split('\n')[0].match(/[;\t,]/) || [','])[0], rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur);
    if (row.some(x => x !== '')) rows.push(row);
    const alias = { shamsidate: 'shamsiDate', jdate: 'shamsiDate', name: 'title', description: 'title', holidaydesription: 'title' };
    const head = (rows.shift() || []).map(h => { const x = h.trim().toLowerCase(); return alias[x] || x; });
    return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }
  const mapFields = (list, f, tm) => list.map(it => {
    const o = {};
    for (const k in f) o[k] = typeof f[k] === 'function' ? f[k](it) : dig(it, f[k]);
    if (tm && o.type != null) o.type = tm[o.type] || o.type;
    return o;
  });

  class HolidayProvider {
    constructor(hooks) {
      this.hooks = hooks; // { loaded(year, source), failed(year, err) }
      this.years = new Map(); this.pend = new Map(); this.fail = new Map(); this.hj = new Map();
      this.dead = false; this.gen = 0; this.sources = []; this.hash = {}; this.stale = new Set(); this.reval = new Set(); this.mf = new Map();
    }
    configure(cfg, weekly, loc) {
      this.on = cfg !== false;
      cfg = isObj(cfg) ? cfg : {};
      this.cfg = { fixed: 'fallback', hijri: false, cache: 'memory', cacheTtlDays: 30, cacheKey: '', retryMs: 60000, merge: 'first', timeoutMs: 8000, data: null, url: null, provider: null, ...cfg };
      const S = [];
      if (cfg.data) S.push({ type: 'json', data: cfg.data });
      if (cfg.url) S.push({ type: 'url', url: cfg.url });
      if (cfg.provider) S.push({ type: 'provider', fn: cfg.provider });
      for (const x of cfg.sources || []) if (x && x.type) S.push(x);
      this.sources = S;
      this.weekly = new Set(weekly || []);
      this.loc = loc;
      this.fixed = Array.isArray(this.cfg.fixed) ? this._norm(this.cfg.fixed) : null;
      this.gen++; this.years.clear(); this.hj.clear(); this.hash = {}; this.stale.clear(); this.reval.clear(); this.mf.clear();
    }
    _async() { return this.sources.some(x => !SYNC_TYPES.has(x.type)); }  // pack / url / api / provider sources are asynchronous
    _loader() { return this._async(); }
    _inRange(x, jy) { return !((x.years && !x.years.includes(jy)) || (x.from && jy < x.from) || (x.to && jy > x.to)); }
    /** Date-keyed object -> raw items. Keys: 'YYYY-MM-DD' (Gregorian), 'YYYY/MM/DD' (Jalali), 'MM-DD' or 'MM/DD' (recurring Jalali). */
    _fromMap(obj) {
      const out = [];
      for (const key in obj) {
        const v = obj[key], it = typeof v === 'string' ? { title: v } : { ...v };
        let m;
        if ((m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(fromDigits(key)))) { if (+m[1] >= 1700 || CAL.id !== 'jalali') it.date = m[1] + '-' + pad(m[2]) + '-' + pad(m[3]); else it.shamsiDate = m[1] + '/' + pad(m[2]) + '/' + pad(m[3]); }
        else if ((m = /^(\d{1,2})[-/](\d{1,2})$/.exec(fromDigits(key)))) { it.jm = +m[1]; it.jd = +m[2]; }
        else continue;
        out.push(it);
      }
      return out;
    }
    /** Accepts [{jm,jd,title,type}], {data:[{shamsiDate|date, holidayDesription|title, isHoliday}]}, or a date-keyed map. Year-tagged items for other years are dropped. */
    _norm(raw, jy) {
      const a = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.data) ? raw.data : isObj(raw) ? this._fromMap(raw) : [];
      const out = [], seen = new Set();
      for (const it of a) {
        if (!isObj(it) || it.isHoliday === false) continue;
        let jm = it.jm != null ? it.jm : it.m, jd = it.jd != null ? it.jd : it.d, iy = null, mt;
        if (it.shamsiDate && CAL.id !== 'jalali') continue; // Jalali-dated rows do not apply to other calendars
        if (it.shamsiDate && (mt = /(\d+)\D+(\d+)\D+(\d+)/.exec(fromDigits(it.shamsiDate)))) { iy = +mt[1]; jm = +mt[2]; jd = +mt[3]; }
        else if (jm == null && it.date && (mt = /(\d{4})\D+(\d+)\D+(\d+)/.exec(it.date))) { const j = J.toJalali(+mt[1], +mt[2], +mt[3]); iy = j.jy; jm = j.jm; jd = j.jd; }
        if (!(jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) || (jy != null && iy != null && iy !== jy)) continue;
        const title = String(it.title != null ? it.title : it.holidayDesription != null ? it.holidayDesription : it.description || '').replace(/^[\s\-\u2013]+/, '').trim();
        const sig = jm + '-' + jd + '-' + title;
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push({ jm, jd, title, type: TYPE_ORDER.includes(it.type) ? it.type : isReligious(title) ? 'religious' : 'official', estimated: !!it.estimated });
      }
      return out;
    }
    /** raw -> format parse -> transform -> path -> field mapping -> normalised entries */
    _prep(raw, x, jy) {
      let v = raw;
      if (x.format === 'ics') v = parseICS(v); else if (x.format === 'csv') v = parseCSV(v);
      if (x.transform) v = x.transform(v, jy);
      if (x.path) v = typeof x.path === 'function' ? x.path(v) : dig(v, x.path);
      if (Array.isArray(v)) { if (x.fields) v = mapFields(v, x.fields, x.typeMap); else if (x.typeMap) v = v.map(it => ({ ...it, type: x.typeMap[it.type] || it.type })); }
      return this._norm(v, jy);
    }
    _syncRaw(x, jy) {
      if (x.type === 'dom') { try { const e = document.querySelector(x.selector); return e ? JSON.parse(e.textContent) : null; } catch (e) { return null; } }
      const d = x.data;
      if (!d) return null;
      if (x.type === 'json' && isObj(d) && !Array.isArray(d) && !('data' in d)) return d[jy] !== undefined ? d[jy] : null; // per-year map {1405: payload}
      return d;
    }
    _sync(jy) {
      const out = [];
      for (const x of this.sources) {
        if (!SYNC_TYPES.has(x.type) || !this._inRange(x, jy)) continue;
        let l = [];
        try { l = this._prep(this._syncRaw(x, jy), x, jy); } catch (e) { console.error('[iZiDatePicker] holiday source error', e); }
        if (l.length) { out.push(...l); if (this.cfg.merge !== 'all') break; }
      }
      return out.length ? out : null;
    }
    _store(jy, list, src) {
      const auth = new Map();
      for (const e of list) { const k = e.jm + '-' + e.jd; (auth.get(k) || auth.set(k, []).get(k)).push(e); }
      const r = { auth, src, h: this.hash[jy] || null };
      this.gen++;
      this.years.set(jy, r);
      return r;
    }
    _ls() { try { return this.cfg.cache === 'storage' ? localStorage : null; } catch (e) { return null; } }
    _ck(jy) { return 'izi:h:' + (this.cfg.cacheKey ? this.cfg.cacheKey + ':' : '') + jy; }
    _cached(jy) {
      const ls = this._ls();
      if (!ls) return null;
      try {
        const c = JSON.parse(ls.getItem(this._ck(jy)) || 'null');
        if (c && Date.now() - c.t < this.cfg.cacheTtlDays * 864e5 && Array.isArray(c.v) && c.v.length) return c;
      } catch (e) { /* ignore */ }
      return null;
    }
    _year(jy) {
      const r = this.years.get(jy);
      if (r) return r;
      if (!(this.cfg.merge === 'all' && this._async())) { const l = this._sync(jy); if (l) return this._store(jy, l, 'local'); }
      const c = this.stale.has(jy) ? null : this._cached(jy);
      if (!c) return null;
      this.hash[jy] = c.h || null;
      return this._store(jy, c.v, 'cache');
    }
    /** Pack manifest ({ years: { "1405": { count, sha256 } } }), fetched once per provider. */
    _manifest(x) {
      if (!this.mf.has(x)) { const q = this._http(x, (x.base || '') + (x.manifest || 'manifest.json'), 'json').catch(e => { this.mf.delete(x); throw e; }); this.mf.set(x, q); }
      return this.mf.get(x);
    }
    async _fetch(x, jy) {
      if (x.type === 'provider') return x.fn(jy);
      if (x.type === 'pack') { // null = "this pack does not cover that year" (not an error)
        const m = await this._manifest(x), e = m && m.years && m.years[jy];
        if (!e) return null;
        const data = await this._http(x, (x.base || '') + String(x.file || '{year}.json').replace('{year}', jy), 'json');
        this.hash[jy] = e.sha256 || null;
        return data;
      }
      const g = J.toGregorian(jy, 1, 1), fill = u => String(u).replace(/\{year\}/g, jy).replace(/\{gy\}/g, g.gy).replace(/\{gy2\}/g, g.gy + 1);
      let url = typeof x.url === 'function' ? x.url(jy) : fill(x.url);
      if (x.params) {
        const q = new URLSearchParams();
        for (const k in x.params) { const v = typeof x.params[k] === 'function' ? x.params[k](jy) : x.params[k]; q.set(k, typeof v === 'string' ? fill(v) : v); }
        url += (url.includes('?') ? '&' : '?') + q;
      }
      return this._http(x, url, x.format, jy);
    }
    async _http(x, url, format, jy) {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), x.timeoutMs || this.cfg.timeoutMs) : 0;
      try {
        const h = typeof x.headers === 'function' ? x.headers(jy) : { ...(x.headers || {}) };
        let body = typeof x.body === 'function' ? x.body(jy) : x.body;
        if (body && typeof body === 'object') { body = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
        const res = await (x.fetch || fetch)(url, { method: x.method || (body ? 'POST' : 'GET'), headers: h, body, credentials: x.credentials, signal: ctl ? ctl.signal : undefined });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return /^(ics|csv|text)$/.test(format) ? res.text() : res.json();
      } finally { clearTimeout(to); }
    }
    /** A year served from the local cache is re-checked once per session against the pack manifest; a changed hash triggers a reload. */
    _revalidate(jy) {
      const x = this.sources.find(q => q.type === 'pack' && this._inRange(q, jy));
      if (!x) return;
      this._manifest(x).then(m => {
        const e = m && m.years && m.years[jy], r = this.years.get(jy);
        if (e && r && r.src === 'cache' && r.h !== e.sha256 && !this.dead) { this.stale.add(jy); this.years.delete(jy); this.request(jy); }
      }).catch(() => {});
    }
    /** Resolves when the year's data has loaded (or failed / is unavailable) - never rejects. */
    ready(jy) { this.request(jy); const q = this.pend.get(jy); return q ? q.then(() => {}, () => {}) : Promise.resolve(); }
    /** Kick off a lazy load for the year if needed. Idempotent; sources are tried in order (merge:'first') or all combined (merge:'all'). */
    request(jy) {
      if (!this.on || this.dead || !this._async() || this.pend.has(jy)) return;
      const r0 = this._year(jy);
      if (r0) { if (r0.src === 'cache' && !this.reval.has(jy) && this.sources.some(q => q.type === 'pack')) { this.reval.add(jy); this._revalidate(jy); } return; }
      const f = this.fail.get(jy);
      if (f && Date.now() - f < this.cfg.retryMs) return;
      const merge = this.cfg.merge === 'all';
      const p = (async () => {
        const all = [], used = [];
        let err, uncovered = false;
        for (const x of this.sources) {
          if (!this._inRange(x, jy) || (SYNC_TYPES.has(x.type) && !merge)) continue;
          try {
            const raw = SYNC_TYPES.has(x.type) ? this._syncRaw(x, jy) : await this._fetch(x, jy);
            if (raw === null && x.type === 'pack') { uncovered = true; continue; }
            const l = this._prep(raw, x, jy);
            if (l.length) { all.push(...l); used.push(x.name || x.type); if (!merge) break; } else err = err || new Error('empty holiday data');
          } catch (e) { err = e; }
        }
        if (!all.length) { if (!err && uncovered) return null; throw err || new Error('no holiday source'); }
        const list = this._norm(all, jy);
        this._store(jy, list, used.join('+'));
        this.stale.delete(jy);
        const ls = this._ls();
        if (ls) try { ls.setItem(this._ck(jy), JSON.stringify({ t: Date.now(), v: list, h: this.hash[jy] || null })); } catch (e) { /* quota */ }
        return used.join('+');
      })();
      this.pend.set(jy, p);
      p.then(src => { this.pend.delete(jy); if (src === null) { this.fail.set(jy, Date.now()); return; } if (!this.dead) this.hooks.loaded(jy, src); },
        e => { this.pend.delete(jy); this.fail.set(jy, Date.now()); if (!this.dead) this.hooks.failed(jy, e); });
    }
    _hijri(jy) {
      let c = this.hj.get(jy);
      if (c) return c;
      c = new Map();
      this.hj.set(jy, c);
      let f;
      try { f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric' }); } catch (e) { return c; }
      if (!/islamic/.test(f.resolvedOptions().calendar)) return c;
      const n = J.isLeap(jy) ? 366 : 365, s = J.toJDN(jy, 1, 1), parts = [];
      for (let i = 0; i <= n; i++) {
        const g = d2g(s + i), o = {};
        for (const p of f.formatToParts(Date.UTC(g.gy, g.gm - 1, g.gd, 12))) o[p.type] = +p.value;
        parts.push(o);
      }
      for (let i = 0; i < n; i++) {
        const h = parts[i], nx = parts[i + 1], j = J.fromJDN(s + i), k = j.jm + '-' + j.jd;
        for (const [hm, hd, id] of HIJRI_EVENTS) {
          if (h.month === hm && (hd > 0 ? h.day === hd : nx.month !== hm)) {
            (c.get(k) || c.set(k, []).get(k)).push({ jm: j.jm, jd: j.jd, title: this.loc.hijriTitles[id] || id, type: 'religious', estimated: true });
          }
        }
      }
      return c;
    }
    /** Sync lookup. Returns null for an ordinary day. */
    getDay(jy, jm, jd) {
      if (!this.on) return null;
      const k = jm + '-' + jd, entries = [];
      let loading = false;
      const r = this._year(jy);
      if (r) { const a = r.auth.get(k); if (a) entries.push(...a); }
      else loading = this._loader() && !this.fail.has(jy);
      if (!r || this.cfg.fixed === 'always') {
        if (this.cfg.fixed !== false && !(r && entries.length)) {
          if (this.fixed) this.fixed.forEach(e => { if (e.jm === jm && e.jd === jd) entries.push(e); });
          else if (this.loc.fixedHolidays[k]) entries.push({ type: 'official', title: this.loc.fixedHolidays[k] });
        }
        if (!r && this.cfg.hijri && CAL.id === 'jalali') { const h = this._hijri(jy).get(k); if (h) entries.push(...h); }
      }
      if (this.weekly.has(J.dayOfWeek(J.toJDN(jy, jm, jd)))) entries.push({ type: 'weekly', title: this.loc.holidayTypes.weekly });
      if (!entries.length && !loading) return null;
      const types = TYPE_ORDER.filter(t => entries.some(e => e.type === t));
      return {
        types, primary: types[0] || null, loading,
        titles: [...new Set(entries.filter(e => e.type !== 'weekly' || entries.length === 1).map(e => e.title).filter(Boolean))],
        estimated: entries.some(e => e.estimated)
      };
    }
    destroy() { this.dead = true; this.years.clear(); this.pend.clear(); }
  }

  /* ==========================================================================
   * 8. CalendarModel - state machine, ZERO DOM
   *    state: view{jy,jm}, focus(key), value/draft{start,end}, pending, hover, t{start,end}
   *    Range semantics: start/end are INCLUSIVE endpoints; `inRange` is the STRICT
   *    interior (endpoints excluded; they carry `selected: 'start'|'end'|'both'`).
   * ======================================================================== */
  class CalendarModel {
    constructor() {
      this.view = { jy: 1400, jm: 1 }; this.focus = 0; this.value = { start: null, end: null, list: [], cmp: null };
      this.draft = { start: null, end: null, list: [], cmp: null }; this.pending = false; this.hover = 0; this.t = null; this.c = null;
      this.cmp = { enabled: false, mode: 'previousPeriod', target: 'primary' }; this.cmpPend = null; this.cmpDefault = false;
    }
    configure(c) {
      this.c = c;
      if (!this.t) this.t = { start: this._defT('start'), end: this._defT('end') };
      else { this.t.start = this._clampT(this.t.start); this.t.end = this._clampT(this.t.end); }
      const b = this.bounds();
      this.setView(this.view.jy, this.view.jm);
      if (!this.focus) this.focus = K(this.view.jy, this.view.jm, 1);
      return b;
    }
    today() { return nowIn(this.c.timeZone); }
    _defT(which) { return this._clampT(secToT(which === 'end' ? this.c.defEnd : this.c.defStart)); }
    _clampT(t) {
      if (!this.c.time) return { hour: 0, minute: 0, second: 0 };
      return secToT(clamp(tToSec(t), this.c.minT, this.c.maxT));
    }
    /* ----- constraints ----- */
    isDisabled(k, hol) {
      const c = this.c, jy = div(k, 10000);
      if (jy < c.minYear || jy > c.maxYear) return true;
      if ((c.minKey && k < c.minKey) || (c.maxKey && k > c.maxKey)) return true;
      if (c.past && k < dtKey(this.today())) return true;
      if (c.future && k > dtKey(this.today())) return true;
      if (c.disabledKeys.has(k)) return true;
      for (const r of c.disabledRanges) if (k >= r[0] && k <= r[1]) return true;
      const dow = J.dayOfWeek(keyJDN(k));
      if (c.disabledWeekdays.has(dow)) return true;
      if (c.disableHolidays && hol && hol.types.some(t => c.disableHolidays.has(t))) return true;
      if (c.isDateDisabled) {
        const d = unK(k);
        try { if (c.isDateDisabled({ ...d, key: k, weekday: dow })) return true; } catch (e) { console.error(e); }
      }
      return false;
    }
    bounds() {
      const c = this.c;
      let lo = c.minYear * 100 + 1, hi = c.maxYear * 100 + 12;
      if (c.minKey) lo = Math.max(lo, div(c.minKey, 100));
      if (c.maxKey) hi = Math.min(hi, div(c.maxKey, 100));
      if (lo > hi) { lo = c.minYear * 100 + 1; hi = c.maxYear * 100 + 12; }
      return (this._b = { lo, hi });
    }
    /* ----- navigation ----- */
    setView(jy, jm) {
      const b = this.bounds(), N = this.c.months || 1;
      const i = clamp(jy * 12 + jm - 1, ymIdx(b.lo), Math.max(ymIdx(b.lo), ymIdx(b.hi) - (N - 1)));
      const n = { jy: Math.floor(i / 12), jm: mod(i, 12) + 1 };
      const changed = n.jy !== this.view.jy || n.jm !== this.view.jm;
      this.view = n;
      const fi = ymIdx(div(this.focus, 100));
      if (!this.focus || fi < i || fi > i + N - 1) this.focus = K(n.jy, n.jm, Math.min(this.focus ? mod(this.focus, 100) : 1, J.monthLength(n.jy, n.jm)));
      return changed;
    }
    canShift(n) {
      const N = this.c.months || 1, b = this._b || this.bounds(), i = this.view.jy * 12 + this.view.jm - 1 + n;
      return i >= ymIdx(b.lo) && i + N - 1 <= ymIdx(b.hi);
    }
    shift(n) {
      if (!this.canShift(n)) return false;
      const i = this.view.jy * 12 + this.view.jm - 1 + n;
      return this.setView(Math.floor(i / 12), mod(i, 12) + 1);
    }
    setFocus(k) {
      const c = this.c, N = c.months || 1;
      k = clamp(k, K(c.minYear, 1, 1), K(c.maxYear, 12, J.monthLength(c.maxYear, 12)));
      const d = unK(k);
      if (!J.isValid(d.jy, d.jm, d.jd)) k = K(d.jy, d.jm, J.monthLength(d.jy, d.jm));
      this.focus = k;
      const fi = ymIdx(div(k, 100)), vi = this.view.jy * 12 + this.view.jm - 1;
      if (fi >= vi && fi <= vi + N - 1) return false; // already visible in one of the displayed months
      const t = fi < vi ? fi : fi - (N - 1);
      return this.setView(Math.floor(t / 12), mod(t, 12) + 1);
    }
    /* ----- selection ----- */
    _dt(k, which, prev) {
      const t = prev ? { hour: prev.hour, minute: prev.minute, second: prev.second } : this.t[which];
      return { ...unK(k), ...this._clampT(t) };
    }
    _spans(a, b) {
      const ja = keyJDN(a), jb = keyJDN(b);
      for (let j = ja; j <= jb && j - ja < 4000; j++) if (this.isDisabled(jdnKey(j))) return true;
      return false;
    }
    outOfBounds(k) { const c = this.c, y = div(k, 10000); return y < c.minYear || y > c.maxYear || !!((c.minKey && k < c.minKey) || (c.maxKey && k > c.maxKey)); }
    /** Why [a,b] cannot be selected: 'bounds' | 'disabled' | 'short' | 'long' | null. */
    rangeIssue(a, b) {
      const c = this.c;
      if (this.outOfBounds(a) || this.outOfBounds(b)) return 'bounds';
      if (this.isDisabled(a) || this.isDisabled(b)) return 'disabled';
      if (c.range && !c.week) { const n = keyJDN(b) - keyJDN(a) + 1; if (c.minRange && n < c.minRange) return 'short'; if (c.maxRange && n > c.maxRange) return 'long'; }
      if (c.range && !c.spanDisabled && this._spans(a, b)) return 'disabled';
      return null;
    }
    _rangeBad(a, b) {
      const n = keyJDN(b) - keyJDN(a) + 1, c = this.c;
      return !!((c.minRange && n < c.minRange) || (c.maxRange && n > c.maxRange));
    }
    /** @returns 'start'|'end'|'single'|'restart'|'toggle'|'rejected' */
    select(k, hol) {
      if (this.isDisabled(k, hol)) return 'rejected';
      const d = this.draft, c = this.c;
      if (c.month) { d.start = this._dt(K(div(k, 10000), div(mod(k, 10000), 100), 1), 'start'); d.end = null; return 'single'; }
      if (c.multiple) {
        const i = d.list.findIndex(x => dtKey(x) === k);
        if (i >= 0) d.list.splice(i, 1);
        else {
          if (c.maxDates && d.list.length >= c.maxDates) return 'rejected';
          d.list.push(this._dt(k, 'start'));
          d.list.sort((a, b) => dtKey(a) - dtKey(b));
        }
        d.start = d.list[0] || null;
        return 'toggle';
      }
      if (c.week) {
        const j = keyJDN(k), s0 = j - wmod(J.dayOfWeek(j) - c.firstDay, 7), a = jdnKey(s0), b = jdnKey(s0 + 6);
        if (!c.spanDisabled && this._spans(a, b)) return 'rejected';
        d.start = this._dt(a, 'start'); d.end = this._dt(b, 'end'); this.pending = false;
        this.computeCmp();
        return 'end';
      }
      if (!c.range) { d.start = this._dt(k, 'start', null); d.end = c.slotDur ? this._slotEnd(d.start) : null; return 'single'; }
      if (!this.pending) { d.start = this._dt(k, 'start'); d.end = null; if (this.cmp.mode !== 'custom') d.cmp = null; this.pending = true; this.hover = 0; return 'start'; }
      const s = dtKey(d.start);
      if (k < s && c.backtrack === 'restart') { d.start = this._dt(k, 'start'); d.end = null; return 'restart'; }
      const a = Math.min(k, s), b = Math.max(k, s);
      if (this._rangeBad(a, b)) return 'rejected';
      if (!c.spanDisabled && this._spans(a, b)) { d.start = this._dt(k, 'start'); d.end = null; return 'restart'; }
      if (k < s) { const old = d.start; d.start = this._dt(k, 'start', old); d.end = this._dt(s, 'end'); }
      else d.end = this._dt(k, 'end');
      this.pending = false; this.hover = 0;
      this._order('end');
      this.computeCmp();
      return 'end';
    }
    /** time-only pickers keep a draft anchored on today so Confirm is available without touching a selector */
    ensureTimeDraft() {
      const c = this.c, tk = dtKey(this.today());
      if (!c.timeOnly) return;
      if (!this.draft.start) this.draft.start = this._dt(tk, 'start');
      if (c.range && !this.draft.end) this.draft.end = this._dt(tk, 'end');
      this._order('start');
    }
    _slotEnd(start) { return { ...start, ...secToT(Math.min(tToSec(start) + this.c.slotDur, 86399)) }; }
    setTime(which, patch) {
      if (!this.c.time) return;
      if (this.c.timeOnly) this.ensureTimeDraft();
      this.t[which] = this._clampT({ ...this.t[which], ...patch });
      const dt = this.draft[which];
      if (dt) Object.assign(dt, this.t[which]);
      if (this.c.slotDur && which === 'start' && this.draft.start) this.draft.end = this._slotEnd(this.draft.start);
      this._order(which);
    }
    _order(changed) {
      const { start, end } = this.draft;
      if (!this.c.range || !start || !end || dtKey(start) !== dtKey(end) || tToSec(end) >= tToSec(start)) return;
      const t = { hour: start.hour, minute: start.minute, second: start.second }; // same-day end never precedes start
      Object.assign(end, t);
      this.t.end = t;
    }
    complete() {
      const d = this.draft, c = this.c;
      if (c.multiple) return true;
      if (!c.range) return !!d.start;
      return !!(d.start && d.end) && (!(c.compare && this.cmp.enabled && this.cmp.mode === 'custom') || (!!d.cmp && !this.cmpPend));
    }
    /** Recompute the automatic comparison range (previous period / previous year) from the draft range. */
    computeCmp() {
      const c = this.c, d = this.draft, st = this.cmp;
      if (!c.compare || !st.enabled) { d.cmp = null; return; }
      if (st.mode === 'custom') { if (d.start && d.end && !d.cmp && !this.cmpPend) st.target = 'compare'; return; } // chosen by the user: clicks now go to the comparison range
      if (!d.start || !d.end) { d.cmp = null; return; }
      const a = dtKey(d.start), b = dtKey(d.end);
      let ca, cb;
      if (st.mode === 'previousYear') { ca = addMonths(a, -12); cb = addMonths(b, -12); }
      else { const len = keyJDN(b) - keyJDN(a) + 1; ca = jdnKey(keyJDN(a) - len); cb = jdnKey(keyJDN(a) - 1); }
      const bad = k => div(k, 10000) < c.minYear || div(k, 10000) > c.maxYear;
      d.cmp = bad(ca) || bad(cb) ? null : { start: this._dt(ca, 'start'), end: this._dt(cb, 'end') };
    }
    /** Day click while editing the comparison range (custom mode). */
    selectCmp(k) {
      const d = this.draft;
      if (!this.cmpPend) { this.cmpPend = this._dt(k, 'start'); d.cmp = null; return 'start'; }
      const s0 = dtKey(this.cmpPend), a = Math.min(s0, k), b = Math.max(s0, k);
      d.cmp = { start: this._dt(a, 'start'), end: this._dt(b, 'end') };
      this.cmpPend = null;
      return 'end';
    }
    _snap(x) { return { start: x.start ? { ...x.start } : null, end: x.end ? { ...x.end } : null, list: (x.list || []).map(v => ({ ...v })), cmp: x.cmp ? { start: { ...x.cmp.start }, end: { ...x.cmp.end } } : null }; }
    commit() {
      if (!this.complete()) return false;
      this.value = this._snap(this.draft);
      if (!(this.c.compare && this.cmp.enabled)) this.value.cmp = null;
      this.pending = false;
      return true;
    }
    cancel() {
      const v = this.value;
      this.draft = this._snap(v); this.pending = false; this.hover = 0; this.cmpPend = null; this.cmp.target = 'primary';
      if (this.c.compare) { this.cmp.enabled = v.start ? !!v.cmp : this.cmpDefault; if (v.cmp && this.cmp.mode !== 'custom' && false) this.cmp.mode = this.cmp.mode; if (!v.cmp) this.computeCmp(); }
      this.t = { start: v.start ? this._clampT(v.start) : this._defT('start'), end: v.end ? this._clampT(v.end) : this._defT('end') };
    }
    clear() {
      this.value = { start: null, end: null, list: [] }; this.draft = this._snap(this.value); this.pending = false; this.hover = 0;
      this.t = { start: this._defT('start'), end: this._defT('end') };
    }
    /** Programmatic set (already-parsed dt objects). Returns false when not selectable. */
    setValue(start, end, list, cmp) {
      const c = this.c;
      const hasT = dt => dt.hasTime === true || (dt.hasTime === undefined && dt.hour != null);
      const norm = (dt, w) => (dt ? { ...unK(dtKey(dt)), ...this._clampT(hasT(dt) ? { hour: dt.hour | 0, minute: dt.minute | 0, second: dt.second | 0 } : this.t[w]) } : null);
      if (c.multiple) {
        const l = (list || []).filter(Boolean);
        if (l.some(x => this.isDisabled(dtKey(x))) || (c.maxDates && l.length > c.maxDates)) return false;
        const n = l.map(x => norm(x, 'start')).sort((a, b) => dtKey(a) - dtKey(b));
        this.value = { start: n[0] || null, end: null, list: n }; this.draft = this._snap(this.value); this.pending = false;
        if (n[0]) this.setFocus(dtKey(n[0]));
        return true;
      }
      if (start) {
        if (c.month) start = { ...start, jd: 1 };
        if (c.week) { const j = keyJDN(dtKey(start)), s0 = j - wmod(J.dayOfWeek(j) - c.firstDay, 7); start = { ...start, ...unK(jdnKey(s0)) }; end = { ...end, ...unK(jdnKey(s0 + 6)), hasTime: false }; }
        if (this.isDisabled(dtKey(start)) || (end && this.isDisabled(dtKey(end)))) return false;
        if (end && dtKey(end) < dtKey(start)) [start, end] = [end, start];
        if (c.range && end && !c.week && this._rangeBad(dtKey(start), dtKey(end))) return false;
      }
      const s = norm(start, 'start'), e = c.range ? norm(end, 'end') : c.slotDur && s ? this._slotEnd(s) : null;
      this.value = { start: s, end: e, list: [], cmp: null };
      this.draft = this._snap(this.value);
      this.pending = false; this.cmpPend = null;
      if (c.compare && c.range && s && e) {
        if (cmp) { this.cmp.enabled = true; this.cmp.mode = 'custom'; this.draft.cmp = { start: norm(cmp.start, 'start'), end: norm(cmp.end, 'end') }; }
        else this.computeCmp();
        this.value.cmp = this.cmp.enabled && this.draft.cmp ? this._snap(this.draft).cmp : null;
      }
      if (s) { this.t.start = this._clampT(s); if (e) this.t.end = this._clampT(e); this.setFocus(dtKey(s)); }
      this._order('start');
      return true;
    }
    /** 42 cells (6 weeks) for the current view. Pure data - the headless contract. */
    monthData(holFn, mOff = 0) {
      const { jy, jm } = unK(addMonths(K(this.view.jy, this.view.jm, 1), mOff)), c = this.c, d = this.draft;
      const first = J.toJDN(jy, jm, 1), off = wmod(J.dayOfWeek(first) - c.firstDay, 7), start = first - off;
      const s = d.start ? dtKey(d.start) : 0, e = d.end ? dtKey(d.end) : 0;
      const sl = c.multiple ? new Set(d.list.map(dtKey)) : null;
      const hv = this.pending && this.hover && s && !c.week ? this.hover : 0;
      let h0 = 0, h1 = 0;
      if (c.week && this.hover) { const hj = keyJDN(this.hover); h0 = hj - wmod(J.dayOfWeek(hj) - c.firstDay, 7); h1 = h0 + 6; }
      const lenCheck = !!(this.pending && s && c.range && !c.week && (c.minRange || c.maxRange));
      const todayK = dtKey(this.today());
      const cs = d.cmp ? dtKey(d.cmp.start) : this.cmpPend ? dtKey(this.cmpPend) : 0, ce = d.cmp ? dtKey(d.cmp.end) : cs;
      const weeks = [];
      for (let r = 0; r < 6; r++) {
        const row = [];
        for (let col = 0; col < 7; col++) {
          const jdn = start + r * 7 + col, dd = J.fromJDN(jdn), k = K(dd.jy, dd.jm, dd.jd), dow = J.dayOfWeek(jdn);
          const hol = holFn ? holFn(dd.jy, dd.jm, dd.jd) : null;
          row.push({
            key: k, jy: dd.jy, jm: dd.jm, jd: dd.jd, jdn, gregorian: d2g(jdn), weekday: dow,
            outside: dd.jm !== jm || dd.jy !== jy, today: k === todayK,
            disabled: this.isDisabled(k, hol) || (lenCheck && this._rangeBad(Math.min(k, s), Math.max(k, s))),
            selected: sl ? (sl.has(k) ? 'start' : null) : k === s && k === e ? 'both' : k === s ? 'start' : k === e ? 'end' : null,
            inRange: !!(e && k > s && k < e),
            preview: h0 ? jdn >= h0 && jdn <= h1 : !!(hv && ((hv > s && k > s && k <= hv) || (hv < s && k < s && k >= hv))),
            weekend: c.weekend.has(dow), holiday: hol, focus: k === this.focus,
            cmp: cs ? (k === cs && k === ce ? 'both' : k === cs ? 'start' : k === ce ? 'end' : null) : null, cmpIn: !!(cs && k > cs && k < ce)
          });
        }
        weeks.push(row);
      }
      return weeks;
    }
    /** 12 month cells of the current view year (month-only mode). */
    monthGrid() {
      const jy = this.view.jy, s = this.draft.start, td = this.today();
      return Array.from({ length: 12 }, (_, i) => {
        const jm = i + 1, k = K(jy, jm, 1), last = K(jy, jm, J.monthLength(jy, jm));
        return { key: k, jy, jm, today: td.jy === jy && td.jm === jm, selected: !!(s && s.jy === jy && s.jm === jm), disabled: this.isDisabled(k) && this.isDisabled(last), focus: div(this.focus, 100) === jy * 100 + jm };
      });
    }
    weekNumber(midJdn) { // week containing >= 4 days of the Jalali year is week 1 (majority rule)
      const y = J.fromJDN(midJdn).jy, ys = J.toJDN(y, 1, 1);
      return div(midJdn - ys + wmod(J.dayOfWeek(ys) - this.c.firstDay, 7), 7) + 1;
    }
  }

  /* ==========================================================================
   * 9. CalendarView - state -> DOM.
   *    The tree is built ONCE and patched in place, so focus, <select> popups and
   *    scroll position survive every state change (v4 rebuilt innerHTML each time).
   *    Interaction is delegated by the Controller through data-act / .izi-day-cell.
   * ======================================================================== */
  const ICONS = {
    left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    clear: '<path d="M18 6L6 18M6 6l12 12"/>', today: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    confirm: '<polyline points="20 6 9 17 4 12"/>', cancel: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>'
  };
  const svg = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function setA(e, k, v) {
    if (v == null || v === false) { if (e.hasAttribute(k)) e.removeAttribute(k); }
    else { v = v === true ? '' : String(v); if (e.getAttribute(k) !== v) e.setAttribute(k, v); }
  }
  const setT = (e, t) => { if (e.textContent !== t) e.textContent = t; };
  function fill(sel, opts, val) {
    const k = opts.map(o => o.v + '\u0001' + o.t + (o.d ? '!' : '')).join('|');
    if (sel._k !== k) {
      sel.textContent = '';
      for (const o of opts) { const op = mkOpt(o.t, o.v); if (o.d) op.disabled = true; sel.append(op); }
      sel._k = k;
    }
    if (sel.value !== String(val)) sel.value = String(val);
  }
  const mkOpt = (t, v) => { const o = document.createElement('option'); o.value = String(v); o.textContent = t; return o; };
  const content = out => (isNode(out) ? out : document.createTextNode(String(out)));

  class CalendarView {
    /** cfg: structural options (changing them => a new view is built). */
    constructor(cfg) { this.cfg = cfg; this.id = uid(); this._flip = false; this._build(); }
    _build() {
      const c = this.cfg, L = c.loc, cn = c.cn || {}, cx = (b, k) => (cn[k] ? b + ' ' + cn[k] : b);
      const root = (this.root = el('div', 'izi-container', { id: this.id, role: c.inline ? 'group' : 'dialog', 'aria-label': L.dialog, tabindex: '-1' }));
      if (!c.inline) { root.setAttribute('aria-modal', 'false'); root.hidden = true; }
      if (c.preview) {
        const pv = el('div', cx('izi-preview', 'preview'), { 'aria-hidden': 'true' });
        this.pvYear = el('div', 'izi-preview-year'); this.pvFull = el('div', 'izi-preview-full');
        pv.append(this.pvYear, this.pvFull); root.append(pv);
      }
      if (c.presets) {
        const bar = (this.presetsBar = el('div', cx('izi-presets-bar' + (c.presetsBottom ? ' izi-presets-bottom' : '') + (c.presetsWrap ? ' izi-presets-wrapped' : '') + (c.presetsArrows ? '' : ' izi-presets-nonav'), 'presets')));
        const nav = (d, label, glyph) => { const b = el('button', 'izi-presets-nav', { type: 'button', 'data-act': 'pscroll:' + d, 'aria-label': label, tabindex: '-1' }); b.textContent = glyph; return b; };
        this.psPrev = nav(-1, L.scrollLeft, '\u2039'); this.psNext = nav(1, L.scrollRight, '\u203a');
        this.presetsEl = el('div', 'izi-presets', { role: 'group', 'aria-label': L.presetsLabel });
        bar.append(this.psPrev, this.presetsEl, this.psNext);
        if (!c.presetsBottom) root.append(bar);
      }
      const hd = (this.header = el('div', cx('izi-nav-header', 'header')));
      this.prev = el('button', 'izi-nav-btn izi-prev', { type: 'button', 'data-act': 'prev', 'aria-label': c.month ? L.prevYear : L.prevMonth });
      this.next = el('button', 'izi-nav-btn izi-next', { type: 'button', 'data-act': 'next', 'aria-label': c.month ? L.nextYear : L.nextMonth });
      this.prev.innerHTML = svg(ICONS.left); this.next.innerHTML = svg(ICONS.right);
      const mid = el('div', 'izi-month-year');
      if (c.selects) {
        if (!c.month) {
          this.ms = el('select', 'izi-month-select', { 'aria-label': L.month });
          L.months.forEach((n, i) => this.ms.append(mkOpt(n, i + 1)));
          mid.append(this.ms);
        }
        if (c.yearGrid) {
          this.yb = el('button', 'izi-year-btn', { type: 'button', 'data-act': 'years', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': L.year });
          mid.append(this.yb);
        } else {
          this.ys = el('select', 'izi-year-select', { 'aria-label': L.year });
          for (let y = c.minYear; y <= c.maxYear; y++) this.ys.append(mkOpt(toDigits(y, c.digits), y));
          mid.append(this.ys);
        }
      } else mid.append((this.titleEl = el('span', 'izi-title')));
      this.mid = mid;
      hd.append(this.prev, mid, this.next); root.append(hd);

      const cal = (this.cal = el('div', 'izi-calendar'));
      if (c.yearGrid) {
        const yp = (this.yp = el('div', 'izi-years', { role: 'group', 'aria-label': L.years }));
        yp.hidden = true;
        const head = el('div', 'izi-years-head');
        this.ypPrev = el('button', 'izi-nav-btn', { type: 'button', 'data-act': 'ypage:-1', 'aria-label': L.prevYears });
        this.ypNext = el('button', 'izi-nav-btn', { type: 'button', 'data-act': 'ypage:1', 'aria-label': L.nextYears });
        this.ypPrev.innerHTML = svg(ICONS.left); this.ypNext.innerHTML = svg(ICONS.right);
        this.ypLabel = el('span', 'izi-years-label');
        head.append(this.ypPrev, this.ypLabel, this.ypNext);
        const g = el('div', 'izi-years-grid');
        this.yc = [];
        for (let i = 0; i < 12; i++) { const b = el('button', 'izi-year-cell', { type: 'button' }); g.append(b); this.yc.push(b); }
        yp.append(head, g); cal.append(yp);
      }
      this.cells = []; this.wn = []; this.wd = [];
      if (c.month) {
        const grid = (this.grid = el('div', 'izi-month-grid', { role: 'grid', 'aria-label': L.month }));
        for (let r = 0; r < 4; r++) {
          const row = el('div', 'izi-month-row', { role: 'row' });
          for (let i = 0; i < 3; i++) { const cell = el('div', 'izi-day-cell izi-month-cell', { role: 'gridcell', tabindex: '-1' }); row.append(cell); this.cells.push(cell); }
          grid.append(row);
        }
        cal.append(grid);
        this.body = grid;
      } else {
        this.grids = [];
        const row = c.months > 1 ? el('div', 'izi-months-row') : null;
        for (let gi = 0; gi < (c.months || 1); gi++) {
          const G = { cells: [], wn: [], wd: [], weekRows: [] };
          const grid = (G.grid = el('div', cx('izi-days-grid' + (c.weekNo ? ' with-week-numbers' : '') + (c.secondary ? ' with-secondary' : ''), 'grid'), { role: 'grid' }));
          const wr = el('div', 'izi-weekdays', { role: 'row' });
          if (!c.weekdays) wr.hidden = true;
          if (c.weekNo) { const wh = el('div', 'izi-weekday izi-weekno-head', { role: 'columnheader', 'aria-label': L.week, title: L.week }); wh.textContent = '#'; wr.append(wh); }
          for (let i = 0; i < 7; i++) { const d = el('div', cx('izi-weekday', 'weekday'), { role: 'columnheader' }); wr.append(d); G.wd.push(d); }
          grid.append(wr);
          for (let r = 0; r < 6; r++) {
            const wrow = el('div', 'izi-week', { role: 'row' });
            G.weekRows.push(wrow);
            if (c.weekNo) { const w = el('div', 'izi-weekno', { role: 'rowheader' }); wrow.append(w); G.wn.push(w); }
            for (let i = 0; i < 7; i++) { const cell = el('div', 'izi-day-cell', { role: 'gridcell', tabindex: '-1' }); wrow.append(cell); G.cells.push(cell); }
            grid.append(wrow);
          }
          this.grids.push(G);
          if (row) { const col = el('div', 'izi-cal-col'); G.caption = el('div', 'izi-cal-caption', { 'aria-hidden': 'true' }); col.append(G.caption, grid); row.append(col); } else cal.append(grid);
        }
        if (row) cal.append(row);
        this.grid = this.grids[0].grid; this.cells = this.grids[0].cells; this.wd = this.grids[0].wd; this.wn = this.grids[0].wn; this.weekRows = this.grids[0].weekRows;
        this.body = row || this.grid;
      }
      root.append(cal);

      if (c.compare) {
        const cr = (this.cmpEl = el('div', 'izi-compare'));
        const lab = el('label', 'izi-cmp-toggle'), chk = (this.cmpCheck = el('input', 'izi-cmp-check', { type: 'checkbox' })), lt = (this.cmpLabel = el('span', 'izi-cmp-label'));
        lab.append(chk, lt);
        const sel = (this.cmpMode = el('select', 'izi-cmp-mode', { 'aria-label': L.compareWith }));
        for (const id of c.compare.modes) { const o = document.createElement('option'); o.value = id; o.textContent = L[id]; sel.append(o); }
        const tg = (this.cmpTarget = el('div', 'izi-cmp-target', { role: 'group', 'aria-label': L.compareRange }));
        for (const t of ['primary', 'compare']) { const b = el('button', 'izi-cmp-tbtn', { type: 'button', 'data-act': 'cmp-target:' + t, 'data-t': t }); b.textContent = t === 'primary' ? L.primaryRange : L.compareRange; tg.append(b); }
        this.cmpText = el('div', 'izi-cmp-text');
        cr.append(lab, sel, tg, this.cmpText); root.append(cr);
      }
      if (c.slots) {
        const sl = (this.slotsEl = el('div', 'izi-slots-wrap'));
        this.slotsHint = el('div', 'izi-slots-hint'); this.slotsGrid = el('div', 'izi-slots', { role: 'group', 'aria-label': L.slotsLabel });
        sl.append(this.slotsHint, this.slotsGrid); root.append(sl);
      } else if (c.time) {
        const ts = el('div', 'izi-time-section');
        this.tsel = {};
        for (const w of c.range ? ['start', 'end'] : ['start']) {
          const blk = el('div', 'izi-time-block'), lab = el('div', 'izi-time-label');
          lab.innerHTML = svg(ICONS.clock, 14);
          lab.append(document.createTextNode(' ' + (c.range ? L[w] : L.time)));
          const grp = el('div', 'izi-time-selectors', { 'data-time': w, role: 'group', 'aria-label': (c.range ? L[w] + ' ' : '') + L.time });
          const mk = (f, lbl) => el('select', 'izi-time-select izi-' + f + '-select', { 'data-field': f, 'aria-label': lbl });
          const o = (this.tsel[w] = { hour: mk('hour', L.hour), minute: mk('minute', L.minute) });
          const sep = () => el('span', 'izi-time-sep', { 'aria-hidden': 'true' });
          const s1 = sep(); s1.textContent = ':';
          grp.append(o.hour, s1, o.minute);
          if (c.seconds) { const s2 = sep(); s2.textContent = ':'; o.second = mk('second', L.second); grp.append(s2, o.second); }
          if (c.is12) { o.ampm = mk('ampm', L.meridiem); grp.append(o.ampm); }
          blk.append(lab, grp); ts.append(blk);
        }
        root.append(ts);
      }
      if (this.presetsBar && c.presetsBottom) root.append(this.presetsBar);
      if (c.timeOnly) [root.querySelector('.izi-preview'), this.presetsBar, this.header, this.cal].forEach(x => x && x.remove()); // time-only: no date UI
      this.footer = el('div', cx('izi-footer', 'footer')); root.append(this.footer);
      this.live = el('div', 'izi-live', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
      root.append(this.live);
      if (c.hlist) {
        const hl = (this.hl = el('div', 'izi-hlist', { role: 'region', 'aria-label': L.holidaysTitle }));
        this.hlTitle = el('div', 'izi-hl-title');
        const chips = el('div', 'izi-hl-chips', { role: 'group', 'aria-label': L.holidayFilter });
        this.hlChips = {};
        for (const t of ['official', 'religious', 'weekly']) { const b = el('button', 'izi-hl-chip', { type: 'button', 'data-act': 'hl-type:' + t, 'data-type': t }); chips.append(b); this.hlChips[t] = b; }
        this.hlList = el('ul', 'izi-hl-list'); this.hlEmpty = el('div', 'izi-hl-empty');
        const ex = (this.hlExport = el('div', 'izi-hl-export'));
        ex.append(el('span', 'izi-hl-export-label'));
        for (const f of c.hlist.exports || []) { const b = el('button', 'izi-hl-export-btn', { type: 'button', 'data-act': 'hl-export:' + f }); b.textContent = f.toUpperCase(); ex.append(b); }
        hl.append(this.hlTitle, chips, this.hlList, this.hlEmpty, ex);
        if (c.hlist.side) {
          const main = el('div', 'izi-main');
          main.append(...root.children);
          root.append(main, hl);
          root.classList.add('izi-hl-side');
        } else root.append(hl);
        this._hlSide = c.hlist.side;
      }
    }

    update(vm) {
      const r = this.root, c = this.cfg, st = vm.state, hk = c.hooks;
      const cx = (b, k) => ((c.cn || {})[k] ? b + ' ' + c.cn[k] : b);
      setA(r, 'dir', vm.dir); setA(r, 'data-theme', vm.theme);
      if (r.className !== vm.rootClass) r.className = vm.rootClass;
      this._vars = this._vars || {};
      for (const k in vm.vars) if (this._vars[k] !== vm.vars[k]) { r.style.setProperty(k, vm.vars[k]); this._vars[k] = vm.vars[k]; }
      for (const k in this._vars) if (!(k in vm.vars)) { r.style.removeProperty(k); delete this._vars[k]; }
      if (this.pvYear) { setT(this.pvYear, vm.preview.year); setT(this.pvFull, vm.preview.text); }

      if (this.presetsEl) {
        const key = vm.presets.map(p => p.id + '|' + p.text).join('\n'), cn = c.cn || {};
        if (this._pk !== key) {
          this.presetsEl.replaceChildren();
          for (const p of vm.presets) { const b = el('button', 'izi-chip' + (cn.chip ? ' ' + cn.chip : ''), { type: 'button', 'data-act': 'preset:' + p.id }); b.textContent = p.text; this.presetsEl.append(b); }
          this._pk = key;
        }
        let act = -1;
        vm.presets.forEach((p, i) => {
          const b = this.presetsEl.children[i], cl = 'izi-chip' + (p.active ? ' izi-chip-active' : '') + (cn.chip ? ' ' + cn.chip : '');
          if (b.className !== cl) b.className = cl;
          setA(b, 'aria-pressed', p.active ? 'true' : 'false'); setA(b, 'aria-disabled', p.disabled ? 'true' : null); setA(b, 'title', p.disabled ? p.reason : null);
          if (p.active) act = i;
        });
        this.presetsBar.hidden = !vm.presets.length;
        if (act >= 0 && act !== this._ai && !this.presetsBar.hidden) { // bring the active chip to the middle of the bar
          const ch = this.presetsEl.children[act], sr = this.presetsEl.getBoundingClientRect(), cr = ch.getBoundingClientRect();
          if (sr.width) this.presetsEl.scrollLeft += cr.left + cr.width / 2 - (sr.left + sr.width / 2);
        }
        this._ai = act;
        this.refreshMore();
      }

      // header
      if (hk.renderHeader) {
        const out = hk.renderHeader(st);
        if (out !== undefined) { this.header.replaceChildren(content(out)); this._hdrCustom = true; }
      } else {
        if (this._hdrCustom) { this.header.replaceChildren(this.prev, this.mid, this.next); this._hdrCustom = false; }
        setA(this.prev, 'disabled', !vm.nav.canPrev); setA(this.next, 'disabled', !vm.nav.canNext);
        if (this.ms) this.ms.value = String(st.view.jm);
        if (this.ys) this.ys.value = String(st.view.jy);
        if (this.yb) setT(this.yb, vm.yearText);
        if (this.titleEl) setT(this.titleEl, st.view.title);
      }

      // year grid panel
      if (this.yp) {
        const y = vm.years;
        if (y.open && this.yp.hidden) this.yp.style.minHeight = this.body.offsetHeight + 'px';
        this.yp.hidden = !y.open; this.body.hidden = y.open;
        setA(this.yb, 'aria-expanded', y.open ? 'true' : 'false');
        setT(this.ypLabel, y.label); setA(this.ypPrev, 'disabled', !y.canPrev); setA(this.ypNext, 'disabled', !y.canNext);
        y.items.forEach((it, i) => {
          const b = this.yc[i], cl = 'izi-year-cell' + (it.selected ? ' izi-year-selected' : '') + (it.current ? ' izi-year-today' : '');
          if (b.className !== cl) b.className = cl;
          setT(b, it.t); setA(b, 'data-year', it.y); setA(b, 'aria-pressed', it.selected ? 'true' : 'false'); setA(b, 'disabled', it.disabled);
        });
      }

      // grid
      setA(this.grid, 'aria-label', st.view.title);
      setA(this.grid, 'aria-busy', st.loading ? 'true' : null);
      if (c.month) {
        st.months.forEach((m, i) => {
          const e = this.cells[i];
          let cls = 'izi-day-cell izi-month-cell';
          if (m.today) cls += ' izi-today';
          if (m.disabled) cls += ' izi-disabled';
          if (m.selected) cls += ' izi-selected-start izi-selected-end';
          if (e.className !== cls) e.className = cls;
          setA(e, 'data-key', m.key); setA(e, 'tabindex', m.focus ? '0' : '-1');
          setA(e, 'aria-selected', m.selected ? 'true' : 'false'); setA(e, 'aria-disabled', m.disabled ? 'true' : null);
          setA(e, 'aria-current', m.today ? 'date' : null); setA(e, 'aria-label', m.label);
          const out = hk.renderDay ? hk.renderDay(m) : undefined;
          if (out !== undefined) { e.replaceChildren(content(out)); e._custom = true; }
          else if (e._custom || e.textContent !== m.text) { e.textContent = m.text; e._custom = false; }
        });
      } else {
        st.calendars.forEach((cal, gi) => {
          const G = this.grids[gi], blank = !c.outsideDays || c.months > 1;
          setA(G.grid, 'aria-label', cal.title); setA(G.grid, 'aria-busy', st.loading ? 'true' : null); if (G.caption) setT(G.caption, cal.title);
        vm.weekdays.forEach((w, i) => { setT(G.wd[i], w.short); setA(G.wd[i], 'aria-label', w.name); setA(G.wd[i], 'title', w.name); });
        if (c.weekNo) G.wn.forEach((e, i) => setT(e, cal.weekNumbers[i]));
        const range = c.range;
        cal.weeks.forEach((row, ri) => { G.weekRows[ri].hidden = blank && row.every(x => x.outside); }); // a row of only blank cells would be an empty ARIA row
        cal.weeks.forEach((row, ri) => row.forEach((cell, ci) => {
          const e = G.cells[ri * 7 + ci], h = cell.holiday, isStart = cell.selected === 'start' || cell.selected === 'both', isEnd = cell.selected === 'end' || cell.selected === 'both';
          if (blank && cell.outside) {
            e.className = 'izi-day-cell izi-empty';
            for (const a of ['data-key', 'aria-label', 'aria-selected', 'aria-disabled', 'aria-current', 'title', 'data-holiday-type', 'data-holiday-types', 'data-loading', 'data-estimated']) setA(e, a, null);
            setA(e, 'tabindex', '-1'); setA(e, 'aria-hidden', 'true');
            if (e.textContent) e.textContent = '';
            e._d = null; e._custom = false;
            return;
          }
          setA(e, 'aria-hidden', null);
          const cn = c.cn || {}, k = n => (cn[n] ? ' ' + cn[n] : '');
          let cls = 'izi-day-cell' + k('cell');
          if (cell.outside) cls += ' izi-faded' + k('outside');
          if (cell.today) cls += ' izi-today' + k('today');
          if (cell.disabled) cls += ' izi-disabled' + k('disabled');
          if (cell.weekend) cls += ' izi-weekend-cell' + k('weekend');
          if (h && h.types.length) cls += ' izi-holiday-cell' + k('holiday');
          if (isStart) cls += ' izi-selected-start' + k('selected');
          if (isEnd) cls += ' izi-selected-end';
          if (range && st.selection.end && cell.selected && cell.selected !== 'both') cls += ' izi-has-range';
          if (cell.inRange) cls += ' izi-range-between' + k('inRange');
          if (cell.cmp) cls += ' izi-cmp-' + (cell.cmp === 'both' ? 'start izi-cmp-end' : cell.cmp);
          if (cell.cmpIn) cls += ' izi-cmp-between';
          if (vm.located && cell.key === vm.located) cls += ' izi-located';
          if (cell.preview) cls += ' izi-range-preview';
          if (e.className !== cls) e.className = cls;
          setA(e, 'data-key', cell.key);
          setA(e, 'tabindex', cell.focus ? '0' : '-1');
          setA(e, 'aria-selected', cell.selected || cell.inRange ? 'true' : 'false');
          setA(e, 'aria-disabled', cell.disabled ? 'true' : null);
          setA(e, 'aria-current', cell.today ? 'date' : null);
          setA(e, 'aria-label', cell.label);
          setA(e, 'title', cell.tip || null);
          setA(e, 'data-holiday-type', h && h.primary);
          setA(e, 'data-holiday-types', h && h.types.length ? h.types.join(' ') : null);
          setA(e, 'data-loading', h && h.loading ? 'true' : null);
          setA(e, 'data-estimated', h && h.estimated ? 'true' : null);
          const out = hk.renderDay ? hk.renderDay(cell) : undefined;
          if (out !== undefined) { e.replaceChildren(content(out)); e._custom = true; e._d = null; }
          else if (c.secondary) {
            if (e._custom || !e._d) { e.textContent = ''; e._d = el('span', 'izi-d'); e._s = el('small', 'izi-sec'); e.append(e._d, e._s); e._custom = false; }
            setT(e._d, cell.text); setT(e._s, cell.secondary || '');
          } else if (e._custom || e.textContent !== cell.text) { e.textContent = cell.text; e._custom = false; }
        }));
        });
      }
      if (this.cmpEl && vm.compare) {
        const k = vm.compare;
        setT(this.cmpLabel, k.label); this.cmpCheck.checked = k.enabled; this.cmpMode.value = k.mode; setA(this.cmpMode, 'disabled', !k.enabled);
        this.cmpTarget.hidden = !(k.enabled && k.mode === 'custom');
        for (const b of this.cmpTarget.children) { const on = b.dataset.t === k.target; setA(b, 'aria-pressed', on ? 'true' : 'false'); const cl = 'izi-cmp-tbtn' + (on ? ' izi-cmp-tbtn-on' : ''); if (b.className !== cl) b.className = cl; }
        setT(this.cmpText, k.text); this.cmpEl.classList.toggle('izi-cmp-on', k.enabled);
      }
      if (this.slotsEl && st.slots) {
        const sl = st.slots, key = sl.items.map(i => i.time + '|' + i.label).join('\n');
        this.slotsGrid.style.setProperty('--izi-slot-cols', sl.cols);
        if (this._sk !== key) { this.slotsGrid.replaceChildren(...sl.items.map(i => { const b = el('button', 'izi-slot', { type: 'button', 'data-slot': i.time }); b.textContent = i.label; return b; })); this._sk = key; }
        sl.items.forEach((i, n) => { const b = this.slotsGrid.children[n]; setA(b, 'aria-pressed', i.selected ? 'true' : 'false'); setA(b, 'aria-disabled', i.disabled ? 'true' : null); const cl = 'izi-slot' + (i.selected ? ' izi-slot-selected' : '') + (i.disabled ? ' izi-slot-disabled' : ''); if (b.className !== cl) b.className = cl; });
        setT(this.slotsHint, sl.hint); this.slotsHint.hidden = !sl.hint;
      }
      // time
      if (vm.time && this.tsel) {
        for (const w in this.tsel) {
          const t = vm.time[w], o = this.tsel[w];
          fill(o.hour, t.hours, c.is12 ? t.h12 : t.hour);
          fill(o.minute, t.minutes, t.minute);
          if (o.second) fill(o.second, t.seconds, t.second);
          if (o.ampm) fill(o.ampm, t.ampm, t.pm ? 'pm' : 'am');
        }
      }

      // footer
      if (hk.renderFooter) {
        const out = hk.renderFooter(st);
        if (out !== undefined) { this.footer.replaceChildren(content(out)); this._ftCustom = true; this.footer.hidden = false; }
      } else if (vm.footer) {
        if (this._fk !== vm.footer.key || this._ftCustom) {
          this.footer.replaceChildren();
          for (const it of vm.footer.items) {
            const b = el('button', cx('izi-btn' + (it.id === 'confirm' ? ' izi-btn-primary' : ''), 'button'), { type: 'button', 'data-act': it.custom ? 'custom:' + it.id : it.id, 'data-action': it.id });
            if (it.icon) b.innerHTML = svg(it.icon, 14);
            b.append(document.createTextNode(it.text));
            this.footer.append(b);
          }
          this._fk = vm.footer.key; this._ftCustom = false;
        }
        vm.footer.items.forEach((it, i) => setA(this.footer.children[i], 'disabled', it.disabled));
        this.footer.hidden = false;
      } else { this.footer.replaceChildren(); this._fk = null; this.footer.hidden = true; }

      if (this.hl && vm.holidays) {
        const h = vm.holidays;
        setT(this.hlTitle, h.title);
        for (const t of h.types) { const b = this.hlChips[t.id]; setT(b, t.label + ' (' + t.count + ')'); setA(b, 'aria-pressed', t.on ? 'true' : 'false'); }
        let lastMonth = 0;
        this.hlList.replaceChildren(...h.items.flatMap(it => {
          const out = [];
          if (h.grouped && it.month !== lastMonth) { lastMonth = it.month; const hd = document.createElement('li'); hd.className = 'izi-hl-month'; hd.textContent = it.monthName; hd.setAttribute('aria-hidden', 'true'); out.push(hd); }
          const li = document.createElement('li'), b = el('button', 'izi-hl-item', { type: 'button', 'data-hl-key': it.key, 'data-type': it.primary }), d = el('span', 'izi-hl-day'), w = el('span', 'izi-hl-wd'), t = el('span', 'izi-hl-name');
          d.textContent = it.day; w.textContent = it.weekday; t.textContent = it.title + (it.estimated ? ' *' : '');
          b.append(d, w, t); li.append(b); out.push(li); return out;
        }));
        setT(this.hlEmpty, h.items.length ? '' : (h.loading ? '\u2026' : h.empty)); this.hlEmpty.hidden = !!h.items.length;
        setT(this.hlExport.firstChild, h.exportLabel);
        for (const b of this.hlExport.querySelectorAll('button')) setA(b, 'disabled', h.loading);
      }
      if (vm.announce) { this._flip = !this._flip; this.live.textContent = vm.announce + (this._flip ? '\u200b' : ''); }
    }
    focusCell(key) {
      if (!this.cal) return;
      const e = this.cal.querySelector('.izi-day-cell[data-key="' + key + '"]:not(.izi-faded)') || this.cal.querySelector('.izi-day-cell[data-key="' + key + '"]');
      if (e) e.focus({ preventScroll: true });
    }
    /** Update edge-fade flags and arrow states of the quick-range bar (call after layout / scroll). */
    refreshMore() {
      const ps = this.presetsEl;
      if (!ps) return;
      const max = ps.scrollWidth - ps.clientWidth, sl = ps.scrollLeft, rtl = this.root.getAttribute('dir') === 'rtl', lo = rtl ? -max : 0, hi = rtl ? 0 : max;
      const left = max > 1 && sl > lo + 1, right = max > 1 && sl < hi - 1;
      setA(this.presetsBar, 'data-more', [left ? 'start' : '', right ? 'end' : ''].join(' ').trim() || null);
      setA(this.psPrev, 'disabled', !left); setA(this.psNext, 'disabled', !right);
    }
    /** Highlight a day in the grid while its holiday-list item is hovered / focused (key 0 clears). */
    peek(key) {
      if (!this.cal) return;
      for (const e of this.cal.querySelectorAll('.izi-peek')) e.classList.remove('izi-peek');
      this._peeked = key || 0;
      if (!key) return;
      const e = this.cal.querySelector('.izi-day-cell[data-key="' + key + '"]');
      if (e) e.classList.add('izi-peek');
    }
    focusYear() {
      if (!this.yp) return;
      const e = this.yp.querySelector('.izi-year-selected:not(:disabled)') || this.yp.querySelector('.izi-year-cell:not(:disabled)');
      if (e) e.focus({ preventScroll: true });
    }
    destroy() { this.root.remove(); }
  }

  /* ==========================================================================
   * 10. Controller - options, lifecycle, events, positioning, input binding
   * ======================================================================== */
  const DEFAULTS = {
    mode: 'single', inline: false, value: null, placeholder: null,
    format: null, rangeSeparator: ' - ', outputCalendar: null, inputDigits: 'latn', digits: 'locale', emitInputEvents: true,
    locale: 'fa', theme: 'light', size: 'md', customClass: '', dir: null, timeZone: 'local',
    calendar: 'jalali', dateOrder: 'dmy',
    firstDayOfWeek: 'auto', weekend: null, weeklyHolidays: null, minYear: null, maxYear: null,
    minDate: null, maxDate: null, disablePast: false, disableFuture: false, disabledDates: [], disabledRanges: [], disabledWeekdays: [],
    disableHolidays: false, isDateDisabled: null, rangeBacktrack: 'swap', rangeSpanDisabled: true,
    timePicker: false, timeFormat: '12h', timeStep: 15, showSeconds: false, minTime: null, maxTime: null, defaultTime: '00:00', defaultEndTime: '23:59',
    confirm: 'auto', closeOnSelect: true, closeOnClear: false, closeOnOutsideClick: true, openOn: 'click', restoreFocus: true, syncWithInput: false,
    appendTo: 'body', position: 'auto', offsetX: 0, offsetY: 4, zIndex: 10000, lockScroll: false,
    showPreview: true, showMonthYearSelector: true, showWeekNumbers: false, showButtonIcons: true, footerButtons: 'auto', tooltip: true,
    holidays: {}, renderDay: null, renderHeader: null, renderFooter: null,
    presets: false, presetsLayout: 'scroll', presetsPosition: 'top', presetsOverflow: 'disable', presetsArrows: true,
    accent: null, colors: null, cssVars: null, radius: null, cellShape: 'rounded', density: 'normal', shadow: null, width: null, fontSize: null, fontFamily: null,
    weekdayFormat: 'narrow', showOutsideDays: true, showWeekdays: true, highlightWeekend: true, highlightHolidays: true, highlightToday: true, classNames: null, animation: 'fade',
    minRangeDays: 0, maxRangeDays: 0, maxDates: 0, multipleSeparator: ', ', secondaryCalendar: false,
    compare: false, months: 1, dragSelect: true, holidayList: false, yearPicker: 'select', sheet: 'auto', swipe: true, suppressKeyboard: 'auto', strategy: 'fixed'
  };
  const CB = {
    open: () => [], close: p => [p.reason], select: p => [p.value, p.formatted], rangeSelect: p => [p.start, p.end, p.formatted],
    change: p => [p], clear: () => [], changeMonth: p => [p.jm, p.jy], changeYear: p => [p.jy], beforeSelect: p => [p.date, p],
    holidaysLoaded: p => [p], holidaysError: p => [p], invalidInput: p => [p.text], update: p => [p], destroy: () => []
  };
  const INSTANCES = new WeakMap();
  const ACCENTS = { blue: '#2563eb', ocean: '#0e7490', rose: '#be123c', emerald: '#047857', violet: '#6d28d9', amber: '#9a4507', slate: '#475569' };
  const COLOR_VARS = {
    background: '--izi-bg', surface: '--izi-surface', text: '--izi-text', textSecondary: '--izi-text-2', border: '--izi-border', hover: '--izi-hover', range: '--izi-range',
    onPrimary: '--izi-on-primary', faded: '--izi-faded', weekend: '--izi-weekend-text', weekendBg: '--izi-weekend-bg', holiday: '--izi-official-text', holidayBg: '--izi-official-bg',
    religious: '--izi-religious-text', religiousBg: '--izi-religious-bg', weekly: '--izi-weekly-text', weeklyBg: '--izi-weekly-bg', danger: '--izi-danger', success: '--izi-success', today: '--izi-primary-text'
  };
  /** Public date object: jy/jm/jd are the fields of the picker's own calendar; year/month/day are the same values under neutral names. */
  const cloneDT = d => (d ? { ...d, year: d.jy, month: d.jm, day: d.jd } : null);

  class iZiDatePicker {
    /**
     * @param {string|HTMLInputElement|null} target  CSS selector, element, or null for HEADLESS mode
     * @param {object} [options]
     */
    constructor(target, options = {}) {
      this.el = typeof target === 'string' ? document.querySelector(target) : target || null;
      if (target && !this.el) throw new Error('iZiDatePicker: target element not found');
      if (this.el && INSTANCES.has(this.el)) INSTANCES.get(this.el).destroy();
      this.headless = !this.el;
      this._raw = { ...options };
      this.cal = options.calendar === 'gregorian' ? GRE : JAL; // must exist before the first (calendar-bound) method call
      this.bus = new Emitter();
      this.model = new CalendarModel();
      this.model.cal = this.cal;
      this.provider = new HolidayProvider({ loaded: (y, src) => this._holLoaded(y, src), failed: (y, e) => this._holFailed(y, e) });
      this.provider.cal = this.cal;
      this.isOpen = false; this.destroyed = false; this.view = null; this._sheet = false; this._bd = null; this._ys = { open: false, start: 0 };
      this._announce = null; this._focusGrid = false; this._noFocusOpen = false; this._writing = false; this._raf = 0;
      this._configure();
      if (this.el) { INSTANCES.set(this.el, this); this._attachInput(); }
      this.model.setFocus(dtKey(this.model.today()));
      let v = this._raw.value;
      if ((v == null || v === '') && this.el && this.el.value) v = this.el.value;
      if (v != null && v !== '') this.setValue(v, { silent: true });
      if (this.o.inline && !this.headless) { this._ensureView(); this.isOpen = true; this._changed(); }
    }

    /* ------------------------------------------------------------------ options */
    _configure() {
      const r = this._raw, o = (this.o = { ...DEFAULTS, ...r });
      // convenience aliases: 'datetime' = single + time picker, 'datetime-range' = range + time picker
      if (o.mode === 'datetime') { o.mode = 'single'; o.timePicker = true; }
      if (o.mode === 'datetime-range') { o.mode = 'range'; o.timePicker = true; }
      if (!['range', 'multiple', 'week', 'month', 'time', 'timerange'].includes(o.mode)) o.mode = 'single';
      this.cal = o.calendar === 'gregorian' ? GRE : JAL; this.model.cal = this.cal; this.provider.cal = this.cal; CAL = this.cal;
      const greg = this.cal.id === 'gregorian';
      const loc = (this.loc = resolveLocale(o.locale, this.cal.id));
      const ocal = o.outputCalendar === 'gregorian' || o.outputCalendar === 'jalali' ? o.outputCalendar : this.cal.id;
      this.dctx = { loc, cal: this.cal.id, months: loc.months, digits: o.digits === 'locale' ? loc.digits : o.digits };
      this.ictx = { loc, cal: ocal, months: ocal === this.cal.id ? loc.months : ocal === 'gregorian' ? GREG_MONTHS : LOCALES.en.months, digits: o.inputDigits === 'locale' ? loc.digits : o.inputDigits, mdy: o.dateOrder === 'mdy' };
      const wi = greg ? weekInfo(loc.tag || 'en') : null;

      const dayIdx = v => (typeof v === 'string' ? WEEKDAY_NAMES.indexOf(v.toLowerCase()) : Number.isInteger(v) ? wmod(v, 7) : -1);
      let fd = dayIdx(o.firstDayOfWeek); if (o.firstDayOfWeek === 'auto' || fd < 0) fd = greg ? wi.first : 6;
      const toKey = v => {
        if (v == null || v === '') return 0;
        if (v === 'today') return dtKey(nowIn(o.timeZone));
        if (typeof v === 'string') { const p = parse(v, { loc, cal: this.ictx.cal, digits: 'latn' }); return p ? dtKey(p) : 0; }
        if (isDate(v)) { const p = zoneParts(v.getTime(), o.timeZone), j = J.toJalali(p.y, p.m, p.d); return K(j.jy, j.jm, j.jd); }
        if (isObj(v) && 'gy' in v) { const j = J.toJalali(v.gy, v.gm, v.gd); return K(j.jy, j.jm, j.jd); }
        if (isObj(v) && 'year' in v && 'month' in v) return K(v.year, v.month, v.day || 1);
        return keyOf(v) || 0;
      };
      const wd = a => new Set((a || []).map(dayIdx).filter(i => i >= 0));
      const types = v => (v === true ? new Set(TYPE_ORDER) : v ? new Set([].concat(v)) : null);
      const timeOnly = o.mode === 'time' || o.mode === 'timerange', ts = o.timeSlots && o.mode === 'single' ? (isObj(o.timeSlots) ? o.timeSlots : {}) : null;
      let minT = parseTimeStr(o.minTime != null ? o.minTime : ts && (ts.min || '09:00')), maxT = parseTimeStr(o.maxTime != null ? o.maxTime : ts && (ts.max || '18:00'));
      if (minT == null) minT = 0;
      if (maxT == null) maxT = 86399;
      if (minT > maxT) { console.warn('[iZiDatePicker] minTime > maxTime; maxTime ignored'); maxT = 86399; }
      const minYear = clamp(Math.trunc(o.minYear) || (greg ? 1900 : 1300), 1, greg ? 9999 : 3170), maxYear = clamp(Math.trunc(o.maxYear) || (greg ? 2100 : 1500), minYear, greg ? 9999 : 3170);
      const c = {
        months: o.mode === 'month' ? 1 : clamp(Math.trunc(o.months) || 1, 1, 3), compare: o.compare && (o.mode === 'range' || o.mode === 'week') ? (() => { const q = isObj(o.compare) ? o.compare : {}, md = (q.modes || ['previousPeriod', 'previousYear', 'custom']).filter(x => ['previousPeriod', 'previousYear', 'custom'].includes(x)); return { modes: md, mode: md.includes(q.mode) ? q.mode : md[0], enabled: !!q.enabled, sep: q.separator || ' vs ' }; })() : null,
        timeOnly, range: o.mode === 'range' || o.mode === 'week' || o.mode === 'timerange',
        slots: ts ? { step: clamp(Math.trunc(ts.step) || 30, 5, 720), dur: ts.duration != null ? Math.max(0, +ts.duration) : Math.trunc(ts.step) || 30, showEnd: ts.showEnd !== false, disabled: ts.disabled || null, cols: clamp(Math.trunc(ts.columns) || 3, 1, 6) } : null,
        week: o.mode === 'week', month: o.mode === 'month', multiple: o.mode === 'multiple',
        maxDates: Math.max(0, o.maxDates | 0), minRange: Math.max(0, o.minRangeDays | 0), maxRange: Math.max(0, o.maxRangeDays | 0),
        time: (!!o.timePicker || timeOnly || !!ts) && o.mode !== 'month' && o.mode !== 'multiple', minT, maxT, defStart: parseTimeStr(o.defaultTime) || 0, defEnd: parseTimeStr(o.defaultEndTime) || 0,
        minYear, maxYear, minKey: toKey(o.minDate), maxKey: toKey(o.maxDate), past: !!o.disablePast, future: !!o.disableFuture,
        disabledKeys: new Set((o.disabledDates || []).map(toKey).filter(Boolean)),
        disabledRanges: (o.disabledRanges || []).map(p => [toKey(p[0]), toKey(p[1])]).filter(p => p[0] && p[1]).map(p => (p[0] <= p[1] ? p : [p[1], p[0]])),
        disabledWeekdays: wd(o.disabledWeekdays), weekend: wd(o.weekend || (greg ? wi.weekend : [4, 5])), firstDay: fd, timeZone: o.timeZone, backtrack: o.rangeBacktrack === 'restart' ? 'restart' : 'swap',
        spanDisabled: o.rangeSpanDisabled !== false, disableHolidays: types(o.disableHolidays), isDateDisabled: o.isDateDisabled
      };
      c.slotDur = c.slots ? c.slots.dur * 60 : 0;
      this.c = c;
      this.ictx.month = c.month; this.ictx.timeOnly = c.timeOnly; this.ictx.todayFn = () => this.model.today();
      const hlo = o.holidayList;
      this.hl = hlo && !c.month ? { position: 'side', types: ['official', 'religious', 'weekly'], export: ['ics', 'csv', 'json'], scope: 'year', listScope: 'view', onClick: 'locate', ...(isObj(hlo) ? hlo : {}) } : null;
      this._hlm = null; this._located = 0;
      this._hf = new Set(this.hl ? this.hl.types : []);
      this.presets = this._normPresets(o.presets, c);
      const tf = (o.timeFormat === '24h' ? 'HH:mm' : 'hh:mm') + (o.showSeconds ? ':ss' : '') + (o.timeFormat === '24h' ? '' : ' A');
      this.fmt = o.format || (c.timeOnly ? tf : c.month ? (greg ? 'YYYY-MM' : 'YYYY/MM') : (greg ? 'YYYY-MM-DD' : 'YYYY/MM/DD') + (c.time ? (o.timeFormat === '24h' ? ' HH:mm' + (o.showSeconds ? ':ss' : '') : ' hh:mm' + (o.showSeconds ? ':ss' : '') + ' A') : ''));
      this.model.configure(c);
      if (c.compare) { const st = this.model.cmp; if (!this._cmpInit || !c.compare.modes.includes(st.mode)) { st.mode = c.compare.mode; st.enabled = c.compare.enabled; } this.model.cmpDefault = c.compare.enabled; this._cmpInit = true; this.model.computeCmp(); } else { this.model.cmp.enabled = false; this.model.draft.cmp = null; this.model.value.cmp = null; }
      if (c.timeOnly) this.model.ensureTimeDraft();
      this.provider.configure(o.holidays, [...wd(o.weeklyHolidays || (greg ? [] : [5]))], loc);
      if (this.view) { this._destroyView(); this._ensureView(); if (this.isOpen && !o.inline) this.view.root.hidden = false; this._changed(); if (this.isOpen && !o.inline) this._position(); }
    }
    /** Update options at runtime. Selection is kept; the DOM is rebuilt when structure changes. */
    setOptions(partial) {
      if (this.destroyed) return this;
      const wasInline = this.o.inline, wasCal = this.o.calendar;
      Object.assign(this._raw, partial);
      if (partial.calendar && partial.calendar !== wasCal) { this.model.clear(); if (this.el && 'value' in this.el) this.el.value = ''; this.model.view = { jy: 1400, jm: 1 }; this.model.focus = 0; } // dates of the old calendar are meaningless
      this._configure();
      if (partial.calendar && partial.calendar !== wasCal) this.model.setFocus(dtKey(this.model.today()));
      if (this.o.inline !== wasInline) console.warn('[iZiDatePicker] "inline" cannot change after construction; recreate the instance');
      return this;
    }

    /* ------------------------------------------------------------------- events */
    on(n, f) { return this.bus.on(n, f); }
    once(n, f) { return this.bus.once(n, f); }
    off(n, f) { this.bus.off(n, f); return this; }
    /** Single dispatch path: emitter listeners first, then the matching `onX` option. */
    _emit(name, p) {
      p = p || {};
      let ok = this.bus.emit(name, p);
      const cb = this.o['on' + name[0].toUpperCase() + name.slice(1)];
      if (typeof cb === 'function') { try { if (cb.apply(this, (CB[name] || (() => [p]))(p).concat([this])) === false) ok = false; } catch (e) { console.error(e); } }
      return ok;
    }

    /* -------------------------------------------------------------- state / data */
    _ctxLabel(cell) {
      const loc = this.loc;
      let s = format(cell, 'dddd D MMMM YYYY', this.dctx);
      const h = cell.holiday;
      if (h && h.titles.length) s += ', ' + h.titles.join(' / ') + (h.estimated ? ' (' + loc.estimated + ')' : '');
      else if (h && h.types.length) s += ', ' + loc.holidayTypes[h.primary];
      return s;
    }
    _years(weeks) { const a = weeks[0][0].jy, b = weeks[5][6].jy; return a === b ? [a] : [a, b]; }
    /** Public, serialisable snapshot - also the headless render contract. */
    getState() {
      const m = this.model, c = this.c, loc = this.loc, dg = this.dctx.digits, { jy, jm } = m.view, sec = this.o.secondaryCalendar, N = c.month ? 1 : c.months || 1;
      const hol = (y, mo, d) => this.provider.getDay(y, mo, d);
      const calendars = [], hf = this.hl && this._hf.size < 3 ? this._hf : null, counts = { official: 0, religious: 0, weekly: 0 };
      let loading = false;
      if (!c.month && !c.timeOnly) {
        for (let i = 0; i < N; i++) {
          const weeks = m.monthData(hol, i), b = unK(addMonths(K(jy, jm, 1), i)), mn = loc.months[b.jm - 1];
          for (const row of weeks) for (const cell of row) {
            cell.text = toDigits(cell.jd, dg); cell.year = cell.jy; cell.month = cell.jm; cell.day = cell.jd;
            if (this.hl && !cell.outside && cell.holiday) for (const t of cell.holiday.types) counts[t]++;
            if (hf && cell.holiday) { const h0 = cell.holiday, ty = h0.types.filter(t => hf.has(t)); cell.holiday = ty.length || h0.loading ? { ...h0, types: ty, primary: ty[0] || null, titles: ty.length ? h0.titles : [] } : null; }
            cell.label = this._ctxLabel(cell);
            cell.tip = this.o.tooltip && cell.holiday && cell.holiday.titles.length ? cell.holiday.titles.join(' / ') : '';
            if (sec) cell.secondary = secondaryText(cell, sec);
            if (cell.holiday && cell.holiday.loading) loading = true;
          }
          calendars.push({ weeks, jy: b.jy, jm: b.jm, year: b.jy, month: b.jm, monthName: mn, title: mn + ' ' + toDigits(b.jy, dg), weekNumbers: this.o.showWeekNumbers ? [0, 1, 2, 3, 4, 5].map(r => toDigits(m.weekNumber(weeks[r][3].jdn), dg)) : null });
        }
        const y0 = calendars[0].weeks[0][0].jy, y1 = calendars[N - 1].weeks[5][6].jy;
        for (let y = y0; y <= y1; y++) this.provider.request(y);
      }
      const weeks = calendars.length ? calendars[0].weeks : [];
      const months = c.month ? m.monthGrid().map(x => ({ ...x, name: loc.months[x.jm - 1], text: loc.months[x.jm - 1], label: loc.months[x.jm - 1] + ' ' + toDigits(x.jy, dg) })) : null;
      const monthName = loc.months[jm - 1], step = c.month ? 12 : 1;
      return {
        mode: this.o.mode, calendar: this.cal.id, isOpen: this.isOpen, weeks, calendars, months, loading,
        view: { jy, jm, year: jy, month: jm, monthName, title: c.month ? toDigits(jy, dg) : monthName + ' ' + toDigits(jy, dg) },
        weekdays: Array.from({ length: 7 }, (_, i) => { const d = (c.firstDay + i) % 7; const wf = this.o.weekdayFormat; return { index: d, name: loc.weekdays[d], short: wf === 'long' ? loc.weekdays[d] : wf === 'short' ? (loc.weekdaysAbbr || [])[d] || loc.weekdays[d].slice(0, 3) : loc.weekdaysShort[d] }; }),
        weekNumbers: calendars.length ? calendars[0].weekNumbers : null,
        focus: m.focus, canPrev: m.canShift(-step), canNext: m.canShift(step),
        selection: { start: cloneDT(m.draft.start), end: cloneDT(m.draft.end), list: m.draft.list.map(cloneDT), pending: m.pending },
        value: { start: cloneDT(m.value.start), end: cloneDT(m.value.end), list: m.value.list.map(cloneDT) },
        time: c.time ? this._timeVm() : null, today: cloneDT(m.today()),
        holidayList: this.hl ? this._hlVm(calendars, counts, loading) : null,
        timeOnly: c.timeOnly, slots: c.slots ? this._slotsVm() : null,
        compare: c.compare ? this._cmpVm() : null
      };
    }
    _cmpVm() {
      const m = this.model, L = this.loc, c = this.c.compare, d = m.draft.cmp, f = dt => format(dt, this.fmt.split(' ')[0], this.dctx);
      return {
        enabled: m.cmp.enabled, mode: m.cmp.mode, target: m.cmp.target, modes: c.modes.map(id => ({ id, label: L[id] })), label: L.compare, withLabel: L.compareWith, primaryLabel: L.primaryRange, compareLabel: L.compareRange,
        text: d ? f(d.start) + this.o.rangeSeparator + f(d.end) : m.cmpPend ? f(m.cmpPend) + ' \u2192 \u2026' : m.cmp.enabled ? (m.cmp.mode === 'custom' ? L.compareHint : '') : '',
        range: d ? { start: cloneDT(d.start), end: cloneDT(d.end) } : null
      };
    }
    /** Slot grid for the selected date: [{ time:'HH:mm', label, disabled, selected }] */
    _slotsVm() {
      const m = this.model, c = this.c, sl = c.slots, d = m.draft.start, L = this.loc, items = [], dg = this.dctx.digits, is12 = this.o.timeFormat !== '24h';
      const lbl = sec => { const t = secToT(sec); return is12 ? toDigits(to12(t.hour).h, dg) + ':' + toDigits(pad(t.minute), dg) + ' ' + (t.hour < 12 ? L.am : L.pm) : toDigits(pad(t.hour), dg) + ':' + toDigits(pad(t.minute), dg); };
      for (let t = c.minT; t + c.slotDur <= c.maxT + 1; t += sl.step * 60) {
        const hh = pad(div(t, 3600)) + ':' + pad(div(mod(t, 3600), 60));
        let dis = !d;
        if (!dis && sl.disabled) { try { dis = Array.isArray(sl.disabled) ? sl.disabled.includes(hh) : !!sl.disabled(cloneDT(d), hh); } catch (e) { console.error(e); } }
        items.push({ time: hh, label: lbl(t) + (sl.showEnd && c.slotDur ? ' - ' + lbl(Math.min(t + c.slotDur, 86399)) : ''), disabled: dis, selected: !!d && m.draft.start.hour * 3600 + m.draft.start.minute * 60 === t });
      }
      return { items, cols: sl.cols, hint: d ? '' : L.pickDateFirst, label: L.slotsLabel };
    }
    _pickSlot(hhmm) {
      const m = this.model, sl = this.c.slots, it = sl && this._slotsVm().items.find(x => x.time === hhmm);
      if (!it || it.disabled || !m.draft.start) return false;
      const t = parseTimeStr(hhmm);
      m.setTime('start', secToT(t));
      this._announce = it.label + ' ' + this.loc.selected;
      if (!this._confirmMode()) this._commit('time'); else this._changed();
      return true;
    }
    _hlVm(calendars, counts, loading) {
      const L = this.loc, items = [], dg = this.dctx.digits, ty = [['official', 'official'], ['religious', 'religious'], ['weekly', 'weekly']], yearScope = this.hl.listScope === 'year';
      if (yearScope) { // every holiday of the displayed year, grouped by month; memoised on (year, filter, data generation)
        const yr = this.model.view.jy, mk = yr + '|' + [...this._hf].sort().join() + '|' + this.provider.gen;
        this.provider.request(yr);
        if (!this._hlm || this._hlm.key !== mk) {
          const list = [], cnt = { official: 0, religious: 0, weekly: 0 };
          for (let mo = 1; mo <= 12; mo++) for (let d = 1, n = J.monthLength(yr, mo); d <= n; d++) {
            const h = this.provider.getDay(yr, mo, d);
            if (!h) continue;
            for (const t of h.types) cnt[t]++;
            const tys = h.types.filter(t => this._hf.has(t));
            if (!tys.length) continue;
            list.push({ key: K(yr, mo, d), day: toDigits(d, dg), weekday: (L.weekdaysAbbr || L.weekdays)[J.dayOfWeek(J.toJDN(yr, mo, d))], title: h.titles.join(' / ') || L.holidayTypes[tys[0]], primary: tys[0], types: tys, estimated: h.estimated, month: mo, monthName: L.months[mo - 1] });
          }
          this._hlm = { key: mk, list, cnt };
        }
        return {
          title: L.holidaysTitle + ' - ' + toDigits(yr, dg), items: this._hlm.list, grouped: true, loading, empty: L.noHolidays, exportLabel: L.exportLabel,
          types: ty.map(([id]) => ({ id, label: L.holidayTypes[id], count: toDigits(this._hlm.cnt[id], dg), on: this._hf.has(id) })), exports: this.hl.export
        };
      }
      for (const cal of calendars) for (const row of cal.weeks) for (const cell of row) {
        const h = cell.holiday;
        if (cell.outside || !h || !h.types.length) continue;
        items.push({ key: cell.key, day: cell.text, weekday: (L.weekdaysAbbr || L.weekdays)[cell.weekday], title: h.titles.join(' / ') || L.holidayTypes[h.primary], primary: h.primary, types: h.types, estimated: h.estimated });
      }
      return {
        title: L.holidaysTitle + ' - ' + calendars.map(x => x.title).join(' / '), items, loading, empty: L.noHolidays, exportLabel: L.exportLabel,
        types: ty.map(([id]) => ({ id, label: L.holidayTypes[id], count: toDigits(counts[id], dg), on: this._hf.has(id) })), exports: this.hl.export
      };
    }
    /** Holidays of a period as plain objects (awaits lazy data). o: { year | from,to | scope:'view'|'year', types } */
    listHolidays(o = {}) {
      const m = this.model, c = this.c;
      let a, b;
      if (o.from && o.to) { a = dtKey(this._toDT(o.from)); b = dtKey(this._toDT(o.to)); }
      else if (o.year) { a = K(o.year, 1, 1); b = K(o.year, 12, J.monthLength(o.year, 12)); }
      else if ((o.scope || (this.hl && this.hl.scope)) === 'view') { const e = unK(addMonths(K(m.view.jy, m.view.jm, 1), (c.months || 1) - 1)); a = K(m.view.jy, m.view.jm, 1); b = K(e.jy, e.jm, J.monthLength(e.jy, e.jm)); }
      else { a = K(m.view.jy, 1, 1); b = K(m.view.jy, 12, J.monthLength(m.view.jy, 12)); }
      const ys = []; for (let y = div(a, 10000); y <= div(b, 10000); y++) ys.push(y);
      return Promise.all(ys.map(y => this.provider.ready(y))).then(() => this._collectHolidays(a, b, o.types));
    }
    _collectHolidays(a, b, types) {
      const set = new Set(types || (this.hl ? [...this._hf] : TYPE_ORDER)), L = this.loc, out = [];
      for (let j = keyJDN(a); j <= keyJDN(b); j++) {
        const d = J.fromJDN(j), h = this.provider.getDay(d.jy, d.jm, d.jd);
        if (!h || h.loading) continue;
        const ty = h.types.filter(t => set.has(t));
        if (!ty.length) continue;
        const g = d2g(j), dt = { ...d, hour: 0, minute: 0, second: 0 };
        out.push({ date: g.gy + '-' + pad(g.gm) + '-' + pad(g.gd), gy: g.gy, gm: g.gm, gd: g.gd, year: d.jy, month: d.jm, day: d.jd, localDate: format(dt, this.fmt.split(' ')[0] || 'YYYY-MM-DD', this.ictx), weekday: L.weekdays[J.dayOfWeek(j)], title: h.titles.join(' / ') || L.holidayTypes[h.primary], type: ty[0], types: ty, estimated: h.estimated });
      }
      return out;
    }
    /** Promise<string>: iCalendar / CSV / JSON text for a period (see listHolidays for the options). */
    exportHolidays(o = {}) {
      const f = o.format || 'ics';
      return this.listHolidays(o).then(items => f === 'csv' ? buildCSV(items) : f === 'json' ? JSON.stringify(items, null, 2) : f === 'object' ? items : buildICS(items));
    }
    /** Browser download of exportHolidays(). Resolves true when a file was offered. */
    downloadHolidays(o = {}) {
      const f = o.format || 'ics';
      return this.exportHolidays(o).then(text => {
        if (typeof Blob === 'undefined' || !document.createElement || !URL.createObjectURL) return false;
        const blob = new Blob([text], { type: { ics: 'text/calendar', csv: 'text/csv', json: 'application/json' }[f] + ';charset=utf-8' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = o.filename || 'holidays-' + (o.year || this.model.view.jy) + '.' + f;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return true;
      });
    }
    /** 6x7 array of cell objects for the visible month (headless rendering). */
    getMonthData() { return this.getState().weeks; }
    _timeVm() {
      const m = this.model, c = this.c, o = this.o, is12 = o.timeFormat !== '24h', out = {};
      const step = clamp(Math.trunc(o.timeStep) || 15, 1, 60), L = this.loc, dg = this.dctx.digits;
      const num = (v, p) => toDigits(p ? pad(v) : v, dg);
      for (const w of c.range ? ['start', 'end'] : ['start']) {
        const t = m.t[w], base = h => h * 3600;
        const okH = h => base(h) + 3599 >= c.minT && base(h) <= c.maxT;
        const okM = (h, mi) => base(h) + mi * 60 + 59 >= c.minT && base(h) + mi * 60 <= c.maxT;
        const okS = (h, mi, s) => { const x = base(h) + mi * 60 + s; return x >= c.minT && x <= c.maxT; };
        const valid24 = Array.from({ length: 24 }, (_, h) => h).filter(okH);
        const { h: h12, pm } = to12(t.hour);
        const pool = is12 ? valid24.filter(h => (h >= 12) === pm) : valid24;
        const hours = (pool.length ? pool : [t.hour]).map(h => ({ v: is12 ? to12(h).h : h, t: num(is12 ? to12(h).h : h, !is12) }));
        const hs = is12 ? [12, ...Array.from({ length: 11 }, (_, i) => i + 1)] : null;
        if (hs) hours.sort((a, b) => hs.indexOf(a.v) - hs.indexOf(b.v));
        const mset = new Set([t.minute]);
        for (let mi = 0; mi < 60; mi += step) mset.add(mi);
        let mins = [...mset].sort((a, b) => a - b).filter(mi => okM(t.hour, mi));
        if (!mins.length) mins = [t.minute];
        let secs = Array.from({ length: 60 }, (_, s) => s).filter(s => okS(t.hour, t.minute, s));
        if (!secs.length) secs = [t.second];
        out[w] = {
          hour: t.hour, minute: t.minute, second: t.second, h12, pm, hours,
          minutes: mins.map(v => ({ v, t: num(v, true) })), seconds: secs.map(v => ({ v, t: num(v, true) })),
          ampm: [{ v: 'am', t: L.am, d: !valid24.some(h => h < 12) }, { v: 'pm', t: L.pm, d: !valid24.some(h => h >= 12) }]
        };
      }
      return out;
    }
    _normPresets(p, c) {
      if (!p || c.multiple || c.month || c.timeOnly) return [];
      const def = c.range ? ['today', 'last7', 'last30', 'thisMonth', 'lastMonth'] : ['today', 'yesterday', 'tomorrow'];
      let list = [];
      if (p === true || p === 'default') list = def;
      else if (p === 'all') list = PRESET_IDS.slice();
      else if (Array.isArray(p)) list = p;
      else if (isObj(p)) { const ex = p.exclude || []; list = (p.include || def).filter(x => !ex.includes(x && x.id || x)).concat(p.custom || []); }
      return list.map(x => (typeof x === 'string' ? { id: x } : x)).filter(x => x && x.id);
    }
    /** [startKey, endKey] for a preset, or null. Custom `range` may be a function(picker) or a value. */
    _presetRange(p) {
      if (p.range) {
        try {
          const r = typeof p.range === 'function' ? p.range(this) : p.range, arr = Array.isArray(r) ? r : [r, r];
          const a = this._toDT(arr[0]), b = this._toDT(arr[1]);
          return a && b ? [dtKey(a), dtKey(b)] : null;
        } catch (e) { console.error(e); return null; }
      }
      return presetRange(p.id, dtKey(this.model.today()), this.c.firstDay);
    }
    /** Resolve a preset against the active constraints: { a, b, ok, reason }. overflow:'clamp' trims to min/max dates and maxRangeDays. */
    _presetState(p) {
      const m = this.model, c = this.c, r = this._presetRange(p);
      if (!r) return { ok: false, reason: 'invalid' };
      let a = r[0], b = c.range ? r[1] : r[0];
      if (a > b) [a, b] = [b, a];
      let issue = m.rangeIssue(a, b);
      if (issue && this.o.presetsOverflow === 'clamp' && c.range) {
        if (c.minKey) a = Math.max(a, c.minKey);
        if (c.maxKey) b = Math.min(b, c.maxKey);
        if (a <= b && c.maxRange && keyJDN(b) - keyJDN(a) + 1 > c.maxRange) { if (b <= dtKey(m.today())) a = jdnKey(keyJDN(b) - c.maxRange + 1); else b = jdnKey(keyJDN(a) + c.maxRange - 1); }
        issue = a > b ? 'bounds' : m.rangeIssue(a, b);
      }
      return { a, b, ok: !issue, reason: issue };
    }
    _presetLabel(p) {
      const L = this.loc, m = /^(last|next)(\d+)$/.exec(p.id);
      return p.label || (L.presets && L.presets[p.id]) || (m ? (m[1] === 'last' ? L.presetLast : L.presetNext).replace('{n}', toDigits(m[2], this.dctx.digits)) : p.id);
    }
    _presetsVm() {
      const m = this.model, L = this.loc, s = m.draft.start && dtKey(m.draft.start), e = m.draft.end && dtKey(m.draft.end), out = [];
      for (const p of this.presets) {
        const st = this._presetState(p);
        if (!st.ok && this.o.presetsOverflow === 'hide') continue;
        out.push({ id: p.id, text: this._presetLabel(p), disabled: !st.ok, reason: st.ok ? '' : (L.presetReasons && L.presetReasons[st.reason]) || st.reason || '', active: st.ok && (this.c.range ? st.a === s && st.b === e : st.a === s) });
      }
      return out;
    }
    _applyPreset(id) {
      const p = this.presets.find(x => x.id === id), st = p && this._presetState(p);
      if (!st || !st.ok) { if (st) { this._announce = this._presetLabel(p) + ': ' + ((this.loc.presetReasons && this.loc.presetReasons[st.reason]) || ''); this._changed(); } return false; }
      const ok = this.setValue(this.c.range ? [unK(st.a), unK(st.b)] : unK(st.a));
      if (ok && !this.o.inline && this.o.closeOnSelect) this.close('select', true);
      return ok;
    }
    _yearsVm() {
      const c = this.c, ys = this._ys, cur = this.model.view.jy, dg = this.dctx.digits, s = ys.start;
      if (!this.o.showMonthYearSelector || this.o.yearPicker !== 'grid') return { open: false, items: [], label: '', canPrev: false, canNext: false };
      const td = this.model.today().jy;
      return {
        open: ys.open, label: toDigits(s, dg) + ' - ' + toDigits(s + 11, dg), canPrev: s - 1 >= c.minYear, canNext: s + 12 <= c.maxYear,
        items: Array.from({ length: 12 }, (_, i) => { const y = s + i; return { y, t: toDigits(y, dg), selected: y === cur, disabled: y < c.minYear || y > c.maxYear, current: y === td }; })
      };
    }
    _useSheet() {
      const k = this.o.sheet;
      return k === true || (k === 'auto' && typeof matchMedia === 'function' && matchMedia('(max-width: 520px)').matches);
    }
    /** Commit only on Confirm? 'auto': when there is a time selector or a comparison range to adjust after picking dates. */
    _confirmMode() { const k = this.o.confirm; return k === true || (k !== false && (this.c.time || !!this.c.compare)); }
    _footerVm(st) {
      let ids = this.o.footerButtons;
      if (ids === 'auto') ids = this.c.timeOnly ? (this._confirmMode() ? ['clear', 'confirm', 'cancel'] : ['clear']) : this._confirmMode() ? ['clear', 'today', 'confirm', 'cancel'] : ['today', 'clear'];
      if (!Array.isArray(ids) || !ids.length) return null;
      const m = this.model, loc = this.loc, tk = dtKey(st.today);
      const items = ids.map(b => {
        if (isObj(b)) return { id: b.id, text: b.text, icon: this.o.showButtonIcons ? b.icon : null, custom: true, disabled: !!b.disabled };
        return {
          id: b, text: loc[b] || b, icon: this.o.showButtonIcons ? ICONS[b] : null,
          disabled: (b === 'today' && m.isDisabled(tk)) || (b === 'confirm' && !m.complete())
        };
      });
      return { key: items.map(i => i.id).join(',') + (this.o.showButtonIcons ? '+i' : ''), items };
    }
    _previewVm(st) {
      const m = this.model, loc = this.loc, pf = (this.c.month ? 'MMMM YYYY' : loc.previewFormat) + (this.c.time ? (this.o.timeFormat === '24h' ? ' HH:mm' : ' hh:mm A') : '');
      const f = dt => format(dt, pf, this.dctx), s = m.draft.start, e = m.draft.end;
      let text;
      if (this.c.range) text = s && e ? f(s) + ' \u2192 ' + f(e) : s ? f(s) + ' \u2192 \u2026' : loc.rangePlaceholder;
      else if (this.c.multiple) text = m.draft.list.length ? toDigits(m.draft.list.length, this.dctx.digits) + ' ' + loc.selected : loc.rangePlaceholder;
      else text = f(s || st.today);
      return { year: toDigits((s || st.today).jy, this.dctx.digits), text };
    }
    _dir() { return this.o.dir || this.loc.dir; }
    /** Visual customisation -> root classes + CSS custom properties. */
    _styleVm() {
      const o = this.o, cls = [], vars = {}, col = o.colors || {};
      const size = ({ small: 'sm', normal: 'md', large: 'lg' })[o.size] || o.size;
      if (['xs', 'sm', 'md', 'lg', 'xl', 'fluid'].includes(size)) cls.push('izi-size-' + size);
      if (o.width != null) vars['--izi-width'] = typeof o.width === 'number' ? o.width + 'px' : o.width;
      if (o.fontSize != null) vars['--izi-font-size'] = typeof o.fontSize === 'number' ? o.fontSize + 'px' : o.fontSize;
      if (o.fontFamily) vars['--izi-font'] = o.fontFamily;
      const acc = col.primary || ACCENTS[o.accent] || o.accent;
      if (acc) { cls.push('izi-has-accent'); vars['--izi-accent'] = acc; }
      for (const k in col) if (COLOR_VARS[k]) vars[COLOR_VARS[k]] = col[k];
      if (o.radius != null) {
        const n = typeof o.radius === 'number' ? o.radius : { none: 0, sm: 8, md: 16, lg: 22, xl: 30 }[o.radius];
        if (n != null) { vars['--izi-radius'] = n + 'px'; vars['--izi-radius-sm'] = Math.round(n * 0.62) + 'px'; vars['--izi-cell-radius'] = Math.round(n * 0.75) + 'px'; }
      }
      if (o.cellShape === 'circle' || o.cellShape === 'square') cls.push('izi-shape-' + o.cellShape);
      if (o.density === 'compact' || o.density === 'comfortable') cls.push('izi-density-' + o.density);
      if (o.shadow) cls.push('izi-shadow-' + o.shadow);
      if (o.highlightWeekend === false) cls.push('izi-no-weekend');
      if (o.highlightHolidays === false) cls.push('izi-no-holiday');
      if (o.highlightToday === false) cls.push('izi-no-today');
      if (o.animation === 'none' || o.animation === false) cls.push('izi-anim-none');
      if (o.weekdayFormat === 'long' || o.weekdayFormat === 'short') cls.push('izi-weekdays-' + o.weekdayFormat);
      if (o.classNames && o.classNames.root) cls.push(o.classNames.root);
      return { cls, vars: { ...vars, ...(o.cssVars || {}) } };
    }
    _vm() {
      const st = this.getState(), o = this.o, sv = this._styleVm();
      const vm = {
        state: st, dir: this._dir(), theme: o.theme,
        rootClass: 'izi-container' + (this.c.timeOnly ? ' izi-time-only' : '') + (this.hl && this.hl.position !== 'bottom' ? ' izi-hl-side' : '') + (this.c.months > 1 && !this.c.month ? ' izi-multi izi-months-' + this.c.months : '') + (o.inline ? ' inline' : '') + (this._sheet ? ' izi-sheet' : '') + (o.theme === 'dark' ? ' izi-theme-dark' : '') + sv.cls.map(x => ' ' + x).join('') + (o.customClass ? ' ' + o.customClass : ''), vars: sv.vars,
        preview: this.o.showPreview ? this._previewVm(st) : null, nav: { canPrev: st.canPrev, canNext: st.canNext },
        located: this._located, compare: st.compare, holidays: st.holidayList, presets: this._presetsVm(), years: this._yearsVm(), yearText: toDigits(st.view.jy, this.dctx.digits),
        weekdays: st.weekdays, weekNumbers: st.weekNumbers, time: st.time, footer: this._footerVm(st), announce: this._announce
      };
      this._announce = null;
      return vm;
    }
    _changed() {
      if (this.destroyed) return;
      if (this.view) {
        const vm = this._vm();
        this.view.update(vm);
        if (this._focusGrid) { this._focusGrid = false; this.view.focusCell(vm.state.focus); }
        if (this.isOpen && !this.o.inline && !this._sheet) { // the popup's size changed (months, compare row, holiday list, ...): keep it inside the viewport
          const r = this.view.root, w = r.offsetWidth, h = r.offsetHeight;
          if (w !== this._pw || h !== this._ph) { this._pw = w; this._ph = h; this._position(); }
        }
        this._emit('update', vm.state);
      } else if (this.headless) this._emit('update', this.getState());
    }
    _holLoaded(y, source) { this._emit('holidaysLoaded', { year: y, source }); this._changed(); }
    _holFailed(y, error) { this._emit('holidaysError', { year: y, error }); this._changed(); }

    /* ------------------------------------------------------------ view / DOM */
    _ensureView() {
      if (this.view || this.headless) return;
      const o = this.o, c = this.c;
      const cfg = {
        loc: this.loc, inline: o.inline, range: c.range, time: c.time, seconds: o.showSeconds, is12: o.timeFormat !== '24h', weekNo: o.showWeekNumbers,
        preview: o.showPreview, selects: o.showMonthYearSelector, minYear: c.minYear, maxYear: c.maxYear, digits: this.dctx.digits,
        months: c.month ? 1 : c.months || 1, month: c.month, yearGrid: o.showMonthYearSelector && o.yearPicker === 'grid', presets: this.presets.length > 0, secondary: !!o.secondaryCalendar,
        compare: c.compare ? { modes: c.compare.modes } : null, slots: c.slots ? { cols: c.slots.cols } : null, timeOnly: c.timeOnly, hlist: this.hl ? { side: this.hl.position !== 'bottom', exports: this.hl.export } : null, presetsBottom: o.presetsPosition === 'bottom', presetsWrap: o.presetsLayout === 'wrap', presetsArrows: o.presetsArrows !== false,
        outsideDays: o.showOutsideDays !== false, weekdays: o.showWeekdays !== false, cn: o.classNames || {},
        hooks: { renderDay: o.renderDay, renderHeader: o.renderHeader, renderFooter: o.renderFooter }
      };
      const view = (this.view = new CalendarView(cfg)), root = view.root;
      root.style.zIndex = String(o.zIndex);
      if (o.inline) this.el.insertAdjacentElement('afterend', root);
      else {
        const host = typeof o.appendTo === 'string' ? document.querySelector(o.appendTo) : o.appendTo;
        (host || document.body).appendChild(root);
      }
      const ac = (this._vac = new AbortController()), sig = { signal: ac.signal };
      root.addEventListener('click', e => this._onClick(e), sig);
      root.addEventListener('change', e => this._onChange(e), sig);
      root.addEventListener('keydown', e => this._onKey(e), sig);
      root.addEventListener('pointerover', e => this._onOver(e), sig);
      root.addEventListener('focusout', e => this._onFocusOut(e), sig);
      root.addEventListener('focusin', e => { const hi = e.target.closest && e.target.closest('.izi-hl-item'); if (hi) view.peek(+hi.getAttribute('data-hl-key')); else if (view._peeked) view.peek(0); }, sig);
      root.addEventListener('pointerleave', () => { if (view._peeked) view.peek(0); }, sig);
      const ps = view.presetsEl;
      if (ps) {
        let x0 = 0, s0 = 0, down0 = false, moved = false;
        const rtl = () => this._dir() === 'rtl';
        ps.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.button !== 0) return; down0 = true; moved = false; x0 = e.clientX; s0 = ps.scrollLeft; }, sig);
        ps.addEventListener('pointermove', e => {
          if (!down0) return;
          const dx = e.clientX - x0;
          if (!moved && Math.abs(dx) > 4) { moved = true; ps.classList.add('izi-dragging'); try { ps.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
          if (moved) ps.scrollLeft = s0 - dx;
        }, sig);
        const end = () => { down0 = false; ps.classList.remove('izi-dragging'); };
        ps.addEventListener('pointerup', end, sig);
        ps.addEventListener('pointercancel', end, sig);
        ps.addEventListener('wheel', e => { if (ps.scrollWidth > ps.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { ps.scrollLeft += rtl() ? -e.deltaY : e.deltaY; e.preventDefault(); } }, { ...sig, passive: false });
        ps.addEventListener('scroll', () => view.refreshMore(), { ...sig, passive: true });
      }
      let sx = 0, sy = 0, down = false;
      root.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; down = true; } }, sig);
      root.addEventListener('pointercancel', () => { down = false; }, sig);
      root.addEventListener('pointerup', e => {
        if (!down) return;
        down = false;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (this.o.swipe === false || this._ys.open || Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) * 0.6 || !e.target.closest('.izi-calendar')) return;
        const next = this._dir() === 'rtl' ? dx > 0 : dx < 0, n = this.c.month ? 12 : 1;
        this._nav(() => this.model.shift(next ? n : -n));
      }, sig);
      // drag-to-select a range with the mouse/pen: press on a day, move over others, release on the end day
      let dFrom = 0, dMove = false;
      const cellAt = (x, y) => { const e = document.elementFromPoint(x, y), c = e && e.closest && e.closest('.izi-day-cell'); return c && c.getAttribute('data-key') && !c.classList.contains('izi-disabled') ? +c.getAttribute('data-key') : 0; };
      view.cal.addEventListener('pointerdown', e => { if (this.o.dragSelect === false || !this.c.range || this.c.week || e.pointerType === 'touch' || e.button !== 0) return; dFrom = cellAt(e.clientX, e.clientY); dMove = false; }, sig);
      window.addEventListener('pointermove', e => {
        if (!dFrom) return;
        const k = cellAt(e.clientX, e.clientY);
        if (!k) return;
        if (!dMove && k !== dFrom) { dMove = true; this.model.pending = false; this._pick(dFrom); }
        if (dMove && k !== this.model.hover) { this.model.hover = k; this._changed(); }
      }, sig);
      window.addEventListener('pointerup', e => {
        if (!dFrom) return;
        const moved = dMove;
        dFrom = 0; dMove = false;
        if (!moved) return; // a plain click is handled by the click listener
        const k = cellAt(e.clientX, e.clientY), kill = ev => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener('click', kill, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', kill, true), 400);
        if (k) this._pick(k); else { this.model.cancel(); this._changed(); }
      }, sig);
    }
    _destroyView() { if (this._vac) this._vac.abort(); if (this.view) this.view.destroy(); this.view = null; }

    _onClick(e) {
      const root = this.view.root, act = e.target.closest('[data-act]'), cell = e.target.closest('.izi-day-cell'), yc = e.target.closest('.izi-year-cell'), m = this.model, hi = e.target.closest('.izi-hl-item');
      const sb = e.target.closest('.izi-slot');
      if (sb && root.contains(sb)) { this._pickSlot(sb.getAttribute('data-slot')); return; }
      if (hi && root.contains(hi)) { this._locate(+hi.getAttribute('data-hl-key'), hi); return; }
      if (act && root.contains(act)) return this._act(act.getAttribute('data-act'));
      if (yc && root.contains(yc)) {
        if (yc.disabled) return;
        this._ys.open = false;
        this._nav(() => m.setView(+yc.getAttribute('data-year'), m.view.jm));
        if (this.view.yb) this.view.yb.focus();
        return;
      }
      if (cell && root.contains(cell)) { this._focusGrid = true; this._pick(+cell.getAttribute('data-key')); }
    }
    _act(id) {
      const m = this.model, step = this.c.month ? 12 : 1;
      if (id === 'prev' || id === 'next') this._nav(() => m.shift(id === 'prev' ? -step : step));
      else if (id === 'today') this._pick(dtKey(m.today()));
      else if (id === 'clear') this.clear();
      else if (id === 'confirm') this._commit('confirm');
      else if (id === 'cancel') { m.cancel(); this._changed(); if (!this.o.inline) this.close('cancel', true); }
      else if (id === 'years') {
        const ys = this._ys;
        ys.open = !ys.open;
        if (ys.open) ys.start = m.view.jy - wmod(m.view.jy - this.c.minYear, 12);
        this._changed();
        if (ys.open) this.view.focusYear();
      } else if (id.startsWith('ypage:')) { this._ys.start += 12 * +id.slice(6); this._changed(); }
      else if (id.startsWith('preset:')) this._applyPreset(id.slice(7));
      else if (id.startsWith('cmp-target:')) { m.cmp.target = id.slice(11); this._changed(); }
      else if (id.startsWith('hl-type:')) { const t = id.slice(8); if (this._hf.has(t)) this._hf.delete(t); else this._hf.add(t); this._changed(); }
      else if (id.startsWith('hl-export:')) this.downloadHolidays({ format: id.slice(10) });
      else if (id.startsWith('pscroll:')) { const ps = this.view.presetsEl; if (ps) ps.scrollBy({ left: +id.slice(8) * ps.clientWidth * 0.7, behavior: 'smooth' }); }
      else if (id.startsWith('custom:')) {
        const b = (this.o.footerButtons || []).find(x => isObj(x) && x.id === id.slice(7));
        if (b && b.onClick) b.onClick(this);
      }
    }
    _onChange(e) {
      const t = e.target, m = this.model;
      if (t.classList.contains('izi-cmp-check')) { m.cmp.enabled = t.checked; m.cmp.target = 'primary'; if (m.cmp.enabled && m.cmp.mode === 'custom') { m.draft.cmp = null; m.cmp.target = m.draft.start && m.draft.end ? 'compare' : 'primary'; } m.computeCmp(); return this._cmpChanged(); }
      if (t.classList.contains('izi-cmp-mode')) { m.cmp.mode = t.value; m.cmpPend = null; if (t.value === 'custom') { m.draft.cmp = null; m.cmp.target = m.draft.start && m.draft.end ? 'compare' : 'primary'; } else m.cmp.target = 'primary'; m.computeCmp(); return this._cmpChanged(); }
      if (t.classList.contains('izi-month-select')) return this._nav(() => m.setView(m.view.jy, +t.value));
      if (t.classList.contains('izi-year-select')) return this._nav(() => m.setView(+t.value, m.view.jm));
      if (!t.classList.contains('izi-time-select')) return;
      const which = t.closest('.izi-time-selectors').getAttribute('data-time'), f = t.getAttribute('data-field'), cur = m.t[which], is12 = this.o.timeFormat !== '24h';
      let patch;
      if (f === 'hour') patch = { hour: is12 ? to24(+t.value, cur.hour >= 12) : +t.value };
      else if (f === 'ampm') patch = { hour: to24(to12(cur.hour).h, t.value === 'pm') };
      else patch = { [f]: +t.value };
      m.setTime(which, patch);
      if (!this._confirmMode() && m.complete()) this._commit('time'); else this._changed();
    }
    /** Holiday-list click: go to the day (changing month if needed) and make it unmistakable; onClick:'select' also selects it. */
    _locate(key, item) {
      const m = this.model, nm = item && item.querySelector('.izi-hl-name');
      this._focusGrid = true;
      this._nav(() => m.setFocus(key));
      if (this.hl.onClick === 'select') { this._pick(key); return; }
      this._located = key;
      this._announce = (nm ? nm.textContent + ' - ' : '') + format(unK(key), 'dddd D MMMM YYYY', this.dctx);
      this._changed();
    }
    _cmpChanged() { if (this.model.complete() && !this._confirmMode() && this.model.draft.start) this._commit('time'); else this._changed(); }
    _onOver(e) {
      const m = this.model, hi = e.target.closest && e.target.closest('.izi-hl-item');
      if (hi) { this.view.peek(+hi.getAttribute('data-hl-key')); return; }
      if (this.view._peeked) this.view.peek(0);
      if (!m.pending && !m.c.week) return;
      const cell = e.target.closest('.izi-day-cell');
      if (!cell) return;
      const k = +cell.getAttribute('data-key');
      if (k !== m.hover) { m.hover = k; this._changed(); }
    }
    _onFocusOut(e) {
      const rt = e.relatedTarget;
      if (this.o.inline || !this.isOpen || !rt) return;
      if (!this.view.root.contains(rt) && rt !== this.el) this.close('blur', false);
    }
    _onKey(e) {
      const t = e.target, m = this.model;
      if (e.key === 'Escape' && this._ys.open) { e.preventDefault(); e.stopPropagation(); this._ys.open = false; this._changed(); if (this.view.yb) this.view.yb.focus(); return; }
      if (e.key === 'Escape' && !this.o.inline) { e.preventDefault(); e.stopPropagation(); this.close('escape', true); return; }
      if (t.classList && t.classList.contains('izi-chip') && /^(Arrow(Left|Right)|Home|End)$/.test(e.key)) {
        const chips = [...t.parentNode.children], i = chips.indexOf(t), rtl = this._dir() === 'rtl';
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? chips.length - 1 : i + ((e.key === 'ArrowRight') === rtl ? -1 : 1);
        if (chips[n]) { e.preventDefault(); chips[n].focus(); }
        return;
      }
      const cell = t.closest && t.closest('.izi-day-cell');
      if (!cell) return;
      if (this.c.month) return this._onMonthKey(e, cell);
      const rtl = this._dir() === 'rtl', off = wmod(J.dayOfWeek(keyJDN(m.focus)) - this.c.firstDay, 7);
      let k = m.focus;
      switch (e.key) {
        case 'ArrowLeft': k = addDays(k, rtl ? 1 : -1); break;
        case 'ArrowRight': k = addDays(k, rtl ? -1 : 1); break;
        case 'ArrowUp': k = addDays(k, -7); break;
        case 'ArrowDown': k = addDays(k, 7); break;
        case 'Home': k = addDays(k, -off); break;
        case 'End': k = addDays(k, 6 - off); break;
        case 'PageUp': k = addMonths(k, e.shiftKey ? -12 : -1); break;
        case 'PageDown': k = addMonths(k, e.shiftKey ? 12 : 1); break;
        case 'Enter': case ' ': e.preventDefault(); this._focusGrid = true; this._pick(+cell.getAttribute('data-key')); return;
        default: return;
      }
      e.preventDefault();
      this._focusGrid = true;
      this._nav(() => m.setFocus(k));
    }
    _onMonthKey(e, cell) {
      const m = this.model, rtl = this._dir() === 'rtl', k = +cell.getAttribute('data-key');
      let n;
      switch (e.key) {
        case 'ArrowLeft': n = rtl ? 1 : -1; break;
        case 'ArrowRight': n = rtl ? -1 : 1; break;
        case 'ArrowUp': n = -3; break;
        case 'ArrowDown': n = 3; break;
        case 'Home': n = -((div(mod(k, 10000), 100) - 1) % 3); break;
        case 'End': n = 2 - ((div(mod(k, 10000), 100) - 1) % 3); break;
        case 'PageUp': n = -12; break;
        case 'PageDown': n = 12; break;
        case 'Enter': case ' ': e.preventDefault(); this._focusGrid = true; this._pick(k); return;
        default: return;
      }
      e.preventDefault();
      this._focusGrid = true;
      this._nav(() => m.setFocus(addMonths(k, n)));
    }
    /** Run a navigation mutation; fire changeMonth/changeYear only on real changes. */
    _nav(fn) {
      const m = this.model, p = { ...m.view };
      this._located = 0;
      fn();
      const n = m.view;
      if (p.jy !== n.jy || p.jm !== n.jm) {
        this._announce = this.loc.months[n.jm - 1] + ' ' + toDigits(n.jy, this.dctx.digits);
        this._emit('changeMonth', { jy: n.jy, jm: n.jm });
        if (p.jy !== n.jy) this._emit('changeYear', { jy: n.jy });
      }
      this._changed();
    }
    goTo(jy, jm) { this._nav(() => this.model.setView(jy, jm || this.model.view.jm)); return this; }
    next() { this._nav(() => this.model.shift(this.c.month ? 12 : 1)); return this; }
    prev() { this._nav(() => this.model.shift(this.c.month ? -12 : -1)); return this; }

    /* ------------------------------------------------------------- selection */
    _pick(key) {
      this._located = 0;
      const m = this.model, hol = this.provider.getDay(div(key, 10000), div(mod(key, 10000), 100), mod(key, 100));
      if (m.isDisabled(key, hol)) return false;
      if (!this._emit('beforeSelect', { date: cloneDT(unK(key)), key, mode: this.o.mode })) return false;
      if (this.c.compare && m.cmp.enabled && m.cmp.mode === 'custom' && m.cmp.target === 'compare') { // editing the comparison range
        const r = m.selectCmp(key);
        this._nav(() => m.setFocus(key));
        this._announce = format(unK(key), 'dddd D MMMM YYYY', this.dctx) + ' ' + this.loc.selected + (r === 'start' ? '. ' + this.loc.compareHint : '');
        if (m.complete() && !this._confirmMode()) this._commit('select'); else this._changed();
        return true;
      }
      const st = m.select(key, hol);
      if (st === 'rejected') return false;
      this._nav(() => m.setFocus(key));
      const d = unK(key), lbl = format(d, this.c.month ? 'MMMM YYYY' : 'dddd D MMMM YYYY', this.dctx);
      this._announce = lbl + ' ' + this.loc.selected + (m.pending ? '. ' + this.loc.pickEnd : '');
      if (m.complete() && !m.pending && !this._confirmMode()) this._commit('select');
      else this._changed();
      return true;
    }
    _commit(src) {
      const m = this.model;
      if (!m.commit()) return false;
      this._writeInput(true);
      this._setInvalid(false);
      this._emitCommit();
      this._changed();
      if (!this.o.inline && !this.headless && (src === 'confirm' || (src !== 'api' && src !== 'time' && this.o.closeOnSelect && !this.c.multiple))) this.close('select', true);
      return true;
    }
    _emitCommit() {
      const v = this.model.value;
      if (this.c.multiple) {
        const p = { value: cloneDT(v.start), values: v.list.map(cloneDT), formatted: this._fmtValue() };
        this._emit('select', p); this._emit('change', p);
        return;
      }
      if (this.c.range) {
        const p = { start: cloneDT(v.start), end: cloneDT(v.end), formatted: this._fmtValue() };
        if (this.c.compare) p.compare = v.cmp ? { start: cloneDT(v.cmp.start), end: cloneDT(v.cmp.end) } : null;
        this._emit('rangeSelect', p); this._emit('change', p);
      } else {
        const p = { value: cloneDT(v.start), formatted: this._fmtValue() };
        if (this.c.slotDur) p.end = cloneDT(v.end);
        this._emit('select', p); this._emit('change', p);
      }
    }
    _epoch(dt) {
      const g = J.toGregorian(dt.jy, dt.jm, dt.jd);
      return Math.floor(zonedToEpoch(g.gy, g.gm, g.gd, dt.hour | 0, dt.minute | 0, dt.second | 0, this.o.timeZone) / 1000);
    }
    _one(dt) {
      if (this.fmt === 'timestamp') return String(this._epoch(dt));
      return format(dt, this.fmt, this.ictx);
    }
    _fmtValue() {
      const v = this.model.value;
      if (this.c.multiple) return v.list.map(x => this._one(x)).join(this.o.multipleSeparator);
      if (!v.start) return '';
      if (!this.c.range) return this.c.slotDur && v.end && this.c.slots.showEnd ? this._one(v.start) + this.o.rangeSeparator + format(v.end, this.o.timeFormat === '24h' ? 'HH:mm' : 'hh:mm A', this.ictx) : this._one(v.start);
      const base = v.end ? this._one(v.start) + this.o.rangeSeparator + this._one(v.end) : '';
      return base && v.cmp && this.c.compare ? base + this.c.compare.sep + this._one(v.cmp.start) + this.o.rangeSeparator + this._one(v.cmp.end) : base;
    }
    _writeInput(dispatch) {
      if (!this.el) return;
      const txt = this._fmtValue();
      if (this.model.value.start && this.c.range && !this.model.value.end) return;
      if ('value' in this.el) {
        if (this.el.value !== txt) {
          this.el.value = txt;
          if (dispatch && this.o.emitInputEvents) {
            this._writing = true;
            try { this.el.dispatchEvent(new Event('input', { bubbles: true })); this.el.dispatchEvent(new Event('change', { bubbles: true })); } finally { this._writing = false; }
          }
        }
      } else this.el.textContent = txt;
    }
    _setInvalid(on, text) {
      if (!this.el || !this.el.classList) return;
      this.el.classList.toggle('izi-invalid', !!on);
      if (on) this.el.setAttribute('aria-invalid', 'true'); else this.el.removeAttribute('aria-invalid');
      if (on) { this._emit('invalidInput', { text }); this._announce = this.loc.invalid; }
    }
    _toDT(v) {
      if (v == null || v === '') return null;
      if (typeof v === 'string') return parse(v, this.ictx.cal === 'gregorian' ? this.ictx : this.ictx);
      if (isDate(v)) { if (isNaN(v)) return null; const p = zoneParts(v.getTime(), this.o.timeZone), j = J.toJalali(p.y, p.m, p.d); return { ...j, hour: p.h, minute: p.mi, second: p.s, hasTime: true }; }
      if (isObj(v) && this.c.timeOnly && 'hour' in v && !('jy' in v || 'year' in v || 'gy' in v)) { const t = this.model.today(); return { jy: t.jy, jm: t.jm, jd: t.jd, hour: v.hour, minute: v.minute, second: v.second, hasTime: true }; }
      if (isObj(v) && 'gy' in v) { const j = J.toJalali(v.gy, v.gm, v.gd); return { ...j, hour: v.hour, minute: v.minute, second: v.second, hasTime: v.hour != null }; }
      if (isObj(v) && 'year' in v && 'month' in v) return J.isValid(v.year, v.month, v.day) ? { jy: v.year, jm: v.month, jd: v.day, hour: v.hour, minute: v.minute, second: v.second, hasTime: v.hour != null } : null;
      if (isObj(v) && 'jy' in v) return J.isValid(v.jy, v.jm, v.jd) ? { jy: v.jy, jm: v.jm, jd: v.jd, hour: v.hour, minute: v.minute, second: v.second, hasTime: v.hour != null } : null;
      return null;
    }
    _splitRange(s) {
      const sep = this.o.rangeSeparator;
      let p = s.split(sep);
      if (p.length !== 2) p = s.split(/\s+(?:-|\u2013|\u2014|to|\u062a\u0627)\s+/i);
      return p.length === 2 ? p : null;
    }
    /** Set the value programmatically. Accepts string | Date | {jy,jm,jd[,hour..]} | {gy,gm,gd} | [start,end] | array of dates (multiple) | null. Returns success. */
    setValue(v, { silent = false } = {}) {
      if (this.destroyed) return false;
      const m = this.model, c = this.c;
      let s = null, e = null, list = null, cmpObj = null;
      if (c.compare && c.range) { // "range vs comparison" text, or {start, end, compare:{start,end}}
        let cp = null;
        if (typeof v === 'string' && v.includes(c.compare.sep)) { const q = v.split(c.compare.sep); if (q.length !== 2) return false; v = q[0]; cp = this._splitRange(q[1]); if (!cp) return false; }
        else if (isObj(v) && !Array.isArray(v) && v.compare) cp = [v.compare.start, v.compare.end];
        if (cp) { const a = this._toDT(cp[0]), b = this._toDT(cp[1]); if (!a || !b) return false; cmpObj = { start: a, end: b }; }
      }
      if (v != null && v !== '') {
        if (c.multiple) {
          const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\s*[,\u060c]\s*/) : [v];
          list = arr.map(x => this._toDT(x));
          if (list.some(x => !x)) return false;
        } else if (c.range) {
          const pair = Array.isArray(v) ? v : isObj(v) && 'start' in v ? [v.start, v.end] : typeof v === 'string' ? this._splitRange(v) || (c.week ? [v, v] : null) : c.week ? [v, v] : null;
          if (!pair) return false;
          s = this._toDT(pair[0]); e = this._toDT(pair[1]);
          if (!s || !e) return false;
        } else { s = this._toDT(v); if (!s) return false; }
      }
      if (c.multiple) { if (!m.setValue(null, null, list || [])) return false; }
      else if (!s) { this.clear({ silent }); return true; }
      else if (!m.setValue(s, e, null, cmpObj)) return false;
      this._writeInput(!silent);
      this._setInvalid(false);
      this._changed();
      if (!silent) this._emitCommit();
      return true;
    }
    /** Remove the selection. Emits select/rangeSelect(null) then clear. */
    clear({ silent = false } = {}) {
      this.model.clear();
      if (this.el && 'value' in this.el && this.el.value !== '') { this.el.value = ''; if (!silent && this.o.emitInputEvents) { this._writing = true; try { this.el.dispatchEvent(new Event('input', { bubbles: true })); this.el.dispatchEvent(new Event('change', { bubbles: true })); } finally { this._writing = false; } } }
      this._setInvalid(false);
      this._announce = this.loc.cleared;
      this._changed();
      if (!silent) {
        const p = this.c.range ? { start: null, end: null, formatted: '' } : { value: null, formatted: '' };
        if (this.c.multiple) p.values = [];
        this._emit(this.c.range ? 'rangeSelect' : 'select', p); this._emit('change', p); this._emit('clear', {});
        if (this.o.closeOnClear && !this.o.inline) this.close('clear', true);
      }
      return this;
    }
    /** @param {'string'|'object'|'timestamp'|'iso'|'gregorian'|'jalali'|'date'} [f] */
    getValue(f = 'string') {
      const v = this.model.value;
      if (!v.start) return this.c.multiple ? [] : null;
      const one = dt => {
        const g = J.toGregorian(dt.jy, dt.jm, dt.jd), t = this.c.time ? ' ' + pad(dt.hour) + ':' + pad(dt.minute) + ':' + pad(dt.second) : '';
        switch (f) {
          case 'object': return cloneDT(dt);
          case 'timestamp': return this._epoch(dt); // seconds, interpreted in options.timeZone, includes seconds
          case 'date': return new Date(this._epoch(dt) * 1000);
          case 'iso': return g.gy + '-' + pad(g.gm) + '-' + pad(g.gd) + (this.c.time ? 'T' + t.trim() : '');
          case 'time': return pad(dt.hour) + ':' + pad(dt.minute) + (this.o.showSeconds ? ':' + pad(dt.second) : '');
          case 'gregorian': return g.gy + '/' + pad(g.gm) + '/' + pad(g.gd);
          case 'jalali': { const q = JAL.fromJDN(J.toJDN(dt.jy, dt.jm, dt.jd)); return q.jy + '/' + pad(q.jm) + '/' + pad(q.jd); }
          default: return this._one(dt);
        }
      };
      if (this.c.multiple) return v.list.map(one);
      if (this.c.range) { const o = { start: one(v.start), end: v.end ? one(v.end) : null }; if (this.c.compare) o.compare = v.cmp ? { start: one(v.cmp.start), end: one(v.cmp.end) } : null; return o; }
      return one(v.start);
    }
    getRange() { return { start: cloneDT(this.model.value.start), end: cloneDT(this.model.value.end) }; }
    /** The committed comparison range ({start,end} as date objects) or null. */
    getCompare() { const c = this.model.value.cmp; return c ? { start: cloneDT(c.start), end: cloneDT(c.end) } : null; }

    /* ------------------------------------------------------------ input wiring */
    _attachInput() {
      const el = this.el, ac = (this._eac = new AbortController()), sig = { signal: ac.signal };
      this._saved = ['aria-haspopup', 'aria-expanded', 'aria-controls', 'autocomplete', 'placeholder', 'inputmode'].map(a => [a, el.getAttribute(a)]);
      if (!this.o.inline) { el.setAttribute('aria-haspopup', 'dialog'); el.setAttribute('aria-expanded', 'false'); if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off'); }
      if (this.o.placeholder) el.setAttribute('placeholder', this.o.placeholder);
      const sk = this.o.suppressKeyboard;
      if (!this.o.inline && (sk === true || (sk === 'auto' && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches))) el.setAttribute('inputmode', 'none');
      el.addEventListener('click', () => { if (!this.o.inline && /click|both/.test(this.o.openOn)) this.open(); }, sig);
      el.addEventListener('focus', () => { if (!this._noFocusOpen && !this.o.inline && /focus|both/.test(this.o.openOn)) this.open(); }, sig);
      el.addEventListener('keydown', e => {
        if (this.o.inline) return;
        if (e.key === 'Escape' && this.isOpen) { e.preventDefault(); this.close('escape', false); }
        else if (e.key === 'ArrowDown' && !this.isOpen) { e.preventDefault(); this.open({ focus: true }); }
        else if (e.key === 'ArrowDown' && this.isOpen) { e.preventDefault(); this._focusGrid = true; this._changed(); }
        else if (e.key === 'Enter') this._applyText(el.value, true);
      }, sig);
      el.addEventListener('input', () => { if (!this._writing && this.o.syncWithInput) this._applyText(el.value, false); }, sig);
      el.addEventListener('change', () => { if (!this._writing) this._applyText(el.value, true); }, sig);
    }
    /** Typed text -> value. Validated against min/max/disabled; invalid text is flagged, never applied. */
    _applyText(text, commit) {
      text = String(text).trim();
      if (!text) { if (commit && this.model.value.start) this.clear(); this._setInvalid(false); return true; }
      if (this.c.multiple) {
        const m0 = this.model, list = text.split(/\s*[,\u060c]\s*/).map(x => parse(x, this.ictx));
        if (list.some(x => !x) || list.some(x => m0.isDisabled(dtKey(x)))) { this._setInvalid(true, text); return false; }
        this._setInvalid(false);
        if (!commit) return true;
        const prev0 = this._fmtValue();
        if (!m0.setValue(null, null, list)) { this._setInvalid(true, text); return false; }
        this._writeInput(false); this._changed();
        if (this._fmtValue() !== prev0) this._emitCommit();
        return true;
      }
      let s, e = null, cmpObj = null;
      if (this.c.compare && this.c.range && text.includes(this.c.compare.sep)) {
        const q = text.split(this.c.compare.sep), cp = q.length === 2 && this._splitRange(q[1]), a = cp && parse(cp[0], this.ictx), b2 = cp && parse(cp[1], this.ictx);
        if (!a || !b2) { this._setInvalid(true, text); return false; }
        cmpObj = { start: a, end: b2 }; text = q[0];
      }
      if (this.c.range) { const p = this._splitRange(text) || (this.c.week ? [text, text] : null); s = p && parse(p[0], this.ictx); e = p && parse(p[1], this.ictx); if (!s || !e) { this._setInvalid(true, text); return false; } }
      else { s = parse(text, this.ictx); if (!s) { this._setInvalid(true, text); return false; } }
      const m = this.model;
      if (m.isDisabled(dtKey(s)) || (e && m.isDisabled(dtKey(e)))) { this._setInvalid(true, text); return false; }
      this._setInvalid(false);
      if (!commit) { this._nav(() => m.setFocus(dtKey(s))); return true; }
      const prev = this._fmtValue();
      if (!m.setValue(s, e, null, cmpObj)) { this._setInvalid(true, text); return false; }
      this._writeInput(false);
      this._changed();
      if (this._fmtValue() !== prev) this._emitCommit();
      return true;
    }

    /* ----------------------------------------------------- open / close / place */
    open(o = {}) {
      if (this.destroyed || this.headless || this.o.inline || this.isOpen || (this.el && this.el.disabled)) return this; // idempotent
      this._ensureView();
      const m = this.model, v = m.value.start;
      m.cancel();
      m.ensureTimeDraft();
      m.setFocus(v ? dtKey(v) : dtKey(m.today()));
      const root = this.view.root;
      this._sheet = this._useSheet();
      this._ys.open = false;
      if (this._sheet) { this._bd = el('div', 'izi-backdrop'); this._bd.style.zIndex = String(this.o.zIndex - 1); root.before(this._bd); }
      root.hidden = false;
      this.isOpen = true;
      if (this.view.presetsEl) { this.view.presetsEl.style.scrollBehavior = 'auto'; this.view.presetsEl.scrollLeft = 0; this.view.presetsEl.style.scrollBehavior = ''; this.view._ai = -2; } // start at the first chip (or centre the active one)
      this._changed();
      this._position();
      const ac = (this._sac = new AbortController()), sig = { signal: ac.signal };
      document.addEventListener('pointerdown', e => {
        if (!this.o.closeOnOutsideClick) return;
        const path = e.composedPath ? e.composedPath() : [e.target];
        if (path.includes(root) || path.includes(this.el)) return;
        if (this._bd && path.includes(this._bd)) { // swallow the ghost click that would land on the field beneath the backdrop
          const kill = ev => { ev.stopPropagation(); ev.preventDefault(); };
          this._ghostKill = kill;
          document.addEventListener('click', kill, { capture: true, once: true });
          clearTimeout(this._ghost);
          this._ghost = setTimeout(() => document.removeEventListener('click', kill, true), 500);
        }
        this.close('outside', false);
      }, { ...sig, capture: true });
      const re = () => { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this._position(); }); };
      window.addEventListener('scroll', re, { ...sig, capture: true, passive: true }); // ONE capture listener sees every scrolling ancestor
      window.addEventListener('resize', re, sig);
      this._locked = this.o.lockScroll || this._sheet;
      if (this._locked) { this._prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
      this.el.setAttribute('aria-expanded', 'true'); this.el.setAttribute('aria-controls', this.view.id);
      this._emit('open', {});
      if (o.focus === true || (o.focus !== false && this.el.readOnly)) { this._focusGrid = true; this._changed(); }
      return this;
    }
    close(reason = 'api', restoreFocus) {
      if (!this.isOpen || this.o.inline || this.headless) return this;
      const root = this.view.root;
      this.model.cancel(); // uncommitted draft is discarded
      if (restoreFocus === undefined) restoreFocus = true;
      if (restoreFocus && this.o.restoreFocus && this.el && root.contains(document.activeElement)) {
        this._noFocusOpen = true;
        try { this.el.focus({ preventScroll: true }); } finally { this._noFocusOpen = false; }
      }
      root.hidden = true;
      this.isOpen = false;
      this._located = 0;
      this._ys.open = false;
      if (this._bd) { this._bd.remove(); this._bd = null; }
      this._sheet = false;
      if (this._sac) this._sac.abort();
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
      if (this._locked) { document.body.style.overflow = this._prevOverflow || ''; this._locked = false; }
      this.el.setAttribute('aria-expanded', 'false');
      this._emit('close', { reason });
      return this;
    }
    toggle() { return this.isOpen ? this.close('api') : this.open(); }
    _position() {
      if (!this.isOpen || this.o.inline || !this.view) return;
      if (this._sheet) { this.view.root.style.top = this.view.root.style.left = ''; return; }
      const p = this.view.root, r = this.el.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight, gap = this.o.offsetY, pos = this.o.position;
      const top = pos === 'top' || (pos === 'auto' && vh - r.bottom < ph + gap && r.top > vh - r.bottom);
      const y = clamp(top ? r.top - ph - gap : r.bottom + gap, 4, Math.max(4, vh - ph - 4));
      const x = clamp((this._dir() === 'rtl' ? r.right - pw : r.left) + this.o.offsetX, 4, Math.max(4, vw - pw - 4));
      if (this.o.strategy === 'absolute') {
        p.style.position = 'absolute';
        const host = p.offsetParent || document.body, hr = host.getBoundingClientRect();
        p.style.top = Math.round(y - hr.top - host.clientTop + host.scrollTop) + 'px'; p.style.left = Math.round(x - hr.left - host.clientLeft + host.scrollLeft) + 'px';
      } else { p.style.position = ''; p.style.top = Math.round(y) + 'px'; p.style.left = Math.round(x) + 'px'; }
      setA(p, 'data-placement', top ? 'top' : 'bottom');
    }

    /** Idempotent. Removes every listener, timer and DOM node this instance created. */
    destroy() {
      if (this.destroyed) return;
      if (this.isOpen && !this.o.inline) this.close('destroy', false);
      this.destroyed = true;
      this._emit('destroy', {});
      if (this._eac) this._eac.abort();
      if (this._sac) this._sac.abort();
      if (this._raf) cancelAnimationFrame(this._raf);
      this._destroyView();
      if (this._bd) this._bd.remove();
      clearTimeout(this._ghost);
      if (this._ghostKill) document.removeEventListener('click', this._ghostKill, true);
      this.provider.destroy();
      if (this.el) {
        for (const [a, v] of this._saved || []) { if (v == null) this.el.removeAttribute(a); else this.el.setAttribute(a, v); }
        this.el.removeAttribute('aria-invalid'); this.el.classList && this.el.classList.remove('izi-invalid');
        if (INSTANCES.get(this.el) === this) INSTANCES.delete(this.el);
      }
      this.bus.clear();
    }

    /* ------------------------------------------------------------------ statics */
    static getInstance(el) { return INSTANCES.get(typeof el === 'string' ? document.querySelector(el) : el) || null; }
    static init(selector, options) { return Array.from(document.querySelectorAll(selector), n => new iZiDatePicker(n, options)); }
    /** Headless instance: no DOM; drive it with select()/goTo()/setValue() and render getState() yourself. */
    static create(options) { return new iZiDatePicker(null, options); }
    /** Register UI strings for a language/tag. Nested tables (presets, presetReasons, holidayTypes) are merged over the English ones. */
    static registerLocale(name, locale) {
      LOCALES[name] = { ...LOCALES.en, ...locale };
      for (const k of ['presets', 'presetReasons', 'holidayTypes']) LOCALES[name][k] = { ...LOCALES.en[k], ...(locale[k] || {}) };
    }
    /** headless helper: select a date by {jy,jm,jd} or key and commit when complete */
    select(d) { const k = typeof d === 'number' ? d : K(d.jy, d.jm, d.jd); return this._pick(k); }
    commit() { return this._commit('api'); }
  }
  bindCal(CalendarModel); bindCal(HolidayProvider); bindCal(iZiDatePicker);
  /** Create a picker for every [data-izi] element. Options: <input data-izi='{"mode":"range"}'>. Idempotent. */
  iZiDatePicker.autoInit = (rootEl = document) => Array.from(rootEl.querySelectorAll('[data-izi]'), n => {
    if (INSTANCES.has(n)) return INSTANCES.get(n);
    let o = {};
    try { o = JSON.parse(n.getAttribute('data-izi') || '{}'); } catch (e) { console.warn('[iZiDatePicker] invalid JSON in data-izi', n); }
    return new iZiDatePicker(n, o);
  });
  iZiDatePicker.version = '1.0.0';
  iZiDatePicker.defaults = DEFAULTS;
  iZiDatePicker.converter = { ...JALCONV, parse: (s, loc) => parse(s, { loc: resolveLocale(loc), cal: 'jalali', digits: 'latn' }), format: (v, f, loc) => format(v, f, { loc: resolveLocale(loc), cal: 'jalali', digits: 'latn' }) };
  /** Gregorian calendar helpers (same shape as `converter`). */
  iZiDatePicker.gregorian = { isLeap: GRE.isLeap, monthLength: GRE.monthLength, toJDN: GRE.toJDN, fromJDN: j => { const g = d2g(j); return { gy: g.gy, gm: g.gm, gd: g.gd }; }, dayOfWeek: J.dayOfWeek, isValid: GRE.isValid };
  iZiDatePicker.HolidayProvider = HolidayProvider;
  iZiDatePicker.default = iZiDatePicker;
  return iZiDatePicker;
};
const iZiDatePicker = factory();
export { iZiDatePicker };
export default iZiDatePicker;
