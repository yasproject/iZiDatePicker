# 9. API reference

[Docs home](../README.md) · **English** · [فارسی](../fa/09-api-reference.md) · [← Frameworks & advanced](08-frameworks-and-advanced.md) · Next: [FAQ & troubleshooting →](10-faq.md)

The full, exact types are in [`izi-datepicker.d.ts`](../../izi-datepicker.d.ts). Below is every option in plain words. Dates can be written as text in the picker's own calendar (`'1405/03/07'`, `'2026-05-28'`), as a JavaScript `Date`, or as an object `{ year, month, day }`.

```js
new iZiDatePicker(target, options)   // target: a selector, an <input>, or (with inline) any element
```

## Options

### Calendar, mode and value
| Option | Default | What it does |
|---|---|---|
| `calendar` | `'jalali'` | `'jalali'` or `'gregorian'` |
| `mode` | `'single'` | `single` `range` `multiple` `week` `month` `time` `timerange` (`datetime` / `datetime-range` = mode + time) |
| `value` | `null` | starting value: text, `Date`, object, or `[start, end]` |
| `inline` | `false` | always visible instead of a popup |
| `locale` | `'fa'` / `'en'` | language; see [guide 2](02-calendars-and-languages.md) |
| `dateOrder` | `'dmy'` | typed Gregorian dates: `'dmy'` or `'mdy'` |
| `format` | per calendar | how the date is written (tokens in guide 2) |
| `rangeSeparator` | `' - '` | text between range ends |
| `outputCalendar` | the picker's own | calendar of the text in the box |
| `digits` / `inputDigits` | `'locale'` / `'latn'` | digits on the calendar / in the box |
| `emitInputEvents` | `true` | fire native `input`/`change` events (frameworks listen to these) |
| `placeholder` | auto | placeholder text |

### Look
| Option | What it does |
|---|---|
| `theme` | `'light'` `'dark'` `'auto'` |
| `size` / `width` / `fontSize` / `fontFamily` | size presets or exact values |
| `accent` / `colors` / `cssVars` | colours ([guide 7](07-styling-and-themes.md)) |
| `radius` / `cellShape` / `density` / `shadow` | shape and spacing |
| `weekdayFormat` | `'narrow'` `'short'` `'long'` |
| `showOutsideDays` `showWeekdays` `showPreview` `showMonthYearSelector` `showWeekNumbers` `showButtonIcons` | show or hide parts |
| `highlightWeekend` `highlightHolidays` `highlightToday` `tooltip` | highlighting |
| `animation` | `'fade'` or `'none'` |
| `classNames` / `customClass` / `dir` | extra classes, direction |
| `footerButtons` | `'auto'` `'none'` or a list of `today clear confirm cancel` / custom buttons |
| `renderDay` / `renderHeader` / `renderFooter` | render parts yourself |
| `secondaryCalendar` | small second date under each day |
| `yearPicker` | `'select'` or `'grid'` |

### Rules and limits
| Option | What it does |
|---|---|
| `minDate` `maxDate` | allowed window |
| `disablePast` `disableFuture` | block before / after today |
| `disabledDates` `disabledRanges` `disabledWeekdays` `disableHolidays` `isDateDisabled` | block specific days |
| `minRangeDays` `maxRangeDays` `rangeBacktrack` `rangeSpanDisabled` | range rules |
| `maxDates` `multipleSeparator` | `multiple` mode |
| `firstDayOfWeek` `weekend` `weeklyHolidays` | week layout (automatic by default) |
| `minYear` `maxYear` `timeZone` | supported years, time zone |

### Time
`timePicker` `timeFormat` (`'12h'`/`'24h'`) `timeStep` `showSeconds` `minTime` `maxTime` `defaultTime` `defaultEndTime` `timeSlots` `confirm` (`'auto'` / `true` / `false`)

### Behaviour and placement
`closeOnSelect` `closeOnClear` `closeOnOutsideClick` `openOn` (`'click'` `'focus'` `'both'`) `restoreFocus` `syncWithInput` `appendTo` `position` `offsetX` `offsetY` `zIndex` `lockScroll` `strategy` `sheet` `swipe` `suppressKeyboard`

### Features
| Option | What it does |
|---|---|
| `months` | 1, 2 or 3 months side by side |
| `dragSelect` | drag with the mouse to select a range |
| `presets` `presetsLayout` `presetsPosition` `presetsOverflow` `presetsArrows` | quick ranges ([guide 3](03-modes-ranges-presets.md)) |
| `compare` | compare two ranges ([guide 6](06-compare-ranges.md)) |
| `timeSlots` | booking slots ([guide 5](05-time-and-booking.md)) |
| `holidays` | holiday data and sources ([guide 4](04-holidays.md)); `false` turns holidays off |
| `holidayList` | the holiday panel: `position` `types` `export` `scope` `listScope` `onClick` |

### Callbacks (shortcuts for `picker.on(...)`)
`onOpen(picker)` · `onClose(reason, picker)` · `onSelect(date, text, picker)` · `onRangeSelect(start, end, text, picker)` · `onChange(payload, picker)` · `onClear(picker)` · `onChangeMonth(month, year, picker)` · `onChangeYear(year, picker)` · `onBeforeSelect(date, payload, picker)` (return `false` to refuse) · `onHolidaysLoaded({year, source}, picker)` · `onHolidaysError({year, error}, picker)` · `onInvalidInput(text, picker)` · `onUpdate(state, picker)` · `onDestroy(picker)`

## Methods

| Method | What it does |
|---|---|
| `open({focus})` / `close()` / `toggle()` | show or hide the popup |
| `getValue(format)` | `'string'` (default) `'object'` `'iso'` `'gregorian'` `'jalali'` `'timestamp'` (Unix seconds) `'date'` `'time'` |
| `setValue(value, {silent})` | set the value; returns `false` if it is invalid or not allowed |
| `getRange()` | `{ start, end }` date objects |
| `getCompare()` | the committed comparison range or `null` |
| `clear({silent})` | empty the picker |
| `setOptions({...})` | change options later |
| `goTo(year, month)` / `next()` / `prev()` | move the view |
| `select(dateOrYYYYMMDD)` / `commit()` | pick a day by code / confirm |
| `getState()` / `getMonthData()` | calendar data for headless rendering |
| `listHolidays(opts)` / `exportHolidays(opts)` / `downloadHolidays(opts)` | holidays as data / text / a file |
| `on(name, fn)` / `once` / `off` | events; `on` returns an unsubscribe function |
| `destroy()` | remove everything |

Read-only: `el`, `isOpen`, `destroyed`, `headless`.

## Static members

| Member | What it does |
|---|---|
| `iZiDatePicker.version` | the version string |
| `iZiDatePicker.create(options)` | a **headless** picker (no DOM) |
| `iZiDatePicker.init(selector, options)` | pickers for many elements |
| `iZiDatePicker.autoInit(root)` | pickers for every `[data-izi]` element |
| `iZiDatePicker.getInstance(el)` | find the picker of an element |
| `iZiDatePicker.registerLocale(name, strings)` | add or extend a language |
| `iZiDatePicker.converter` | `toGregorian(jy,jm,jd)`, `toJalali(gy,gm,gd)`, `isLeap(jy)`, `monthLength(jy,jm)`... |
| `iZiDatePicker.gregorian` | `isLeap`, `monthLength`, `toJDN`, `fromJDN`, `dayOfWeek`, `isValid` |

## Events

| Event | Payload |
|---|---|
| `open` / `close` | `{}` / `{ reason }` (`'select'` `'escape'` `'outside'` `'api'`...) |
| `select` | `{ value, formatted, end? }` (`end` for booking slots; `values` in `multiple`) |
| `rangeSelect` | `{ start, end, formatted, compare? }` |
| `change` | the `select` or `rangeSelect` payload |
| `clear` | `{}` |
| `changeMonth` / `changeYear` | `{ year, month }` / `{ year }` |
| `beforeSelect` | cancelable: return `false` from the listener |
| `holidaysLoaded` / `holidaysError` | `{ year, source? }` / `{ year, error }` |
| `invalidInput` | `{ text }` |
| `update` | the whole calendar state (every re-render) |
| `destroy` | `{}` |

## The date object

```js
{ year: 1405, month: 3, day: 7, hour: 0, minute: 0, second: 0,
  jy: 1405, jm: 3, jd: 7 }          // jy/jm/jd are the same numbers (old names)
```
Both calendars use the same fields: in a Gregorian picker `year` is the Gregorian year.

Next: [FAQ & troubleshooting →](10-faq.md)
