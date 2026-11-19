# 10. FAQ & troubleshooting

[Docs home](../README.md) · **English** · [فارسی](../fa/10-faq.md) · [← API reference](09-api-reference.md)

**The calendar does not appear when I click.**
Check the browser console. The two usual causes: the CSS file is missing (the popup is there but unstyled and hidden at the page bottom), or the script runs before the `<input>` exists - put the `<script>` after the input or run it on `DOMContentLoaded`.

**It appears behind my modal / dialog.**
Raise `zIndex`, or put the popup inside the modal with `appendTo: '#my-modal'`. Inside transformed containers add `strategy: 'absolute'`.

**The on-screen keyboard covers the calendar on my phone.**
That should not happen - on phones the picker opens as a bottom sheet and keeps the keyboard closed (`suppressKeyboard: 'auto'`). If you disabled the sheet, set `suppressKeyboard: true`.

**How do I get a real Gregorian date for my server?**
`picker.getValue('iso')` gives `2026-05-28` whatever calendar the user sees. For ranges: `picker.getRange()` then format each side, or `getValue('iso')` on a range returns `{ start, end }`.

**Why is the text in the box in Western digits?**
So servers, validators and spreadsheets can read it. Change it with `inputDigits: 'fa'`.

**Holidays do not show up.**
* Out of the box you only get the fixed solar holidays and Fridays. Religious (lunar) days need data - see [guide 4](04-holidays.md).
* A year loads when the user looks at it. Listen to `holidaysLoaded` / `holidaysError`.
* With `holidays: false` they are off. With `highlightHolidays: false` they are not coloured.
* Gregorian pickers have no built-in holidays at all.

**My Gregorian calendar shows English buttons ("Today", "Clear").**
Load the language pack (`izi-datepicker.locales.js` or `import 'izi-datepicker/locales'`), or add your own words with `iZiDatePicker.registerLocale`.

**Can I use dates before 1300 or after 1500 (Jalali)?**
You can raise `minYear` / `maxYear`, but only 1300-1500 is verified against reference implementations. Different libraries disagree on a few years outside it.

**`setValue` returns `false`.**
The value could not be understood or is not allowed (before `minDate`, a blocked day, outside the years, a range that breaks `minRangeDays`...). Turn on `onInvalidInput` to see typed text that failed.

**I changed `calendar` with `setOptions` and the value disappeared.**
Yes, on purpose: the same numbers mean different dates in the two calendars. Set the value again after changing the calendar.

**The page has two pickers and clicking one closes the other.**
That is the intended behaviour: only one popup is open at a time.

**How do I run it in React / Vue / Angular / Svelte?**
React and Vue have wrappers ([guide 8](08-frameworks-and-advanced.md)). Everywhere else use the `<izi-datepicker>` element, or create the picker in the framework's "mounted" hook and call `destroy()` when the component goes away.

**Which browsers work?**
Current Chrome/Edge, Firefox and Safari should work (it needs `Intl.DateTimeFormat`, CSS logical properties and `color-mix()`). It has been tested for real in **Chromium**; Firefox, Safari and real screen readers have not been tested yet - bug reports are very welcome.

**How big is it?**
About 37 KB of JavaScript and 8 KB of CSS, gzipped, with everything included.

**I found a bug / I want a feature.**
Open an [issue](https://github.com/yasproject/iZiDatePicker/issues/new/choose) - include your options and browser. Pull requests are welcome: see [CONTRIBUTING](../../CONTRIBUTING.md).
