<div dir="rtl">

# ۹. مرجع API

[فهرست مستندات](../README.md) · [English](../en/09-api-reference.md) · **فارسی** · [→ فریم‌ورک‌ها و موارد پیشرفته](08-frameworks-and-advanced.md) · بعدی: [پرسش‌های متداول ←](10-faq.md)

نوع‌های کامل و دقیق در [`izi-datepicker.d.ts`](../../izi-datepicker.d.ts) است. در ادامه هر گزینه با زبان ساده آمده است. تاریخ را می‌توانید به‌صورت متن در تقویم خود picker بنویسید (`'1405/03/07'`، `'2026-05-28'`)، یا `Date` جاوااسکریپت، یا شیء `{ year, month, day }`.

```js
new iZiDatePicker(target, options)   // target: یک selector، یک <input>، یا (با inline) هر عنصر
```

## گزینه‌ها

### تقویم، حالت و مقدار
| گزینه | پیش‌فرض | کار |
|---|---|---|
| `calendar` | `'jalali'` | `'jalali'` یا `'gregorian'` |
| `mode` | `'single'` | `single` `range` `multiple` `week` `month` `time` `timerange` (`datetime` / `datetime-range` = حالت + ساعت) |
| `value` | `null` | مقدار اولیه: متن، `Date`، شیء یا `[شروع, پایان]` |
| `inline` | `false` | همیشه نمایان به‌جای پنجرهٔ بازشو |
| `locale` | `'fa'` / `'en'` | زبان؛ [راهنمای ۲](02-calendars-and-languages.md) |
| `dateOrder` | `'dmy'` | ترتیب تاریخ میلادیِ تایپ‌شده: `'dmy'` یا `'mdy'` |
| `format` | بسته به تقویم | قالب نوشتن تاریخ (نشانه‌ها در راهنمای ۲) |
| `rangeSeparator` | `' - '` | متن بین دو سر بازه |
| `outputCalendar` | تقویم خود picker | تقویمِ متن داخل کادر |
| `digits` / `inputDigits` | `'locale'` / `'latn'` | ارقام روی تقویم / داخل کادر |
| `emitInputEvents` | `true` | ارسال رویدادهای بومی `input`/`change` (فریم‌ورک‌ها به این‌ها گوش می‌دهند) |
| `placeholder` | خودکار | متن راهنمای کادر |

### ظاهر
| گزینه | کار |
|---|---|
| `theme` | `'light'` `'dark'` `'auto'` |
| `size` / `width` / `fontSize` / `fontFamily` | اندازهٔ آماده یا مقدار دقیق |
| `accent` / `colors` / `cssVars` | رنگ‌ها ([راهنمای ۷](07-styling-and-themes.md)) |
| `radius` / `cellShape` / `density` / `shadow` | شکل و فاصله |
| `weekdayFormat` | `'narrow'` `'short'` `'long'` |
| `showOutsideDays` `showWeekdays` `showPreview` `showMonthYearSelector` `showWeekNumbers` `showButtonIcons` | نمایش یا پنهان کردن بخش‌ها |
| `highlightWeekend` `highlightHolidays` `highlightToday` `tooltip` | برجسته‌سازی |
| `animation` | `'fade'` یا `'none'` |
| `classNames` / `customClass` / `dir` | کلاس‌های اضافه، جهت |
| `footerButtons` | `'auto'` `'none'` یا فهرستی از `today clear confirm cancel` / دکمه‌های سفارشی |
| `renderDay` / `renderHeader` / `renderFooter` | رندر کردن بخش‌ها توسط خودتان |
| `secondaryCalendar` | تاریخ دوم کوچک زیر هر روز |
| `yearPicker` | `'select'` یا `'grid'` |

### قانون‌ها و محدودیت‌ها
| گزینه | کار |
|---|---|
| `minDate` `maxDate` | بازهٔ مجاز |
| `disablePast` `disableFuture` | بستن قبل / بعد از امروز |
| `disabledDates` `disabledRanges` `disabledWeekdays` `disableHolidays` `isDateDisabled` | بستن روزهای مشخص |
| `minRangeDays` `maxRangeDays` `rangeBacktrack` `rangeSpanDisabled` | قانون‌های بازه |
| `maxDates` `multipleSeparator` | حالت `multiple` |
| `firstDayOfWeek` `weekend` `weeklyHolidays` | چیدمان هفته (به‌طور پیش‌فرض خودکار) |
| `minYear` `maxYear` `timeZone` | سال‌های پشتیبانی‌شده، منطقهٔ زمانی |

### ساعت
`timePicker` `timeFormat` (`'12h'`/`'24h'`) `timeStep` `showSeconds` `minTime` `maxTime` `defaultTime` `defaultEndTime` `timeSlots` `confirm` (`'auto'` / `true` / `false`)

### رفتار و جایگاه
`closeOnSelect` `closeOnClear` `closeOnOutsideClick` `openOn` (`'click'` `'focus'` `'both'`) `restoreFocus` `syncWithInput` `appendTo` `position` `offsetX` `offsetY` `zIndex` `lockScroll` `strategy` `sheet` `swipe` `suppressKeyboard`

### قابلیت‌ها
| گزینه | کار |
|---|---|
| `months` | ۱، ۲ یا ۳ ماه کنار هم |
| `dragSelect` | انتخاب بازه با کشیدن موس |
| `presets` `presetsLayout` `presetsPosition` `presetsOverflow` `presetsArrows` | میانبرها ([راهنمای ۳](03-modes-ranges-presets.md)) |
| `compare` | مقایسهٔ دو بازه ([راهنمای ۶](06-compare-ranges.md)) |
| `timeSlots` | زمان‌های رزرو ([راهنمای ۵](05-time-and-booking.md)) |
| `holidays` | داده و منبع تعطیلات ([راهنمای ۴](04-holidays.md))؛ `false` تعطیلات را خاموش می‌کند |
| `holidayList` | پنل تعطیلات: `position` `types` `export` `scope` `listScope` `onClick` |

### callbackها (میان‌بر `picker.on(...)`)
`onOpen(picker)` · `onClose(reason, picker)` · `onSelect(date, text, picker)` · `onRangeSelect(start, end, text, picker)` · `onChange(payload, picker)` · `onClear(picker)` · `onChangeMonth(month, year, picker)` · `onChangeYear(year, picker)` · `onBeforeSelect(date, payload, picker)` (برای رد کردن `false` برگردانید) · `onHolidaysLoaded({year, source}, picker)` · `onHolidaysError({year, error}, picker)` · `onInvalidInput(text, picker)` · `onUpdate(state, picker)` · `onDestroy(picker)`

## متدها

| متد | کار |
|---|---|
| `open({focus})` / `close()` / `toggle()` | نمایش یا پنهان کردن پنجره |
| `getValue(format)` | `'string'` (پیش‌فرض) `'object'` `'iso'` `'gregorian'` `'jalali'` `'timestamp'` (ثانیهٔ یونیکس) `'date'` `'time'` |
| `setValue(value, {silent})` | مقدار را بگذارید؛ اگر نامعتبر یا غیرمجاز باشد `false` برمی‌گرداند |
| `getRange()` | `{ start, end }` به‌صورت شیء تاریخ |
| `getCompare()` | بازهٔ مقایسهٔ ثبت‌شده یا `null` |
| `clear({silent})` | تقویم را خالی کنید |
| `setOptions({...})` | گزینه‌ها را بعداً عوض کنید |
| `goTo(year, month)` / `next()` / `prev()` | نما را جابه‌جا کنید |
| `select(dateOrYYYYMMDD)` / `commit()` | انتخاب یک روز با کد / تأیید |
| `getState()` / `getMonthData()` | داده‌های تقویم برای رندر بدون رابط |
| `listHolidays(opts)` / `exportHolidays(opts)` / `downloadHolidays(opts)` | تعطیلات به‌صورت داده / متن / فایل |
| `on(name, fn)` / `once` / `off` | رویدادها؛ `on` تابع لغو اشتراک برمی‌گرداند |
| `destroy()` | همه‌چیز را پاک می‌کند |

فقط‌خواندنی: `el`، `isOpen`، `destroyed`، `headless`.

## اعضای ایستا

| عضو | کار |
|---|---|
| `iZiDatePicker.version` | رشتهٔ نسخه |
| `iZiDatePicker.create(options)` | یک picker **بدون رابط** (بدون DOM) |
| `iZiDatePicker.init(selector, options)` | تقویم برای چند عنصر |
| `iZiDatePicker.autoInit(root)` | تقویم برای هر عنصر `[data-izi]` |
| `iZiDatePicker.getInstance(el)` | پیدا کردن picker یک عنصر |
| `iZiDatePicker.registerLocale(name, strings)` | افزودن یا گسترش یک زبان |
| `iZiDatePicker.converter` | `toGregorian(jy,jm,jd)`، `toJalali(gy,gm,gd)`، `isLeap(jy)`، `monthLength(jy,jm)` و ... |
| `iZiDatePicker.gregorian` | `isLeap`، `monthLength`، `toJDN`، `fromJDN`، `dayOfWeek`، `isValid` |

## رویدادها

| رویداد | داده |
|---|---|
| `open` / `close` | `{}` / `{ reason }` (`'select'` `'escape'` `'outside'` `'api'` ...) |
| `select` | `{ value, formatted, end? }` (`end` برای زمان‌های رزرو؛ `values` در حالت `multiple`) |
| `rangeSelect` | `{ start, end, formatted, compare? }` |
| `change` | همان دادهٔ `select` یا `rangeSelect` |
| `clear` | `{}` |
| `changeMonth` / `changeYear` | `{ year, month }` / `{ year }` |
| `beforeSelect` | قابل لغو: از شنونده `false` برگردانید |
| `holidaysLoaded` / `holidaysError` | `{ year, source? }` / `{ year, error }` |
| `invalidInput` | `{ text }` |
| `update` | کل وضعیت تقویم (در هر رندر دوباره) |
| `destroy` | `{}` |

## شیء تاریخ

```js
{ year: 1405, month: 3, day: 7, hour: 0, minute: 0, second: 0,
  jy: 1405, jm: 3, jd: 7 }          // jy/jm/jd همان عددها با نام‌های قدیمی
```
هر دو تقویم همین فیلدها را دارند: در تقویم میلادی، `year` سال میلادی است.

بعدی: [پرسش‌های متداول ←](10-faq.md)

</div>
