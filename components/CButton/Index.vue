<template>
  <button
    :class="['c-button', classButton, { loading, fill }]"
    :disabled="disabled || loading"
    :style="{ backgroundColor: bgColor, height: height, width: width }"
    :type="buttonType"
  >
    <div v-if="loading" class="c-button-loading"></div>
    <div v-else class="c-button-content">
      <div class="prepend">
        <slot name="prepend">
          <NuxtImg v-if="prependImg" :src="prependImg"></NuxtImg>
        </slot>
      </div>
      <div class="label" :style="{ color: textColor }">
        <slot></slot>
      </div>
      <div class="append">
        <slot name="append">
          <NuxtImg v-if="appendImg" :src="appendImg"></NuxtImg>
        </slot>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
type Props = {
  type?: "primary" | "secondary" | "tertiary" | "quaternary" | "icon-default";
  buttonType?: "submit" | "button";
  loading?: boolean;
  size?: "large" | "default" | "small" | "extra-large";
  fill?: boolean;
  prependImg?: string;
  appendImg?: string;
  disabled?: boolean;
  bgColor?: string;
  textColor?: string;
  iconSize?: "i-large" | "i-medium" | "i-small";
  height?: string;
  width?: string;
};
const props = withDefaults(defineProps<Props>(), {
  type: "primary",
  size: "default",
  loading: false,
  disabled: false,
  buttonType: "submit",
  fill: false,
  iconSize: "i-small",
});
const classButton = computed(() => [props.type, props.size, props.iconSize]);
</script>
<style lang="scss" scoped>
.c-button {
  border: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  width: fit-content;
  border-radius: 8px;
  transition: 0.5s;
  .c-button-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    .prepend,
    .append {
      max-width: 24px;
      max-height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      img {
        width: 24px;
        height: 24px;
      }
    }
    .label {
      font-size: 14px;
      font-weight: 400;
    }
  }
  .c-button-loading {
    height: 18px;
    width: 18px;
    position: relative;
    border: 2px solid;
    border-radius: 50%;
    border-top-color: transparent;
    animation: rotate 1s linear infinite;
    margin: auto;
  }
}
.c-button.fill {
  width: 100%;
}
button:disabled {
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
  .c-button-content {
    .label {
      font-size: 14px;
    }
  }
}

.primary {
  background: var(--app-pink-500);
  transition: background 0.3s ease;
  position: relative;
  z-index: 3;
  overflow: hidden;
  .label {
    color: var(--app-white);
  }
  .c-button-content {
    position: relative;
    z-index: 3;
    img {
      filter: var(--app-filter-text-light-permanent);
    }
  }
  &:hover {
    background: var(--app-pink-600);
  }
  &:active {
    background: var(--app-pink-700);
  }
  &:disabled {
    background: var(--app-grey-200);
  }
  &.loading {
    background: var(--app-pink-500);
    .c-button-loading {
      z-index: 3;
      color: var(--app-grey-050);
    }
  }
}

.secondary {
  background: var(--app-pink-50);
  position: relative;
  overflow: hidden;
  transition: background 0.3s ease, color 0.3s ease;
  .label {
      color: var(--app-text-primary);
  }
  .c-button-content {
  }
  &:hover {
    background: var(--app-pink-100);
  }
  &:active {
    background: var(--app-pink-200);
  }
  &:disabled {
    background: var(--app-grey-200);
    .label {
      color: var(--app-grey-050);
    }
  }
  &.loading {
    background: var(--app-pink-50);
    .c-button-loading {
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
  .label {
    color: var(--app-pink-500);
  }
  .c-button-content {
  }
  &:hover {
    border-color: var(--app-pink-600);
    .label {
      color: var(--app-pink-600);
    }
  }
  &:active {
    border-color: var(--app-pink-500);
    .label {
      color: var(--app-pink-500);
    }
  }
  &:disabled {
    border-color: var(--app-grey-300);
    .label {
      color: var(--app-grey-500);
    }
  }
  &.loading {
    border-color: var(--app-pink-500);
    .c-button-loading {
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
  .label {
    color: var(--app-pink-500);
  }
  .c-button-content {
  }
  &:hover {
    .label {
      color: var(--app-pink-500);
    }
  }
  &:active {
    .label {
      color: var(--app-pink-600);
    }
  }
  &:disabled {
    .label {
      color: var(--app-grey-500);
    }
  }
  &.loading {
    .c-button-loading {
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
    .label {
      height: 16px;
    }
  }
  &.i-medium {
    height: 44px;
    width: 64px;
    .label {
      height: 24px;
    }
  }
  &.i-large {
    .label {
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
