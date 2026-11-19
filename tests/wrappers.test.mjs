// node tests/wrappers.test.mjs   (needs: jsdom react react-dom vue)
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { pretendToBeVisual: true, url: 'http://localhost/' });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'customElements', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'Node', 'Element', 'HTMLInputElement', 'HTMLIFrameElement', 'getComputedStyle', 'FormData', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'AbortController', 'SVGElement', 'Text', 'Comment', 'DocumentFragment', 'ShadowRoot']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? dom.window : dom.window[k], configurable: true, writable: true }); } catch (e) { /* node already has it */ }
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} -> got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const tick = () => new Promise(r => setTimeout(r, 0));
const popups = () => document.querySelectorAll('.izi-container').length;

console.log('# <izi-datepicker> custom element');
const { defineIziDatePicker } = await import('../wrappers/element.mjs');
defineIziDatePicker();
document.body.innerHTML = '<form id="f"><izi-datepicker name="d" value="1405/03/07" locale="fa" placeholder="تاریخ"></izi-datepicker></form>';
const el = document.querySelector('izi-datepicker');
ok(el.picker && el.input, 'picker created on connect');
eq([el.input.name, el.input.getAttribute('placeholder'), el.value], ['d', 'تاریخ', '1405/03/07'], 'attributes mapped to the inner input');
eq(new FormData(document.getElementById('f')).get('d'), '1405/03/07', 'native form submission carries the value (Latin digits)');
let got = null; el.addEventListener('change', e => { got = e.detail; });
el.picker.setValue('1405/04/01'); eq(got && got.formatted, '1405/04/01', 'change event with detail');
el.setAttribute('locale', 'en'); eq(el.picker.loc.dir, 'ltr', 'attribute change re-configures the picker');
el.options = { showWeekNumbers: true }; ok(el.picker.o.showWeekNumbers === true, 'options property merges over attributes');
el.setAttribute('mode', 'range'); eq(el.picker.o.mode, 'range', 'mode attribute');
el.picker.open(); ok(popups() === 1, 'popup created'); el.remove(); eq(popups(), 0, 'disconnect destroys the picker and its popup'); ok(el.picker === null, 'picker released');
document.body.innerHTML = '<izi-datepicker time-picker presets inline></izi-datepicker>'; const e2 = document.querySelector('izi-datepicker'); ok(e2.picker.o.timePicker && e2.picker.o.inline && e2.picker.o.presets === 'default', 'boolean attributes + bare "presets"'); e2.remove();
document.body.innerHTML = '<izi-datepicker calendar="gregorian" locale="de" date-order="mdy" months="2" mode="range" inline></izi-datepicker>'; const e3 = document.querySelector('izi-datepicker');
ok(e3.picker.o.calendar === 'gregorian' && e3.picker.o.locale === 'de' && e3.picker.o.dateOrder === 'mdy' && e3.picker.c.months === 2, 'calendar / date-order / months attributes (Gregorian from plain HTML)'); eq(e3.picker.loc.months[2], 'März', 'German month names via Intl'); e3.remove();

console.log('# React');
const React = (await import('react')).default; const { act } = await import('react'); const { createRoot } = await import('react-dom/client');
const { IziDatePickerInput } = await import('../wrappers/react.mjs');
document.body.innerHTML = '<div id="root"></div>'; let root = createRoot(document.getElementById('root')); let texts = [], pref = { current: null };
const App = ({ v }) => React.createElement(IziDatePickerInput, { value: v, onChange: t => texts.push(t), pickerRef: pref, options: { mode: 'single' }, name: 'r' });
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App, { v: '1405/03/07' }))));
const inp = () => document.querySelector('input[name="r"]');
eq(inp().value, '1405/03/07', 'controlled initial value (StrictMode)'); ok(pref.current && !pref.current.destroyed, 'picker alive after StrictMode double-effect');
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App, { v: '1405/05/09' })))); eq(inp().value, '1405/05/09', 'value prop change updates the input');
eq(pref.current.getValue('jalali'), '1405/05/09', '... and the picker state');
await act(async () => { pref.current.setValue('1405/06/10'); }); eq(texts.at(-1), '1405/06/10', 'onChange(text) fired from picker commit');
await act(async () => { pref.current.open(); }); eq(popups(), 1, 'exactly one popup (no StrictMode duplicate)');
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App, { v: '' })))); eq(inp().value, '', 'empty value clears');
await act(async () => root.unmount()); eq(popups(), 0, 'unmount destroys picker and popup');

console.log('# Vue 3');
const Vue = await import('vue'); const { IziDatePickerInput: VInput } = await import('../wrappers/vue.mjs');
document.body.innerHTML = '<div id="vroot"></div>'; const model = Vue.ref('1405/03/07'); let changes = 0; let vpicker;
const app = Vue.createApp({ setup() { const r = Vue.ref(null); Vue.onMounted(() => { vpicker = r.value.picker; }); return () => Vue.h(VInput, { ref: r, modelValue: model.value, 'onUpdate:modelValue': v => { model.value = v; }, onChange: () => changes++, options: { mode: 'single' }, name: 'v' }); } });
app.mount('#vroot'); await Vue.nextTick();
const vin = () => document.querySelector('input[name="v"]');
eq(vin().value, '1405/03/07', 'v-model initial'); model.value = '1405/08/01'; await Vue.nextTick(); eq(vin().value, '1405/08/01', 'model -> input'); eq(vpicker.getValue('jalali'), '1405/08/01', '... and picker');
vpicker.setValue('1405/09/09'); await Vue.nextTick(); eq([model.value, changes], ['1405/09/09', 1], 'picker -> v-model (update:modelValue) + change');
model.value = ''; await Vue.nextTick(); eq(vin().value, '', 'empty model clears'); vpicker.open(); eq(popups(), 1, 'popup'); app.unmount(); eq(popups(), 0, 'unmount destroys');

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
