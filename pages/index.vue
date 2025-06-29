<template>
  <main class="page-hero">
      <section class="page-hero__logo-container">
        <NuxtImg src="/icons/logo.svg" class="page-hero__logo" />
        <p class="page-hero__slogan">You launch. You chat.</p>
      </section>
      <div class="page-hero__action-container">
        <button class="page-hero__launch-btn" @click="launchChat">
          <NuxtImg src="/icons/play_circle.svg" class="page-hero__launch-icon" />
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
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.page-hero {
  height: 100vh;
  width: 100vw;
  background: var(--app-pink-gradient-bg);
  position: relative;
  padding: 24px;
  &__logo-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    position: absolute;;
    top: 30%;
    left: 10%;
    @media screen and (max-width: $app-laptop) and (min-height: 420px) {
      left: 50%;
      top:  10%;
      transform: translateX(-50%);
    }
    @media screen and (max-height: 420px) {
      left: 5%;
      top: 50%;
      transform: translateY(-50%);
    }
    .page-hero__logo {
      width: 400px;
              max-width: calc(100vw - 48px);
                            @media screen and (max-width: $app-mobile) {
                              width: 300px;
        }
                        @media screen and (max-height: 420px) {
            width: 300px;
        }
    }
    .page-hero__slogan {
      font-size: 24px;
      color: var(--app-text-primary);
                      @media screen and (max-width: $app-mobile) {
                        font-size: 20px;
        }
                                @media screen and (max-height: 420px) {
            font-size: 20px;
        }
    }
  }
  &__action-container {
    position: absolute;
    top: 50%;
    right: 10%;
    height: max-content;
    transform: translateY(-50%);
    @media screen and (max-width: $app-laptop) and (min-height: 420px) {
      left: 50%;
      transform: translate(-50%, -50%);
      right: unset;
    }
    @media screen and (max-height: 750px) and (max-width: $app-laptop) {
      bottom: 10%;
      top: unset;
      transform: translateX(-50%);
    }
    @media screen and (max-height: 420px) {
      right: 5%;
      top: 50%;
      transform: translateY(-50%);
    }
    .page-hero__launch-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      cursor: pointer;
      &:hover .page-hero__launch-icon  {
        transform: scale(1.05);
      }
      .page-hero__launch-icon {
        pointer-events: none;
              transition: transform 0.2s ease;
      will-change: transform;
        filter: var(--app-filter-text-light-permanent);
        width: 180px;
                @media screen and (max-width: $app-mobile) {
                  width: 140px;
        }
                @media screen and (max-height: 420px) {
            width: 140px;
        }
      }
      span {
        font-size: 24px;
        color: var(--app-text-light-permanent);
        @media screen and (max-width: $app-mobile) {
          font-size: 20px;
        }
        @media screen and (max-height: 420px) {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
