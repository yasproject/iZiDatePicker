/**
 * Vue 3 wrapper (render function, no SFC compiler needed).
 *
 *   import { IziDatePickerInput } from 'izi-datepicker/vue';
 *   <IziDatePickerInput v-model="text" :options="{ mode: 'range' }" @change="onChange" />
 */
import { defineComponent, h, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import iZiDatePicker from '../izi-datepicker.mjs';

export const IziDatePickerInput = defineComponent({
  name: 'IziDatePickerInput',
  inheritAttrs: false,
  props: { modelValue: { type: [String, Object, Array, Date], default: undefined }, options: { type: Object, default: () => ({}) } },
  emits: ['update:modelValue', 'change', 'open', 'close'],
  setup(props, { emit, attrs, expose }) {
    const el = ref(null);
    let picker = null;
    onMounted(() => {
      picker = new iZiDatePicker(el.value, {
        ...props.options,
        ...(props.modelValue ? { value: props.modelValue } : {}),
        onChange: p => { emit('update:modelValue', p.formatted); emit('change', p); },
        onOpen: () => emit('open'),
        onClose: r => emit('close', r)
      });
    });
    onBeforeUnmount(() => { if (picker) picker.destroy(); picker = null; });
    watch(() => props.options, o => picker && picker.setOptions(o || {}), { deep: true });
    watch(() => props.modelValue, v => {
      if (!picker || !el.value) return;
      if (v === undefined || v === '' || v === null) { if (el.value.value !== '') picker.clear({ silent: true }); }
      else if (String(v) !== el.value.value) picker.setValue(v, { silent: true });
    });
    expose({ get picker() { return picker; } });
    return () => h('input', { type: 'text', autocomplete: 'off', ...attrs, ref: el });
  }
});
export default IziDatePickerInput;
