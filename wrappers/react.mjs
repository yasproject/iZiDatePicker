/**
 * React wrapper (no JSX, no build step). Works with React 17-19, StrictMode safe.
 *
 *   import { IziDatePickerInput } from 'izi-datepicker/react';
 *   <IziDatePickerInput value={v} onChange={(text, payload) => setV(text)} options={{ mode: 'range', presets: 'default' }} />
 *
 * `value` is a controlled string (the formatted text). `options` is shallow-compared by JSON, so inline objects are fine
 * as long as they are serialisable; pass `callbacks` separately for functions.
 */
import React from 'react';
import iZiDatePicker from '../izi-datepicker.mjs';

export const IziDatePickerInput = React.forwardRef(function IziDatePickerInput({ value, defaultValue, onChange, onOpen, onClose, options, callbacks, pickerRef, ...inputProps }, ref) {
  const inputRef = React.useRef(null);
  const instance = React.useRef(null);
  const latest = React.useRef({});
  latest.current = { onChange, onOpen, onClose, callbacks };
  const optKey = JSON.stringify(options || {});

  React.useImperativeHandle(ref, () => inputRef.current, []);

  React.useEffect(() => {
    const p = new iZiDatePicker(inputRef.current, {
      ...(options || {}), ...((latest.current.callbacks) || {}),
      ...(value != null && value !== '' ? { value } : {}),
      onChange: payload => { const l = latest.current; if (l.onChange) l.onChange(payload.formatted, payload); },
      onOpen: () => latest.current.onOpen && latest.current.onOpen(),
      onClose: reason => latest.current.onClose && latest.current.onClose(reason)
    });
    instance.current = p;
    if (pickerRef) pickerRef.current = p;
    return () => { p.destroy(); instance.current = null; if (pickerRef) pickerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { if (instance.current) instance.current.setOptions(options || {}); }, [optKey]);

  React.useEffect(() => {
    const p = instance.current;
    if (!p || value === undefined) return;
    const cur = inputRef.current.value;
    if (String(value) !== cur) { if (value === '' || value == null) p.clear({ silent: true }); else p.setValue(value, { silent: true }); }
  }, [value]);

  return React.createElement('input', { type: 'text', autoComplete: 'off', defaultValue: value === undefined ? defaultValue : undefined, ...inputProps, ref: inputRef });
});
export default IziDatePickerInput;
