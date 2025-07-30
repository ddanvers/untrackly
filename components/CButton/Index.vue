<template>
  <button
    :class="buttonClasses"
    :disabled="isDisabled"
    :style="inlineStyles"
    :type="buttonType"
    :aria-label="ariaLabel"
    :aria-busy="loading"
    :aria-describedby="ariaDescribedBy"
    role="button"
    @click="handleClick"
  >
    <div v-if="loading" class="c-button__loading" aria-hidden="true">
      <span class="c-button__spinner" :aria-label="loadingAriaLabel"></span>
    </div>
    <div v-else class="c-button__content">
      <div class="c-button__prepend">
        <slot name="prepend">
          <NuxtImg
            v-if="prependImg"
            :src="prependImg"
            :alt="prependImgAlt"
            class="c-button__icon"
          />
        </slot>
      </div>
      <div class="c-button__label" :style="labelStyles">
        <slot></slot>
      </div>
      <div class="c-button__append">
        <slot name="append">
          <NuxtImg v-if="appendImg" :src="appendImg" :alt="appendImgAlt" class="c-button__icon" />
        </slot>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
interface ButtonProps {
  variant?: ButtonVariant;
  buttonType?: ButtonType;
  loading?: boolean;
  size?: ButtonSize;
  fill?: boolean;
  prependImg?: string;
  prependImgAlt?: string;
  appendImg?: string;
  appendImgAlt?: string;
  disabled?: boolean;
  bgColor?: string;
  textColor?: string;
  iconSize?: IconSize;
  height?: string;
  width?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  loadingAriaLabel?: string;
}

type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "icon-default";
type ButtonType = "submit" | "button";
type ButtonSize = "large" | "default" | "small" | "extra-large";
type IconSize = "i-large" | "i-medium" | "i-small";

type ButtonEmits = (event: "click", payload: Event) => void;

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "default",
  loading: false,
  disabled: false,
  buttonType: "submit",
  fill: false,
  iconSize: "i-small",
  prependImgAlt: "",
  appendImgAlt: "",
  loadingAriaLabel: "Loading...",
});
const emit = defineEmits<ButtonEmits>();

const isDisabled = computed((): boolean => props.disabled || props.loading);
const buttonClasses = computed(() => [
  "c-button",
  getCSSClassesForVariant(),
  getCSSClassesForStates(),
]);
const inlineStyles = computed(() => ({
  backgroundColor: props.bgColor,
  height: props.height,
  width: props.width,
}));
const labelStyles = computed(() => ({
  color: props.textColor,
}));

const getCSSClassesForVariant = (): string[] => [
  props.variant,
  props.size,
  props.iconSize,
];

const getCSSClassesForStates = () => ({
  loading: props.loading,
  fill: props.fill,
});

const handleClick = (event: Event): void => {
  if (!isDisabled.value) {
    emit("click", event);
  }
};
</script>

<style lang="scss" scoped>
.c-button {
  border: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  width: fit-content;
  transition: 0.5s;

  &__content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .c-button__prepend,
    .c-button__append {
      max-width: 24px;
      max-height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

      .c-button__icon {
        width: 24px;
        height: 24px;
      }
    }

    .c-button__label {
      font-size: 14px;
      font-weight: 400;
    }
  }

  &__loading {
    height: 18px;
    width: 18px;
    position: relative;
    border: 2px solid;
    border-radius: 50%;
    border-top-color: transparent;
    animation: rotate 1s linear infinite;
    margin: auto;
  }

  &__spinner {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.c-button.fill {
  width: 100%;
}

.c-button:disabled {
  cursor: not-allowed;
}

.large {
  padding: 0 20px;
  height: 48px;
}

.extra-large {
  padding: 0 20px;
  height: 56px;
}

.default {
  padding: 0 20px;
  height: 44px;
}

.small {
  padding: 0 20px;
  height: 32px;

  .c-button__content {
    .c-button__label {
      font-size: 14px;
    }
  }
}

.primary {
  background: var(--color-primary-on-fill);
  transition: background 0.3s ease;
  overflow: hidden;

  .c-button__label {
    color: var(--color-black);
  }

  .c-button__content {
    position: relative;
    z-index: 3;

    .c-button__icon {
      filter: var(--app-filter-text-light-permanent);
    }
  }

  &:hover {
    background: var(--color-primary-on-hover);
  }

  &:active {
    background: var(--color-primary-on-active);
  }

  &:disabled {
    background: var(--app-grey-200);
  }

  &.loading {
    background: var(--app-pink-500);

    .c-button__loading {
      z-index: 3;
      color: var(--app-grey-050);
    }
  }
}

.secondary {
  background: var(--app-pink-50);
  position: relative;
  overflow: hidden;
  transition:
    background 0.3s ease,
    color 0.3s ease;

  .c-button__label {
    color: var(--app-text-primary);
  }

  &:hover {
    background: var(--app-pink-100);
  }

  &:active {
    background: var(--app-pink-200);
  }

  &:disabled {
    background: var(--app-grey-200);

    .c-button__label {
      color: var(--app-grey-050);
    }
  }

  &.loading {
    background: var(--app-pink-50);

    .c-button__loading {
      color: var(--app-grey-700);
    }
  }
}

.tertiary {
  background: transparent;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--app-pink-400);

  .c-button__label {
    color: var(--app-pink-500);
  }

  &:hover {
    border-color: var(--app-pink-600);

    .c-button__label {
      color: var(--app-pink-600);
    }
  }

  &:active {
    border-color: var(--app-pink-500);

    .c-button__label {
      color: var(--app-pink-500);
    }
  }

  &:disabled {
    border-color: var(--app-grey-300);

    .c-button__label {
      color: var(--app-grey-500);
    }
  }

  &.loading {
    border-color: var(--app-pink-500);

    .c-button__loading {
      color: var(--app-pink-500);
    }
  }
}

.quaternary {
  background: transparent;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;

  .c-button__label {
    color: var(--app-pink-500);
  }

  &:hover {
    .c-button__label {
      color: var(--app-pink-500);
    }
  }

  &:active {
    .c-button__label {
      color: var(--app-pink-600);
    }
  }

  &:disabled {
    .c-button__label {
      color: var(--app-grey-500);
    }
  }

  &.loading {
    .c-button__loading {
      color: var(--app-pink-400);
    }
  }
}

.icon-default {
  background-color: var(--app-grey-50);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: opacity 0.3s ease;

  &::after {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: rgb(0, 0, 0, 0.1);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &.i-small {
    height: 32px;
    width: 56px;

    .c-button__label {
      height: 16px;
    }
  }

  &.i-medium {
    height: 44px;
    width: 64px;

    .c-button__label {
      height: 24px;
    }
  }

  &.i-large {
    .c-button__label {
      height: 32px;
    }
  }

  &:hover::after {
    opacity: 0.5;
  }

  &:active::after {
    opacity: 1;
  }
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

.dark {
  .icon-default {
    &::after {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
