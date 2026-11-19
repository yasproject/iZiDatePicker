import type { DefineComponent } from 'vue';
import type { iZiOptions } from '../izi-datepicker';

/** <IziDatePickerInput v-model="text" :options="{ mode: 'range' }" @change="..." /> */
export const IziDatePickerInput: DefineComponent<{ modelValue?: string | object | unknown[] | Date; options?: iZiOptions }>;
export default IziDatePickerInput;
