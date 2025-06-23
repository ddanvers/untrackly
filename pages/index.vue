<template>
  <main class="page-hero">
      <section class="page-hero__logo-container">
        <NuxtImg src="/icons/logo.svg" width="400px" class="page-hero__logo" />
        <p class="page-hero__slogan">Быстрый и безопасный чат всегда под рукой</p>
      </section>
      <div class="page-hero__action-container">
        <button class="page-hero__launch-btn" @click="launchChat">
          <NuxtImg src="/icons/play_circle.svg" width="180px" class="page-hero__launch-icon" />
          <span>Запустить чат</span>
        </button>
      </div>
  </main>
</template>

<script setup lang="ts">
function launchChat() {
  navigateTo(`/chat/${crypto.randomUUID()}`)
}
</script>

<style lang="scss" scoped>
.page-hero {
  height: 100vh;
  width: 100vw;
  background: linear-gradient(-60deg, #7D066D 0%, #000000 89%);
  position: relative;
  &__logo-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    position: absolute;;
    top: 310px;
    left: 10%;
    .page-hero__slogan {
      font-size: 24px;
      color: white;
    }
  }
  &__action-container {
    position: absolute;
    top: 50%;
    right: 210px;
    transform: translateY(-50%);
    .page-hero__launch-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      cursor: pointer;
      transition: transform 0.2s ease;
      will-change: transform;
      &:hover {
        transform: scale(1.05);
      }
      .page-hero__launch-icon {
        pointer-events: none;
      }
      span {
        font-size: 24px;
        color: white;
      }
    }
  }
}
</style>
