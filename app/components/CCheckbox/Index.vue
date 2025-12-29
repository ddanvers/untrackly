<template>
  <label
    class="c-checkbox"
    :class="{ 'c-checkbox--disabled': disabled, 'c-checkbox--checked': modelValue }"
    @keydown.space.prevent="toggle"
    tabindex="0"
  >
    <input
      type="checkbox"
      class="c-checkbox__input"
      :checked="modelValue"
      :disabled="disabled"
      @change="toggle"
      tabindex="-1"
    />
    <div class="c-checkbox__box">
      <svg
        viewBox="0 0 24 24"
        class="c-checkbox__checkmark"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span v-if="label" class="c-checkbox__label">{{ label }}</span>
    <slot />
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function toggle() {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
}
</script>

<style lang="scss" scoped>
.c-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: opacity 0.2s ease;

  &--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__box {
    position: relative;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(4px);
    border-radius: 6px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }

  &:hover:not(.c-checkbox--disabled) .c-checkbox__box {
    border-color: var(--color-primary-on-hover);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    
    // Only apply light background if not checked to avoid overriding fill
    &:not(.c-checkbox--checked .c-checkbox__box) {
      background: rgba(255, 176, 0, 0.05);
    }
  }

  &__checkmark {
    width: 14px;
    height: 14px;
    color: var(--color-bg-on-primary);
    stroke-dasharray: 24;
    stroke-dashoffset: 24;
    transition: stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &--checked {
    .c-checkbox__box {
      background: var(--color-primary-on-fill);
      border-color: var(--color-primary-on-fill);
    }

    .c-checkbox__checkmark {
      stroke-dashoffset: 0;
    }
  }

  &__label {
    font-size: 18px;
    color: var(--color-neutral-on-text);
  }

  &:focus-visible {
    .c-checkbox__box {
      box-shadow: 0 0 0 2px var(--color-primary-on-hover);
    }
  }

  @media screen and (max-width: 600px) {
    &__label {
      font-size: 16px;
    }
  }
}
</style>
