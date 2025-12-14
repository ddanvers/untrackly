<template>
  <div class="c-input">
    <div v-if="label" class="input-label">{{ label }}</div>
    <div class="input-body">
      <div class="input-main" :class="inputMainClasses" tabindex="1" @click="setFocus">
        <div class="input-prepend">
          <slot name="prepend" />
        </div>
        <input
          v-if="!isTextarea"
          ref="inputRef"
          v-maska
          class="main-input"
          v-bind="sharedInputAttrs"
        />
        <textarea
          v-else
          ref="inputRef"
          v-maska
          class="main-input main-textarea"
          :rows="rows"
          v-bind="sharedInputAttrs"
          @input="resizeTextarea"
        />
        <div tabindex="1" class="input-append">
          <div v-if="showClearButton" class="append-icon" @click.stop="clearValue">
            <NuxtImg src="/icons/close.svg" />
          </div>
          <div
            v-if="showPasswordToggle"
            class="append-icon append-icon--spaced"
            @click.stop="togglePasswordVisibility"
          >
            <NuxtImg :src="passwordToggleIcon" />
          </div>
          <slot name="append" />
        </div>
      </div>
      <div v-if="errorShow" class="input-text">
        <Transition name="message-slide">
          <span v-if="isErrorVisible" class="error-text">{{ errorMessage }}</span>
        </Transition>
      </div>
      <div v-if="hint" class="input-hint">
        <Transition name="message-slide">
          <span v-if="!isErrorVisible" class="hint-text">{{ hint }}</span>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type InputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url"
  | "textarea";

interface Props {
  modelValue: string | number | null;
  valid?: boolean;
  placeholder?: string;
  name?: string;
  label?: string;
  type?: InputType | string;
  hint?: string;
  disabled?: boolean;
  errorShow?: boolean;
  errorMessage?: string;
  showClose?: boolean;
  readonlyProp?: boolean;
  rules?: (value?: string) => boolean;
  dataMaska?: string;
  trimValue?: boolean;
  maskaValue?: string;
  small?: boolean;
  noBlurSelectors?: string[];
  rows?: number;
}

interface Emits {
  "update:modelValue": [value: string | number | null];
  focus: [];
  clear: [];
  blur: [];
}

const INPUT_TYPE = {
  PASSWORD: "password",
  TEXT: "text",
  TEXTAREA: "textarea",
} as const;

const INPUT_MAIN_SELECTOR = ".input-main";

const props = withDefaults(defineProps<Props>(), {
  valid: false,
  type: "text",
  errorMessage: "Ошибка валидации данных",
  errorShow: false,
  disabled: false,
  showClose: true,
  readonlyProp: false,
  placeholder: "",
  name: "",
  trimValue: true,
  dataMaska: "",
  maskaValue: "",
  rows: 1,
});

const emit = defineEmits<Emits>();

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>();
const isFocus = ref(false);
const showMessage = ref(false);
const currentInputType = ref<string>(props.type || INPUT_TYPE.TEXT);

const isTextarea = computed(() => props.type === INPUT_TYPE.TEXTAREA);
const isErrorVisible = computed(() => showMessage.value && props.errorShow);

const showClearButton = computed(
  () =>
    props.showClose &&
    props.modelValue &&
    !props.disabled &&
    !props.readonlyProp,
);
const showPasswordToggle = computed(
  () => props.type === INPUT_TYPE.PASSWORD && Boolean(currentInputType.value),
);

const passwordToggleIcon = computed(() =>
  currentInputType.value === INPUT_TYPE.PASSWORD
    ? "/icons/eye.svg"
    : "/icons/eye_off.svg",
);
const inputMainClasses = computed(() => ({
  "main-focus": isFocus.value,
  "input-main--textarea": isTextarea.value,
  disabled: props.disabled,
  error: showMessage.value,
}));

const sharedInputAttrs = computed(() => ({
  type: currentInputType.value,
  value: props.modelValue,
  disabled: props.disabled,
  placeholder: props.placeholder,
  "data-maska": props.dataMaska,
  readonly: props.readonlyProp,
  onInput: handleChange,
  onFocus: handleFocus,
  onBlur: handleBlur,
}));

function hideErrorMessage(): void {
  showMessage.value = false;
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const value = props.trimValue ? target.value.trim() : target.value;
  emit("update:modelValue", value);
  hideErrorMessage();
}

function clearValue(): void {
  emit("update:modelValue", null);
  emit("clear");
  hideErrorMessage();
}

function setFocus(): void {
  inputRef.value?.focus();
  hideErrorMessage();
}

function handleFocus(): void {
  isFocus.value = true;
  hideErrorMessage();
  emit("focus");
}

function isBlurProhibited(event: FocusEvent): boolean {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (!relatedTarget) return false;

  const currentInputMain = (event.target as HTMLElement).closest(
    INPUT_MAIN_SELECTOR,
  );
  const relatedInputMain = relatedTarget.closest(INPUT_MAIN_SELECTOR);

  if (currentInputMain !== relatedInputMain) return false;

  const selectorsToCheck = [
    INPUT_MAIN_SELECTOR,
    ...(props.noBlurSelectors || []),
  ];
  return selectorsToCheck.some((selector) => relatedTarget.closest(selector));
}

function handleBlur(event: FocusEvent): void {
  if (isBlurProhibited(event)) {
    setFocus();
    return;
  }
  checkValid();
  isFocus.value = false;
  emit("blur");
}

function togglePasswordVisibility(): void {
  currentInputType.value =
    currentInputType.value === INPUT_TYPE.PASSWORD
      ? INPUT_TYPE.TEXT
      : INPUT_TYPE.PASSWORD;
}

function checkValid(): boolean {
  if (props.rules && props.valid) {
    const isValid = props.rules();
    showMessage.value = !isValid;
    return isValid;
  }

  if (!props.rules && props.valid) {
    const hasValue = Boolean(inputRef.value?.value);
    showMessage.value = !hasValue;
    return hasValue;
  }

  showMessage.value = false;
  return true;
}

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.onsubmit = checkValid;
    if (isTextarea.value) {
      resizeTextarea();
    }
  }
});

function resizeTextarea() {
  if (!inputRef.value || !isTextarea.value) return;

  const target = inputRef.value as HTMLTextAreaElement;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
  target.style.margin = "12px 0px";
  target.style.maxHeight = "150px";
  target.style.minHeight = "24px";
}

watch(
  () => props.modelValue,
  () => {
    hideErrorMessage();
    if (isTextarea.value) {
      nextTick(resizeTextarea);
    }
  },
);

const input_ref = inputRef;

defineExpose({
  input_ref,
  inputRef,
  checkValid,
  setFocus,
});
</script>

<style lang="scss" scoped>
.c-input {
  width: 100%;

  .input-label {
    margin-bottom: 8px;
    font-size: 16px;
    font-weight: 400;
    color: var(--color-neutral-on-text);
    user-select: none;

    span {
      color: var(--app-red-500);
    }
  }

  .input-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 40px;
    padding: 0 10px;
    overflow-x: hidden;
    border: 2px solid var(--color-neutral-on-outline);
    transition: border-color 0.3s ease;
    border-radius: var(--radius-pill);
    &--textarea {
      height: auto;
      padding: 10px;
    }

    &:hover:not(.disabled):not(.error) {
      border-color: var(--color-primary-on-hover);
    }

    .main-input {
      width: 100%;
      height: 100%;
      padding: 0;
      font-size: 16px;
      font-weight: 400;
      line-height: 150%;
      color: var(--color-primary-on-text);
      background: transparent;
      border: none;
      outline: none;
      overscroll-behavior: contain;
      &::placeholder {
        color: var(--color-neutral-on-muted);
      }
    }

    .main-textarea {
      resize: none;
      outline: none;

      &::-webkit-scrollbar {
        width: 0;
        background: transparent;
      }
    }
  }

  .main-focus {
    border-color: var(--color-primary-on-hover);
  }

  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: var(--color-neutral-on-muted);

    .main-input {
      color: var(--color-neutral-on-muted);
      cursor: not-allowed;
    }
  }

  .error {
    border-color: var(--app-red-500);
  }

  .input-text {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 20px;
    padding: 4px 0;
    font-size: 12px;

    .error-text {
      color: var(--app-red-500);
    }
  }

  .input-hint {
    position: relative;
    top: -12px;
    min-height: 46px;

    .hint-text {
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
      color: var(--app-grey-350);
    }
  }

  .input-append {
    display: flex;
    align-items: center;
    margin-left: 8px;
    user-select: none;

    .append-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;

      &--spaced {
        margin-left: 8px;
      }

      img {
        width: 24px;
        height: 24px;
        cursor: pointer;
        filter: var(--filter-neutral-on-text);
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
  opacity: 0;
  transform: translateY(-5px);
}
</style>
