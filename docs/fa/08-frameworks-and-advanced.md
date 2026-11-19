<div dir="rtl">

# ۸. فریم‌ورک‌ها و موارد پیشرفته

[فهرست مستندات](../README.md) · [English](../en/08-frameworks-and-advanced.md) · **فارسی** · [→ ظاهر، تم و موبایل](07-styling-and-themes.md) · بعدی: [مرجع API ←](09-api-reference.md)

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
      value={text}                                   // متن کنترل‌شده
      onChange={(text, payload) => setText(text)}    // payload: { value | start,end, formatted, ... }
      options={{ mode: 'range', presets: 'default' }}
      placeholder="یک بازه انتخاب کنید"
    />
  );
}
```

گزینه‌های تابعی (`renderDay`، `isDateDisabled` و ...) را در `callbacks` بگذارید تا هیچ‌وقت باعث ساخت دوبارهٔ تقویم نشوند. خودِ picker را با `pickerRef={ref}` بگیرید.

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
رویدادهای `open` و `close` را هم می‌فرستد.

## HTML ساده / هر فریم‌ورک: عنصر `<izi-datepicker>`

```html
<script type="module">
  import { defineIziDatePicker } from 'izi-datepicker/element';
  defineIziDatePicker();
</script>

<form>
  <izi-datepicker name="from" mode="range" presets calendar="gregorian" locale="en" months="2"></izi-datepicker>
</form>
```

یک `<input name="from">` معمولی می‌سازد (پس فرم‌ها بدون دردسر کار می‌کنند). صفت‌ها: `mode locale calendar date-order months theme format placeholder size time-format first-day-of-week min-date max-date time-zone output-calendar input-digits year-picker presets value name disabled required` و پرچم‌های `inline time-picker show-seconds show-week-numbers disable-past disable-future close-on-select`. هر چیز دیگر را در ویژگی `options` بدهید:

```js
const el = document.querySelector('izi-datepicker');
el.options = { holidays: { sources: [{ type: 'url', url: '/h/{year}.json' }] } };
el.addEventListener('change', e => console.log(e.detail.formatted));
el.value;      // متن   ·   el.picker   // نمونهٔ iZiDatePicker
```

## رندر سمت سرور (Next.js، Nuxt ...)

بسته روی سرور بدون مشکل import می‌شود. تقویم‌ها را فقط در مرورگر بسازید (`useEffect`، `onMounted` یا یک کامپوننت فقط-کلاینت).

## بدون رابط (Headless): UI خودتان

ظاهر کاملاً متفاوت می‌خواهید؟ **وضعیت** تقویم را بگیرید و خودتان رندر کنید:

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

`getState()` همچنین `calendars` (یک مورد برای هر ماهِ نمایان)، `canPrev`، `canNext`، `selection`، `value`، `holidayList`، `slots`، `compare` و ... را می‌دهد. نوع `CalendarState` را در `izi-datepicker.d.ts` ببینید.

## چند تقویم، پیدا کردن و حذفشان

<!-- test -->
```js
const a = new iZiDatePicker('#date');
iZiDatePicker.getInstance('#date') === a;      // true
iZiDatePicker.init('input.date', { mode: 'range' });   // many at once
a.destroy();                                   // removes the popup and every listener
```

## TypeScript

تایپ‌ها همراه بسته‌اند؛ بستهٔ `@types` لازم نیست:

```ts
import iZiDatePicker, { iZiOptions, RangePayload } from 'izi-datepicker';

const options: iZiOptions = { mode: 'range', months: 2, compare: true };
const picker = new iZiDatePicker('#range', options);
picker.on('rangeSelect', (e: RangePayload) => e.compare?.start.year);
```

## عادت‌های خوب

* **یک جا برای گزینه‌ها.** شیء گزینه‌ها را یک‌بار بسازید و دوباره استفاده کنید.
* تقویمی را که از صفحه برمی‌دارید **destroy** کنید (فریم‌ورک‌ها خودشان این کار را می‌کنند).
* برای تغییر تنظیمات بعداً از `setOptions({...})` استفاده کنید؛ عوض کردنِ `calendar` مقدار را پاک می‌کند چون همان عددها در دو تقویم معنی متفاوتی دارند.
* اگر صفحه عمومی است، رمز و توکن را در headersِ `holidays.sources` نگذارید.

بعدی: [مرجع API ←](09-api-reference.md)

</div>
