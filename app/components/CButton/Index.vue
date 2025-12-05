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
      <span class="c-button__spinner" :aria-label="loadingAriaLabel" />
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
        <slot />
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
type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "icon-default";
type ButtonType = "submit" | "button";
type ButtonSize = "large" | "default" | "small" | "extra-large";
type IconSize = "i-large" | "i-medium" | "i-small";

interface Props {
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
  iconColor?: string;
  iconSize?: IconSize;
  height?: string;
  width?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  loadingAriaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
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

const emit = defineEmits<{
  click: [event: Event];
}>();

const isDisabled = computed(() => props.disabled || props.loading);

const buttonClasses = computed(() => [
  "c-button",
  props.variant,
  props.size,
  props.iconSize,
  {
    loading: props.loading,
    fill: props.fill,
  },
]);

const inlineStyles = computed(() => ({
  backgroundColor: props.bgColor,
  height: props.height,
  width: props.width,
}));

const labelStyles = computed(() => ({
  color: props.textColor,
}));

const computedIconColor = computed(
  () => props.iconColor || "var(--filter-primary-on-text)",
);

function handleClick(event: Event): void {
  if (!isDisabled.value) {
    emit("click", event);
  }
}
</script>

<style lang="scss" scoped>
// Sizes
$button-padding: 0 20px;
$button-height-small: 32px;
$button-height-default: 40px;
$button-height-large: 48px;
$button-height-extra-large: 56px;

// Animation
$transition-duration: 0.3s;
$transition-easing: ease;

// Spinner
$spinner-size: 18px;

// Mixins
@mixin button-variant-base {
  position: relative;
  overflow: hidden;
  transition: all $transition-duration $transition-easing;
}

.c-button {
  width: fit-content;
  min-width: max-content;
  cursor: pointer;
  background: transparent;
  border: none;
  outline: none;

  &__content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__prepend,
  &__append {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 24px;
    max-height: 24px;
  }

  &__icon {
    width: 24px;
    height: 24px;
  }

  &__label {
    font-size: 16px;
    font-weight: 400;
  }

  &__loading {
    position: relative;
    width: $spinner-size;
    height: $spinner-size;
    margin: auto;
    border: 2px solid;
    border-top-color: transparent;
    border-radius: 50%;
    animation: rotate 1s linear infinite;
  }

  &__spinner {
    display: block;
    width: 100%;
    height: 100%;
  }

  &.fill {
    width: 100%;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

// Size variants
.large {
  height: $button-height-large;
  padding: $button-padding;
}

.extra-large {
  height: $button-height-extra-large;
  padding: $button-padding;
}

.default {
  height: $button-height-default;
  padding: $button-padding;
}

.small {
  height: $button-height-small;
  padding: $button-padding;

  .c-button__label {
    font-size: 14px;
  }
}

// Color variants
.primary {
  overflow: hidden;
  background: var(--color-primary-on-fill);
  transition: background $transition-duration $transition-easing;

  .c-button__label {
    color: var(--color-permanent-black);
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
    background: var(--color-primary-on-muted);
    opacity: 0.4;
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
  @include button-variant-base;

  background: var(--color-neutral-on-fill);
  transition:
    background $transition-duration $transition-easing,
    color $transition-duration $transition-easing;

  .c-button__label {
    color: var(--color-primary-on-text);
  }

  &:hover {
    background: var(--color-neutral-on-hover);
  }

  &:active {
    background: var(--color-neutral-on-active);
  }

  &:disabled {
    opacity: 0.5;
  }

  &.loading {
    background: var(--app-pink-50);

    .c-button__loading {
      color: var(--app-grey-700);
    }
  }
}

.tertiary {
  @include button-variant-base;

  background: transparent;
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
  @include button-variant-base;

  background: transparent;
  border: none;

  .c-button__label {
    color: var(--color-primary-on-text);
  }

  &:hover {
    .c-button__label {
      color: var(--color-primary-on-hover);
    }
  }

  &:active {
    .c-button__label {
      color: var(--color-primary-on-active);
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
  @include button-variant-base;

  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity $transition-duration $transition-easing;
  filter: v-bind(computedIconColor);

  &.i-small {
    width: 56px;
    height: 32px;

    .c-button__label {
      height: 16px;
    }
  }

  &.i-medium {
    width: 64px;
    height: 44px;

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
