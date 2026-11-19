import type iZiDatePicker from '../izi-datepicker';
import type { iZiOptions } from '../izi-datepicker';

/** <izi-datepicker name="d" mode="range" locale="en"></izi-datepicker> */
export class IziDatePickerElement extends HTMLElement {
  readonly picker: iZiDatePicker | null;
  readonly input: HTMLInputElement | null;
  value: string;
  options: iZiOptions;
}
export function defineIziDatePicker(tag?: string): typeof IziDatePickerElement;
export default IziDatePickerElement;
