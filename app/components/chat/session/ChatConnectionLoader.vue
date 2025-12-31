<template>
  <section class="connection-loader" aria-label="Восстановление соединения">
    <div class="connection-loader__content">
      <h2 class="connection-loader__title">Восстановление соединения</h2>
      <p class="connection-loader__message">
        {{ message }}
      </p>
      <div class="connection-loader__spinner">
        <div class="spinner-ring"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<style scoped lang="scss">
.connection-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--color-bg-on-secondary-rgb, 0, 0, 0), 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  &__content {
    text-align: center;
    color: var(--color-primary-on-text);
    max-width: 400px;
    padding: 24px;
  }

  &__spinner {
    margin: 0 auto 24px;
    width: 60px;
    height: 60px;
    position: relative;

    .spinner-ring {
      width: 60px;
      height: 60px;
      border: 4px solid var(--color-neutral-on-outline);
      border-top: 4px solid var(--color-primary-on-fill);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--color-primary-on-text);
  }

  &__message {
    font-size: 16px;
    color: var(--color-neutral-on-text);
    margin-bottom: 24px;
    line-height: 1.5;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
