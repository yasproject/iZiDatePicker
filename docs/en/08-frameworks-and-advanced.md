# 8. Frameworks & advanced use

[Docs home](../README.md) · **English** · [فارسی](../fa/08-frameworks-and-advanced.md) · [← Styling & themes](07-styling-and-themes.md) · Next: [API reference →](09-api-reference.md)

## React

```bash
npm install izi-datepicker
```
```jsx
import { useState } from 'react';
import { IziDatePickerInput } from 'izi-datepicker/react';
import 'izi-datepicker/css';

export default function Form() {
  const [text, setText] = useState('');
  return (
    <IziDatePickerInput
      value={text}                                   // controlled text
      onChange={(text, payload) => setText(text)}    // payload: { value | start,end, formatted, ... }
      options={{ mode: 'range', presets: 'default' }}
      placeholder="Pick a range"
    />
  );
}
```

Function options (`renderDay`, `isDateDisabled`, ...) go in `callbacks` so they never cause re-creation. Get the picker with `pickerRef={ref}`.

## Vue 3

```vue
<script setup>
import { ref } from 'vue';
import { IziDatePickerInput } from 'izi-datepicker/vue';
import 'izi-datepicker/css';
const text = ref('');
</script>

<template>
  <IziDatePickerInput v-model="text" :options="{ mode: 'range' }" @change="p => console.log(p)" />
</template>
```
It also emits `open` and `close`.

## Plain HTML / any framework: the `<izi-datepicker>` element

```html
<script type="module">
  import { defineIziDatePicker } from 'izi-datepicker/element';
  defineIziDatePicker();
</script>

<form>
  <izi-datepicker name="from" mode="range" presets calendar="gregorian" locale="en" months="2"></izi-datepicker>
</form>
```

It renders a normal `<input name="from">` (so forms just work). Attributes: `mode locale calendar date-order months theme format placeholder size time-format first-day-of-week min-date max-date time-zone output-calendar input-digits year-picker presets value name disabled required` and the flags `inline time-picker show-seconds show-week-numbers disable-past disable-future close-on-select`. Anything else goes in the `options` property:

```js
const el = document.querySelector('izi-datepicker');
el.options = { holidays: { sources: [{ type: 'url', url: '/h/{year}.json' }] } };
el.addEventListener('change', e => console.log(e.detail.formatted));
el.value;      // the text   ·   el.picker   // the iZiDatePicker instance
```

## Server-side rendering (Next.js, Nuxt...)

The package imports safely on the server. Create pickers only in the browser (`useEffect`, `onMounted`, or a client-only component).

## Headless: your own UI

Want a completely different look? Ask for the calendar **state** and render it yourself:

<!-- test -->
```js
const cal = iZiDatePicker.create({ calendar: 'gregorian', locale: 'en', mode: 'range' });
cal.goTo(2026, 5);                               // the view starts at today's month; jump to May 2026
const state = cal.getState();
console.log(state.view.title);                   // "May 2026"
console.log(state.weekdays.map(w => w.short));   // ["S","M","T",...]
console.log(state.weeks[0][0]);                  // a day: { text, year, month, day, selected, inRange, holiday, disabled, outside, ... }
cal.next();                                      // go to the next month
cal.select(20260528);                            // YYYYMMDD number (or a date object)
cal.on('update', s => console.log('state changed', s.view.title));   // re-render here
```

`getState()` also gives `calendars` (one entry per displayed month), `canPrev`, `canNext`, `selection`, `value`, `holidayList`, `slots`, `compare`... See the type `CalendarState` in `izi-datepicker.d.ts`.

## Many pickers, finding and removing them

<!-- test -->
```js
const a = new iZiDatePicker('#date');
iZiDatePicker.getInstance('#date') === a;      // true
iZiDatePicker.init('input.date', { mode: 'range' });   // many at once
a.destroy();                                   // removes the popup and every listener
```

## TypeScript

Types are included - no `@types` package needed:

```ts
import iZiDatePicker, { iZiOptions, RangePayload } from 'izi-datepicker';

const options: iZiOptions = { mode: 'range', months: 2, compare: true };
const picker = new iZiDatePicker('#range', options);
picker.on('rangeSelect', (e: RangePayload) => e.compare?.start.year);
```

## Good habits

* **One place for options.** Build an options object once and reuse it.
* **Destroy** pickers you remove from the page (frameworks do it for you).
* Use `setOptions({...})` to change settings later; changing `calendar` clears the value because the dates mean different things.
* Do not put secrets in `holidays.sources` headers if the page is public.

Next: [API reference →](09-api-reference.md)
