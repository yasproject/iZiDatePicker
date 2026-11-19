/**
 * <izi-datepicker> custom element (light DOM, so the page's CSS and normal <form> submission just work).
 *
 *   <izi-datepicker name="from" value="1405/03/07" mode="single" locale="fa" theme="auto"
 *                      min-date="1405/01/01" placeholder="..."></izi-datepicker>
 *   <izi-datepicker calendar="gregorian" locale="de" months="2" mode="range"></izi-datepicker>
 *   el.value / el.picker / el.options = { ... }     events: "change" (detail = picker payload)
 */
import iZiDatePicker from '../izi-datepicker.mjs';

const STR = ['mode', 'locale', 'theme', 'format', 'placeholder', 'size', 'time-format', 'first-day-of-week', 'min-date', 'max-date', 'time-zone', 'output-calendar', 'input-digits', 'year-picker', 'presets', 'calendar', 'date-order', 'months'];
const BOOL = ['inline', 'time-picker', 'show-seconds', 'show-week-numbers', 'disable-past', 'disable-future', 'close-on-select'];
const camel = k => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// importable on the server (SSR): there is no HTMLElement in Node, so extend a harmless stand-in there
const Base = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};
export class IziDatePickerElement extends Base {
  static get observedAttributes() { return [...STR, ...BOOL, 'value', 'name', 'disabled', 'required']; }
  constructor() { super(); this._opts = {}; this._picker = null; this.input = null; }
  connectedCallback() {
    if (this._picker) return;
    this.input = this.querySelector('input') || this.appendChild(document.createElement('input'));
    this.input.type = 'text';
    this._sync();
    this._build();
  }
  disconnectedCallback() { if (this._picker) { this._picker.destroy(); this._picker = null; } }
  attributeChangedCallback() { if (this._picker) { this._sync(); this._picker.setOptions(this._fromAttrs()); } else if (this.input) this._sync(); }
  _sync() {
    for (const a of ['name', 'required', 'placeholder']) this.hasAttribute(a) ? this.input.setAttribute(a, this.getAttribute(a)) : this.input.removeAttribute(a);
    this.input.disabled = this.hasAttribute('disabled');
  }
  _fromAttrs() {
    const o = {};
    for (const a of STR) if (this.hasAttribute(a)) { const v = this.getAttribute(a); o[camel(a)] = a === 'presets' && v === '' ? 'default' : v; }
    for (const a of BOOL) if (this.hasAttribute(a)) o[camel(a)] = this.getAttribute(a) !== 'false';
    return { ...o, ...this._opts };
  }
  _build() {
    const opts = this._fromAttrs();
    if (this.hasAttribute('value')) opts.value = this.getAttribute('value');
    const fire = p => this.dispatchEvent(new CustomEvent('change', { detail: p, bubbles: true }));
    this._picker = new iZiDatePicker(this.input, { ...opts, onChange: p => fire(p), onClear: () => {} });
    this._picker.on('open', () => this.dispatchEvent(new CustomEvent('open', { bubbles: true })));
    this._picker.on('close', e => this.dispatchEvent(new CustomEvent('close', { detail: e, bubbles: true })));
  }
  get picker() { return this._picker; }
  get value() { return this.input ? this.input.value : this.getAttribute('value') || ''; }
  set value(v) { if (this._picker) this._picker.setValue(v, { silent: true }); else this.setAttribute('value', v); }
  /** Full options object (merged over attributes). */
  get options() { return this._opts; }
  set options(o) { this._opts = o || {}; if (this._picker) this._picker.setOptions(this._fromAttrs()); }
}
export function defineIziDatePicker(tag = 'izi-datepicker') { if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, IziDatePickerElement); return IziDatePickerElement; }
export default IziDatePickerElement;
