<template>
  <div class="c-alerts">
    <TransitionGroup name="alert">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="c-alert liquid-glass"
        :class="[`c-alert--${alert.type}`]"
        @click="removeAlert(alert.id)"
      >
        <div class="c-alert__icon">
          <NuxtImg v-if="alert.type === 'error'" src="/icons/alert/error.svg" />
          <NuxtImg v-else-if="alert.type === 'success'" src="/icons/alert/success.svg" />
          <NuxtImg v-else-if="alert.type === 'warning'" src="/icons/alert/warning.svg" />
          <NuxtImg v-else src="/icons/alert/info.svg" />
        </div>
        <div class="c-alert__message">{{ alert.message }}</div>
        <button class="c-alert__close" @click.stop="removeAlert(alert.id)">
          <NuxtImg src="/icons/close.svg" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useAlert } from "~/composables/useAlert";

const { alerts, removeAlert } = useAlert();
</script>

<style lang="scss" scoped>
.c-alerts {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  max-width: 400px;
  width: calc(100% - 48px);

  @media screen and (max-width: 600px) {
    top: 16px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}

.c-alert {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &__icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    img {
      width: 100%;
      height: 100%;
    }
  }

  &__message {
    flex-grow: 1;
    font-size: 14px;
    line-height: 1.4;
    color: var(--color-neutral-on-text);
  }

  &__close {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    opacity: 0.6;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    img {
      filter: var(--filter-neutral-on-text);
    }
    &:hover {
      opacity: 1;
    }
  }

  // Types
  &--error {
    border-left: 4px solid var(--color-negative-on-fill);
    .c-alert__icon {
        filter: var(--filter-negative-on-fill);
    }
  }

  &--success {
    border-left: 4px solid var(--color-positive-on-fill);
    .c-alert__icon {
        filter: var(--filter-positive-on-fill);
    }
  }

  &--warning {
    border-left: 4px solid var(--orange-5);
    .c-alert__icon {
        filter: var(--filter-warning-on-fill);
    }
  }

  &--info {
    border-left: 4px solid var(--blue-5);
  }
}

// Animations
.alert-enter-active,
.alert-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.alert-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}

.alert-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}
</style>
