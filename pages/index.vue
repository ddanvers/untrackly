<template>
  <main class="page-hero">
    <div class="page-hero__content">
      <div class="logo-container">
        <NuxtImg src="/icons/logo.svg" width="148px"></NuxtImg>
        <div class="logo-container__text">
          <h1 class="logo-container__brand-name">untrackly</h1>
          <p class="logo-container__slogan">Your words are only yours</p>
        </div>
      </div>
      <div class="chat-connection">
        <h2 class="chat-connection__title">Подключиться к чату</h2>
        <p class="chat-connection__description">
          Введите код комнаты, чтобы присоединиться к существующему чату, или создайте новый
        </p>
        <div>
          <CInput
            v-model="chatRoomId"
            label="Код комнаты"
            placeholder="XXXX-XXXX-XXXX-XXXX"
          ></CInput>
        </div>
        <div><CButton>Инициировать подключение</CButton></div>
      </div>
    </div>
    <div class="page-hero__footer"><Snake></Snake></div>
  </main>
</template>

<script setup lang="ts">
const chatRoomId = ref("");
function launchChat() {
  navigateTo(`/chat/${crypto.randomUUID()}`);
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
  display: flex;
  align-items: center;
  .page-hero__content {
    margin: 0px 132px 0px 132px;
  }
}
.logo-container {
  display: flex;
  align-items: center;
  gap: 32px;
  &__text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 6px;
    padding: 12px;
  }
  &__brand-name {
    font-weight: 400;
    font-size: 72px;
    color: var(--color-primary-on-text);
  }
  &__slogan {
    font-weight: 400;
    font-size: 18px;
    color: var(--color-white);
  }
}
.chat-connection {
  width: 640px;
  background-color: var(--color-bg-on-secondary-light);
}
</style>
