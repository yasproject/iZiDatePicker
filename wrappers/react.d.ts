import type * as React from 'react';
import type iZiDatePicker from '../izi-datepicker';
import type { iZiOptions, SelectPayload, RangePayload } from '../izi-datepicker';

export interface IziDatePickerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  /** Controlled, formatted text (what the input shows). */
  value?: string;
  defaultValue?: string;
  onChange?: (text: string, payload: SelectPayload | RangePayload) => void;
  onOpen?: () => void;
  onClose?: (reason: string) => void;
  options?: iZiOptions;
  /** Function options (renderDay, isDateDisabled, ...) that must not be JSON-compared. */
  callbacks?: Partial<iZiOptions>;
  pickerRef?: { current: iZiDatePicker | null };
}
export const IziDatePickerInput: React.ForwardRefExoticComponent<IziDatePickerInputProps & React.RefAttributes<HTMLInputElement>>;
export default IziDatePickerInput;
