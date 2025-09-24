<template>
  <header class="chat-header">
    <span class="chat-header__title">{{ title }}</span>
    <nav class="chat-header__actions">
      <slot name="buttons"></slot>
    </nav>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string;
}
const props = defineProps<Props>();
</script>

<style scoped lang="scss">
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  width: 100%;
  background-color: var(--color-bg-on-primary);
  &__actions {
    display: flex;
    gap: 8px;
    img {
      // filter: var(--app-filter-pink-500);
    }
  }
  &__title {
    font-size: 32px;
    color: var(--color-primary-on-text);
    @media screen and (max-width: $app-mobile) {
      font-size: 24px;
    }
  }
}
</style>
