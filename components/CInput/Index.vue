<template>
  <div class="c-input">
    <div class="input-label" v-if="label">{{ label }} <span v-if="valid">*</span></div>
    <div class="input-body">
      <div
        class="input-main"
        :class="{
          'main-focus': isFocus,
          disabled: disabled,
          error: showMessage,
        }"
        @click="setFocus"
        tabindex="1"
      >
        <div class="input-prepend">
          <slot name="prepend"></slot>
        </div>
        <input
          ref="input_ref"
          :type="inputType"
          :value="modelValue"
          @input="handleChange"
          @focus="focusInput"
          @blur="blurInput"
          :disabled="disabled"
          :placeholder="placeholder"
          :data-maska="dataMaska"
          :readonly="readonlyProp"
          v-maska
        />
        <div tabindex="1" class="input-append">
          <div
            v-if="showClose && modelValue && !disabled"
            class="append-icon"
            @click.stop="clearValue"
          >
            <NuxtImg src="/icons/clear.svg" />
          </div>
          <div
            v-if="type === 'password' && inputType"
            class="append-icon"
            style="margin-left: 8px"
            @click.stop="changeInputType"
          >
            <NuxtImg v-if="inputType === 'password'" src="/icons/eye.svg" />
            <NuxtImg v-if="inputType === 'text'" src="/icons/eye_off.svg" />
          </div>
          <slot name="append"></slot>
        </div>
      </div>
      <div v-if="errorShow" class="input-text">
        <Transition name="message-slide">
          <span class="error-text" v-if="showMessage && errorShow">{{ errorMessage }}</span>
        </Transition>
      </div>
      <div v-if="hint" class="input-hint">
        <Transition name="message-slide">
          <span class="hint-text" v-if="!(showMessage && errorShow)">{{ hint }}</span>
        </Transition>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";

type Props = {
  modelValue: string | number | null;
  valid?: boolean;
  placeholder?: string;
  name?: string;
  label?: string;
  type?: string;
  hint?: string;
  disabled?: boolean;
  errorShow?: boolean;
  errorMessage?: string;
  showClose?: boolean;
  readonlyProp?: boolean;
  rules?(value?: string): boolean;
  dataMaska?: string;
  trimValue?: boolean;
  maskaValue?: string;
  small?: boolean;
  noBlurSelectors?: string[];
};
const props = withDefaults(defineProps<Props>(), {
  valid: true,
  type: "text",
  errorMessage: () => useI18n().t("input.error_message"),
  errorShow: true,
  disabled: false,
  showClose: true,
  readonlyProp: false,
  placeholder: "",
  name: "",
  trimValue: true,
  dataMaska: "",
  maskaValue: "",
});
const emits = defineEmits<{
  "update:modelValue": [string | number | null];
  focus: [];
  clear: [];
  blur: [];
}>();
const input_ref = ref<HTMLInputElement>();
const isFocus = ref(false);
const showMessage = ref(false);
const inputType = ref("");
function handleChange(e: Event) {
  const target = e.target as HTMLInputElement;
  emits(
    "update:modelValue",
    props.trimValue ? target.value.trim() : target.value,
  );
  showMessage.value = false;
}
function clearValue() {
  emits("update:modelValue", null);
  emits("clear");
  showMessage.value = false;
}
function setFocus() {
  if (input_ref.value) input_ref.value.focus();
  showMessage.value = false;
}
function focusInput() {
  isFocus.value = true;
  showMessage.value = false;
  emits("focus");
}
function blurInput(event: FocusEvent) {
  if (isBlurProhibited(event)) {
    setFocus();
    return;
  }
  checkValid();
  isFocus.value = false;
  emits("blur");
}
function isBlurProhibited(event: FocusEvent) {
  return (
    isTheSameParentInput(event) &&
    [".input-main", ...(props.noBlurSelectors || [])]?.some((selector) =>
      (event.relatedTarget as HTMLElement).closest(selector),
    )
  );
}
function isTheSameParentInput(event: FocusEvent) {
  return (
    event.relatedTarget &&
    (event.relatedTarget as HTMLElement).closest(".input-main") ===
      (event.target as HTMLElement).closest(".input-main")
  );
}
function changeInputType() {
  if (inputType.value === "password") inputType.value = "text";
  else inputType.value = "password";
}
function checkValid() {
  if (props.rules && props.valid) {
    showMessage.value = !props.rules();
    return props.rules();
  }
  if (!props.rules && props.valid) {
    if (input_ref.value?.value) {
      showMessage.value = false;
      return true;
    }
    showMessage.value = true;
    return false;
  }
  showMessage.value = false;
  return true;
}
if (props.type) inputType.value = props.type;
watch(
  () => props.modelValue,
  () => {
    showMessage.value = false;
  },
);
onMounted(() => {
  if (input_ref.value) input_ref.value.onsubmit = checkValid;
});
</script>
<style lang="scss" scoped>
input[type="file"] {
}
.c-input {
  width: 100%;
  .input-label {
    font-size: 16px;
    font-weight: 400;
    color: var(--color-primary-on-text);
    margin-bottom: 8px;
    user-select: none;
    span {
      color: var(--app-red-500);
    }
  }
  .input-main {
    height: 40px;
    width: 100%;
    border: 2px solid var(--color-primary-on-outline);
    overflow-x: hidden;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: border-color 0.2s ease;
    input {
      background: transparent;
      border: none;
      outline: none;
      padding: 0;
      width: 100%;
      height: 100%;
      font-size: 16px;
      font-weight: 400;
      line-height: 150%;
      color: var(--color-primary-on-text);
    }
    input::placeholder {
      color: var(--color-primary-on-bg);
    }
  }
  .main-focus {
  }
  .disabled {
    background: #00426912;
    border-color: #00426900;
    input {
      color: #00203342;
    }
  }
  .input-main:hover:not(.disabled):not(.error) {
    border-color: var(--color-primary-on-hover);
  }
  .error {
    border-color: var(--app-red-500);
  }

  .input-text {
    padding: 4px 0px;
    font-size: 12px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    .error-text {
      color: var(--app-red-500);
    }
  }
  .input-hint {
    min-height: 46px;
    position: relative;
    top: -12px;
    .hint-text {
      color: var(--app-grey-350);
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
    }
  }
  .input-append {
    user-select: none;
    display: flex;
    align-items: center;
    margin-left: 8px;
    .append-icon {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      img {
        cursor: pointer;
        width: 24px;
        height: 24px;
        // filter: var(--app-filter-grey-light);
      }
    }
  }
}

.message-slide-enter-active {
  transition: all 0.2s ease-out;
}

.message-slide-leave-active {
  transition: all 0.2s;
}

.message-slide-enter-from,
.message-slide-leave-to {
  transform: translateY(-5px);
  opacity: 0;
}
</style>
