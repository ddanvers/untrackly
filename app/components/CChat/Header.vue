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
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  width: 100%;
  
  // Liquid Glass Effect
  background: var(--liquid-glass-bg);
  box-shadow: var(--liquid-glass-shadow);
  z-index: 10;

  &__actions {
    display: flex;
    align-items: center;
  }

  &__title {
    font-size: 20px; // Minimalist size, close to ut-h3
    font-weight: 700; // Bold for hierarchy
    color: var(--color-primary-on-text);
    letter-spacing: -0.02em; // Tighten slightly for modern feel
    
    @media screen and (max-width: $app-mobile) {
      font-size: 18px;
    }
  }
}
</style>
