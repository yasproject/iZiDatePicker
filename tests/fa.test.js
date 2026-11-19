// اجرا:  npm i jsdom && node tests/fa.test.js
// آزمون‌های مخصوص زبان فارسی: ارقام، نام ماه‌ها، راست‌به‌چپ، تعطیلات، ورودی تایپ‌شده، دسترس‌پذیری
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../izi-datepicker.js'), 'utf8');
const dataPath = path.join(__dirname, '1405.json');
let موفق = 0, ناموفق = 0, بخش = '';
const ok = (شرط, پیام) => { if (شرط) موفق++; else { ناموفق++; console.log(`  ✗ [${بخش}] ${پیام}`); } };
const eq = (a, b, پیام) => ok(JSON.stringify(a) === JSON.stringify(b), `${پیام} ← دریافت‌شده: ${JSON.stringify(a)} | انتظار: ${JSON.stringify(b)}`);
const گروه = ن => { بخش = ن; console.log('# ' + ن); };
function محیط() {
  const d = new JSDOM('<body><input id="a"><input id="b"></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  d.window.eval(src); return d.window;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let w = محیط(), P = w.iZiDatePicker, p;
  const مبدل = P.converter;

  گروه('ظاهر پیش‌فرض فارسی');
  p = new P('#a', { value: '1405/01/01' }); p.open();
  let ریشه = p.view.root;
  eq(ریشه.getAttribute('dir'), 'rtl', 'جهت پیش‌فرض باید راست‌به‌چپ باشد');
  eq([...ریشه.querySelectorAll('.izi-weekday:not(.izi-weekno-head)')].map(e => e.textContent), ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'], 'هفته باید از شنبه شروع شود و با جمعه تمام شود');
  const ماه‌ها = [...ریشه.querySelectorAll('.izi-month-select option')].map(o => o.textContent);
  eq([ماه‌ها[0], ماه‌ها[2], ماه‌ها[9], ماه‌ها[11]], ['فروردین', 'خرداد', 'دی', 'اسفند'], 'نام ماه‌ها شمسی است (نه میلادی)');
  eq(ماه‌ها.length, 12, 'دوازده ماه');
  ok([...ریشه.querySelectorAll('.izi-year-select option')].some(o => o.textContent === '۱۴۰۵'), 'سال‌ها با رقم فارسی نمایش داده می‌شوند');
  eq(ریشه.querySelector('.izi-month-select').selectedOptions[0].textContent, 'فروردین', 'ماه جاری انتخاب شده است');
  eq(ریشه.querySelector('.izi-prev').getAttribute('aria-label'), 'ماه قبل', 'برچسب دکمهٔ قبلی');
  eq(ریشه.querySelector('.izi-next').getAttribute('aria-label'), 'ماه بعد', 'برچسب دکمهٔ بعدی');
  eq(ریشه.getAttribute('aria-label'), 'انتخاب تاریخ', 'برچسب دیالوگ');
  eq([...ریشه.querySelectorAll('.izi-btn')].map(b => b.textContent.trim()), ['امروز', 'حذف'], 'دکمه‌های پایین در حالت تاریخ ساده');
  ok(ریشه.querySelector('.izi-nav-btn svg') !== null, 'آیکون ناوبری موجود است (در CSS برای RTL آینه می‌شود)');
  p.destroy();

  گروه('ارقام فارسی');
  p = new P('#a', {}); p.open(); p.goTo(1405, 1);
  const خانه = k => p.view.root.querySelector(`.izi-day-cell[data-key="${k}"]`);
  eq(خانه(14050101).textContent, '۱', 'عدد روز با رقم فارسی');
  eq(خانه(14050129).textContent, '۲۹', 'عدد دو رقمی');
  p.setValue('1405/03/07');
  eq(w.document.getElementById('a').value, '1405/03/07', 'در input پیش‌فرض ارقام لاتین نوشته می‌شود (قابل ارسال به سرور)');
  p.setOptions({ inputDigits: 'fa' }); p.setValue('1405/03/07');
  p.clear({ silent: true }); p.setValue('1405/03/08'); eq(w.document.getElementById('a').value, '۱۴۰۵/۰۳/۰۸', 'با inputDigits:"fa" ارقام فارسی نوشته می‌شود');
  p.setOptions({ digits: 'latn' }); p.goTo(1405, 2); eq(خانه(14050201).textContent, '1', 'با digits:"latn" رابط کاربری لاتین می‌شود');
  p.destroy();

  گروه('پیش‌نمایش و اعلان‌ها (صفحه‌خوان)');
  p = new P('#a', { value: '1405/01/01' }); p.open();
  eq(p.view.root.querySelector('.izi-preview-full').textContent, 'شنبه ۱ فروردین ۱۴۰۵', 'متن پیش‌نمایش بدون هیچ رشتهٔ ثابتِ «ماه»');
  eq(p.view.root.querySelector('.izi-preview-year').textContent, '۱۴۰۵', 'سال بزرگ پیش‌نمایش');
  const برچسب = خانه2(p, 14050101).getAttribute('aria-label'); function خانه2(q, k) { return q.view.root.querySelector(`.izi-day-cell[data-key="${k}"]`); }
  ok(برچسب.includes('شنبه') && برچسب.includes('فروردین') && برچسب.includes('عید نوروز'), 'aria-label شامل روز هفته، ماه و عنوان تعطیلی است: ' + برچسب);
  p._pick(14050110); ok(p.view.root.querySelector('.izi-live').textContent.includes('انتخاب شد'), 'ناحیهٔ زنده «انتخاب شد» را اعلام می‌کند');
  p.next(); ok(p.view.root.querySelector('.izi-live').textContent.includes('اردیبهشت'), 'تغییر ماه اعلام می‌شود');
  p.destroy();
  const ب = new P('#b', { mode: 'range' }); ب.open(); eq(ب.view.root.querySelector('.izi-preview-full').textContent, 'انتخاب محدوده', 'متن جایگزین حالت بازه');
  ب._pick(14050110); ok(ب.view.root.querySelector('.izi-live').textContent.includes('تاریخ پایان را انتخاب کنید'), 'پس از کلیک اول، راهنمای انتخاب پایان اعلام می‌شود');
  ok(ب.view.root.querySelector('.izi-preview-full').textContent.includes('→'), 'پیش‌نمایش بازه نیمه‌کاره'); ب.destroy();

  گروه('ورودی تایپ‌شده');
  p = new P('#a', {}); const ورودی = w.document.getElementById('a');
  const تایپ = متن => { ورودی.value = متن; ورودی.dispatchEvent(new w.Event('change')); };
  تایپ('۱۴۰۵/۰۳/۰۷'); eq(p.getValue('jalali'), '1405/03/07', 'ارقام فارسی تایپ‌شده پذیرفته می‌شود');
  eq(ورودی.value, '1405/03/07', 'متن به قالب استاندارد بازنویسی می‌شود');
  تایپ('٠١/٠٢/١٤٠٥'.replace(/\//g, '/')); eq(p.getValue('jalali'), '1405/02/01', 'ارقام عربی-هندی و ترتیب روز/ماه/سال');
  تایپ('۷ خرداد ۱۴۰۵'); eq(p.getValue('jalali'), '1405/03/07', 'تاریخ با نام ماه فارسی');
  تایپ('14 دی 1405'); eq(p.getValue('jalali'), '1405/10/14', '«دی» با «اردیبهشت» اشتباه گرفته نمی‌شود');
  تایپ('1405/13/01'); eq(ورودی.getAttribute('aria-invalid'), 'true', 'ماه ۱۳ نامعتبر است'); eq(p.getValue('jalali'), '1405/10/14', 'مقدار قبلی دست‌نخورده می‌ماند');
  تایپ('1405/12/30'); eq(ورودی.getAttribute('aria-invalid'), 'true', '۳۰ اسفند ۱۴۰۵ نامعتبر است (سال کبیسه نیست)');
  تایپ('1403/12/30'); ok(p.getValue('jalali') === '1403/12/30', '۳۰ اسفند ۱۴۰۳ معتبر است (سال کبیسه)');
  ok(ورودی.getAttribute('aria-invalid') === null, 'پس از ورودی معتبر، علامت نامعتبر برداشته می‌شود');
  تایپ(''); eq(p.getValue(), null, 'متن خالی انتخاب را پاک می‌کند');
  p.setOptions({ minDate: '1405/01/20', maxDate: '1405/02/20' }); تایپ('1405/01/10'); eq(ورودی.getAttribute('aria-invalid'), 'true', 'تاریخ قبل از minDate رد می‌شود');
  تایپ('1405/03/10'); eq(ورودی.getAttribute('aria-invalid'), 'true', 'تاریخ بعد از maxDate رد می‌شود');
  p.destroy();

  گروه('ساعت (۱۲ و ۲۴ ساعته)');
  p = new P('#a', { timePicker: true, timeFormat: '12h', value: '1405/01/10 03:30 ب.ظ' });
  eq([p.model.value.start.hour, p.model.value.start.minute], [15, 30], 'ب.ظ تجزیه می‌شود (۳:۳۰ بعدازظهر = ۱۵:۳۰)');
  eq(p._fmtValue(), '1405/01/10 03:30 ب.ظ', 'خروجی ۱۲ ساعته با ق.ظ/ب.ظ');
  p.setValue('1405/01/10 12:05 ق.ظ'); eq(p.model.value.start.hour, 0, '۱۲ ق.ظ یعنی نیمه‌شب');
  p.setValue('1405/01/10 12:05 ب.ظ'); eq(p.model.value.start.hour, 12, '۱۲ ب.ظ یعنی ظهر');
  p.open(); const ساعت = p.view.root.querySelector('.izi-time-section');
  ok(ساعت.querySelector('.izi-hour-select option').textContent.match(/[۰-۹]/), 'گزینه‌های ساعت با ارقام فارسی');
  eq([...ساعت.querySelectorAll('.izi-ampm-select option')].map(o => o.textContent), ['ق.ظ', 'ب.ظ'], 'گزینه‌های ق.ظ/ب.ظ');
  eq([...p.view.root.querySelectorAll('.izi-btn')].map(b => b.textContent.trim()), ['حذف', 'امروز', 'تأیید', 'انصراف'], 'دکمه‌های تأیید و انصراف با ساعت');
  eq(ساعت.querySelector('.izi-time-selectors').getAttribute('aria-label'), 'زمان', 'برچسب گروه ساعت');
  p.destroy();
  p = new P('#a', { timePicker: true, timeFormat: '24h', showSeconds: true, value: '۱۴۰۵/۰۱/۱۰ ۱۴:۰۵:۰۹' });
  eq(p._fmtValue(), '1405/01/10 14:05:09', 'ورودی با ارقام فارسی، قالب ۲۴ ساعته با ثانیه'); p.destroy();
  p = new P('#a', { mode: 'range', timePicker: true }); p.open();
  eq([...p.view.root.querySelectorAll('.izi-time-label')].map(l => l.textContent.trim()), ['شروع', 'پایان'], 'برچسب‌های ساعت شروع و پایان (در v4 ثابت‌نویسی شده بود)'); p.destroy();

  گروه('تعطیلات رسمی (لایه ۱ و ۲)');
  p = new P('#a', {}); const تعطیل = (m, d, y = 1405) => p.provider.getDay(y, m, d);
  eq(تعطیل(1, 1).titles, ['عید نوروز'], 'نوروز');
  eq([1, 2, 3, 4].map(d => !!تعطیل(1, d)), [true, true, true, true], 'چهار روز اول فروردین');
  eq(تعطیل(1, 13).titles, ['روز طبیعت'], 'سیزده‌به‌در');
  eq(تعطیل(12, 29).titles, ['روز ملی شدن صنعت نفت ایران'], '۲۹ اسفند (در نسخهٔ قبل جا افتاده بود)');
  eq(تعطیل(11, 22).primary, 'official', '۲۲ بهمن');
  eq(تعطیل(2, 14), null, '۱۴ اردیبهشت تعطیل نیست (در نسخهٔ قبل اشتباهاً بود)');
  eq(تعطیل(1, 7).types, ['weekly'], 'جمعه ۷ فروردین ۱۴۰۵: تعطیل هفتگی');
  eq(تعطیل(1, 7).titles, ['تعطیل آخر هفته'], 'عنوان تعطیل هفتگی');
  eq(تعطیل(1, 6), null, 'پنجشنبه تعطیل رسمی نیست، فقط تکیهٔ آخر هفته');
  p.setOptions({ weeklyHolidays: ['thursday', 'friday'] }); eq(!!تعطیل(1, 6), true, 'پنجشنبه با weeklyHolidays قابل تنظیم است');
  p.destroy();

  گروه('تعطیلات مذهبی از فایل 1405.json');
  if (fs.existsSync(dataPath)) {
    const داده = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    p = new P('#a', { holidays: { data: { 1405: داده } } }); const د = (m, d) => p.provider.getDay(1405, m, d);
    eq(د(1, 1).types, ['religious'], '۱ فروردین ۱۴۰۵ عید فطر است و مذهبی طبقه‌بندی می‌شود');
    eq(د(1, 1).titles, ['عید سعید فطر'], 'عنوان عید فطر');
    eq(د(4, 4).titles, ['عاشورای حسینی'], 'عاشورا'); eq(د(4, 3).primary, 'religious', 'تاسوعا');
    eq(د(1, 3).primary, 'official', 'نوروز رسمی می‌ماند (مذهبی نمی‌شود)');
    eq(د(12, 29).titles, ['روز ملی شدن صنعت نفت ایران'], 'نویسهٔ اضافی «- » ابتدای عنوان پاک می‌شود');
    eq(د(3, 15).types, ['official', 'weekly'], '۱۵ خرداد ۱۴۰۵ هم رسمی و هم جمعه است');
    eq(د(5, 13).primary, 'religious', 'اربعین');
    ok(p.provider.getDay(1404, 1, 1).primary === 'official', 'سال بدون داده به لایهٔ ثابت برمی‌گردد');
    p.open(); p.goTo(1405, 4);
    eq(خانه2(p, 14050404).getAttribute('data-holiday-type'), 'religious', 'صفت data-holiday-type روی خانهٔ عاشورا');
    eq(خانه2(p, 14050404).getAttribute('title'), 'عاشورای حسینی', 'راهنمای (tooltip) عنوان تعطیلی را نشان می‌دهد');
    p.setOptions({ disableHolidays: ['religious'] }); p.goTo(1405, 4);
    eq(خانه2(p, 14050404).getAttribute('aria-disabled'), 'true', 'غیرفعال‌سازی فقط تعطیلات مذهبی'); ok(خانه2(p, 14050410).getAttribute('aria-disabled') === null, 'روز عادی فعال می‌ماند');
    p.destroy();
  } else console.log('  (فایل tests/1405.json یافت نشد؛ این بخش رد شد)');

  گروه('بارگذاری ناهمگام تعطیلات');
  p = new P('#a', {}); let تماس = 0, آزاد; const منتظر = new Promise(r => (آزاد = r));
  p.setOptions({ holidays: { provider: async () => { تماس++; await منتظر; return [{ jm: 5, jd: 5, title: 'تعطیلی آزمایشی', type: 'religious' }]; } } });
  p.goTo(1407, 5); ok(p.getState().loading, 'تا رسیدن داده، خانه‌ها در حالت بارگذاری هستند'); eq(تماس, 1, 'درخواست تکراری ارسال نمی‌شود');
  p.open(); ok(p.view.root.querySelector('.izi-day-cell[data-loading]') !== null, 'صفت data-loading روی خانه‌ها'); eq(p.view.root.querySelector('.izi-days-grid').getAttribute('aria-busy'), 'true', 'aria-busy روی جدول');
  آزاد(); await sleep(20);
  eq(p.provider.getDay(1407, 5, 5).titles, ['تعطیلی آزمایشی'], 'داده اعمال شد'); ok(!p.getState().loading, 'حالت بارگذاری برداشته شد');
  p.setOptions({ holidays: { provider: async () => { throw new Error('قطع'); } } }); let خطا = 0; p.on('holidaysError', e => { if (e.year === 1408) خطا++; }); p.goTo(1408, 5); await sleep(20);
  eq(خطا, 1, 'خطای ارائه‌دهنده رویداد holidaysError می‌دهد'); eq(p.provider.getDay(1408, 1, 1).primary, 'official', 'پس از خطا به تعطیلات ثابت برمی‌گردد'); p.destroy();

  گروه('جهت راست‌به‌چپ و صفحه‌کلید');
  p = new P('#a', { value: '1405/01/10' }); p.open({ focus: true }); const فعال = () => w.document.activeElement;
  const کلید = (k, shift) => فعال().dispatchEvent(new w.KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true }));
  eq(+فعال().dataset.key, 14050110, 'فوکوس روی تاریخ انتخاب‌شده');
  کلید('ArrowLeft'); eq(+فعال().dataset.key, 14050111, 'در RTL فلش چپ = روز بعد');
  کلید('ArrowRight'); کلید('ArrowRight'); eq(+فعال().dataset.key, 14050109, 'در RTL فلش راست = روز قبل');
  کلید('ArrowDown'); eq(+فعال().dataset.key, 14050116, 'فلش پایین = هفتهٔ بعد');
  کلید('Home'); eq(مبدل.dayOfWeek(مبدل.toJDN(1405, 1, +String(فعال().dataset.key).slice(-2))), 6, 'Home = شنبه (ابتدای هفته)');
  کلید('End'); eq(مبدل.dayOfWeek(مبدل.toJDN(1405, 1, +String(فعال().dataset.key).slice(-2))), 5, 'End = جمعه (انتهای هفته)');
  کلید('PageDown'); eq(Math.floor(+فعال().dataset.key / 100), 140502, 'PageDown = ماه بعد');
  کلید('PageUp', true); eq(Math.floor(+فعال().dataset.key / 100), 140402, 'Shift+PageUp = سال قبل');
  کلید('Escape'); ok(!p.isOpen, 'Escape تقویم را می‌بندد'); eq(w.document.activeElement.id, 'a', 'فوکوس به input برمی‌گردد'); p.destroy();

  گروه('کبیسه و مرز سال‌ها');
  eq([مبدل.monthLength(1403, 12), مبدل.monthLength(1404, 12), مبدل.monthLength(1408, 12)], [30, 29, 30], 'اسفند ۱۴۰۳ و ۱۴۰۸ کبیسه، ۱۴۰۴ عادی');
  eq(مبدل.toGregorian(1405, 1, 1), { gy: 2026, gm: 3, gd: 21 }, 'نوروز ۱۴۰۵ = ۲۱ مارس ۲۰۲۶');
  eq(مبدل.toGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 }, 'نوروز ۱۴۰۳ = ۲۰ مارس ۲۰۲۴');
  eq(مبدل.toJalali(2027, 3, 21), { jy: 1406, jm: 1, jd: 1 }, 'نوروز ۱۴۰۶');
  eq(مبدل.dayOfWeek(مبدل.toJDN(1405, 1, 1)), 6, '۱ فروردین ۱۴۰۵ شنبه است');
  p = new P('#a', { maxYear: 1405 }); p.goTo(1405, 12); p.next(); eq([p.model.view.jy, p.model.view.jm], [1405, 12], 'در آخرین ماه مجاز، «بعدی» جا نمی‌پرد'); p.destroy();

  گروه('خروجی میلادی و قالب‌ها');
  p = new P('#a', { outputCalendar: 'gregorian', value: '2026-05-28' });
  eq(p.getValue('jalali'), '1405/03/07', 'ورودی میلادی به شمسی تبدیل می‌شود'); eq(w.document.getElementById('a').value, '2026/05/28', 'خروجی به میلادی نوشته می‌شود'); p.destroy();
  p = new P('#a', { format: 'dddd D MMMM YYYY', value: '1405/03/07' }); eq(p._fmtValue(), 'پنجشنبه 7 خرداد 1405', 'قالب با نام روز و ماه فارسی'); p.destroy();
  p = new P('#a', { format: '[سال] YYYY، ماه MM', value: '1405/03/07' }); eq(p._fmtValue(), 'سال 1405، ماه 03', 'متن فارسی داخل [ ] بدون تغییر می‌ماند'); p.destroy();
  p = new P('#a', { locale: 'en', value: '1405/03/07' }); p.open(); eq(p.view.root.getAttribute('dir'), 'ltr', 'زبان en جهت چپ‌به‌راست دارد'); eq(p._fmtValue().length, 10, 'قالب ثابت'); p.destroy();
  p = new P('#a', { locale: { months: ['م۱'], base: 'fa' }, value: '1405/01/01' }); eq(p.loc.months[0], 'م۱', 'بازنویسی بخشی از زبان فارسی'); eq(p.loc.weekdays[6], 'شنبه', 'بقیهٔ کلیدها از fa می‌آید'); p.destroy();

  گروه('امنیت: عنوان تعطیلی هرگز HTML نمی‌شود');
  p = new P('#a', { holidays: { data: { 1405: [{ jm: 1, jd: 7, title: '<img src=x onerror=alert(1)>' }] } } }); p.open(); p.goTo(1405, 1);
  ok(!p.view.root.querySelector('img'), 'تگ تزریق‌شده ساخته نمی‌شود'); ok(خانه2(p, 14050107).getAttribute('title').includes('<img'), 'به‌صورت متن ساده در title می‌آید'); p.destroy();


  گروه('جدول ماه: بازگشت‌پذیری برای تمام ماه‌های ۱۳۰۰ تا ۱۵۰۰');
  { const q = new P(null, {}); let بد = 0, نخستین = '';
    for (let fd = 0; fd < 7; fd++) { q.setOptions({ firstDayOfWeek: fd });
      for (let y = 1300; y <= 1500; y++) for (let m = 1; m <= 12; m++) { q.goTo(y, m); const c = q.getMonthData().flat();
        let خوب = c.length === 42 && c[0].weekday === fd && c.some(x => x.jy === y && x.jm === m && x.jd === 1) && c.filter(x => !x.outside).length === مبدل.monthLength(y, m);
        for (let i = 1; خوب && i < 42; i++) if (c[i].jdn !== c[i - 1].jdn + 1) خوب = false;
        if (!خوب) { بد++; if (!نخستین) نخستین = `${y}/${m} fd=${fd}`; } } }
    eq(بد, 0, 'هر ماه باید ۴۲ خانهٔ پیوسته داشته باشد، از روز شروع هفته آغاز شود و روز اول ماه را در بر بگیرد (نخستین خطا: ' + نخستین + ')'); q.destroy(); }
  p = new P('#a', {}); p.open(); p.goTo(1405, 3);
  eq(p.view.root.querySelector('.izi-day-cell:not(.izi-faded)').getAttribute('data-key'), '14050301', 'خرداد ۱۴۰۵ (جمعه شروع می‌شود): روز اول نباید از جدول بیفتد');
  eq([...p.view.root.querySelectorAll('.izi-day-cell:not(.izi-faded)')].length, 31, 'خرداد ۳۱ روز دارد'); p.destroy();
  console.log(`\nنتیجه: ${موفق} موفق، ${ناموفق} ناموفق`); process.exit(ناموفق ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
