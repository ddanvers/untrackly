<template>
  <main class="page-hero">
    <div></div>
    <div class="page-hero__content">
      <div class="logo-container">
        <NuxtImg src="/icons/logo.svg"></NuxtImg>
        <div class="logo-container__text">
          <h1 class="logo-container__brand-name">untrackly</h1>
          <p class="logo-container__slogan">Your words are only yours</p>
        </div>
      </div>
      <div class="chat-connection">
        <h2 class="chat-connection__title">Подключиться к чату</h2>
        <p class="chat-connection__description">
          Введите код комнаты, чтобы присоединиться к существующему чату, или сгенерируйте, чтобы
          создать свой
        </p>
        <div class="chat-connection__form">
          <CInput
            v-model="chatRoomId"
            label="Код комнаты"
            placeholder="XXXX-XXXX-XXXX-XXXX"
          ></CInput>
          <CButton variant="secondary">Сгенерировать</CButton>
        </div>
        <CButton fill>Инициировать подключение</CButton>
      </div>
    </div>
    <div class="page-hero__footer">
      <div class="attractive-info-card" v-for="card in infoCards">
        <div class="attractive-info-card__icon">
          <NuxtImg :src="card.icon"></NuxtImg>
        </div>
        <h3 class="attractive-info-card__title">{{ card.title }}</h3>
        <p class="attractive-info-card__description">{{ card.description }}</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const chatRoomId = ref("");
function launchChat() {
  navigateTo(`/chat/${crypto.randomUUID()}`);
}
const infoCards = [
  {
    title: "безопасно",
    description: "Передача данных защищена сквозным шифрованием",
    icon: "/icons/main/cards/lock.svg",
  },
  {
    title: "анонимно",
    description: "Нет регистрации и хранения персональных данных",
    icon: "/icons/main/cards/anon.svg",
  },
  {
    title: "peer-to-peer",
    description: "Нет серверов данных, прямое соединение через протокол WebRTC",
    icon: "/icons/main/cards/web.svg",
  },
];
</script>

<style lang="scss" scoped>
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.page-hero {
  height: 100vh;
  width: 100%;
  background: var(--color-bg-on-secondary);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  .page-hero__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 100%;
    padding: 0px 5vw;
    gap: 64px;
    @media screen and (max-width: $app-desktop) {
      justify-content: space-between;
      align-items: flex-start;
      padding: 0px 64px;
    }
    @media screen and (max-width: $app-laptop) {
      min-height: 100vh;
      width: max-content;
      flex-direction: column;
      justify-content: center;
      gap: 48px;
      padding: 24px;
    }
  }
  &__footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 290px;
    gap: 32px;
    padding: 32px;
    padding: 24px 5vw;
    background:
      linear-gradient(rgba(4, 0, 66, 0.25), rgba(4, 0, 66, 0.25)), var(--color-bg-on-secondary);
    @media screen and (max-width: $app-desktop) {
      padding: 24px 64px;
      height: 260px;
    }
    @media screen and (max-width: $app-laptop) {
      flex-direction: column;
      height: max-content;
      padding: 24px;
    }
  }
}
.logo-container {
  display: flex;
  align-items: center;
  gap: 32px;
  img {
    width: 148px;
  }
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
  @media screen and (max-width: $app-desktop) {
    img {
      display: none;
    }
    &__brand-name {
      font-size: 56px;
    }
  }
  @media screen and (max-width: $app-laptop) {
    &__brand-name {
      font-size: 48px;
    }
    &__slogan {
      font-size: 16px;
    }
  }
  @media screen and (max-width: $app-mobile) {
    display: none;
  }
}
.chat-connection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 32px;
  width: 640px;
  max-width: 100%;
  background-color: var(--color-bg-on-secondary-light);
  &__title {
    color: var(--color-primary-on-text);
    font-size: 22px;
    font-weight: 400;
  }
  &__description {
    color: var(--color-neutral-on-text);
    font-size: 16px;
  }
  &__form {
    display: flex;
    gap: 16px;
    width: 100%;
    align-items: flex-end;
  }
}
.attractive-info-card {
  width: 380px;
  height: 100%;
  padding: 24px;
  display: flex;
  gap: 16px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
  border: 2px solid var(--color-neutral-on-outline);
  img {
    height: 72px;
  }
  &__title {
    color: var(--color-primary-on-text);
    font-size: 40px;
    font-weight: 400;
  }
  &__description {
    color: var(--color-white);
    font-size: 16px;
    text-align: center;
  }
  @media screen and (max-width: $app-desktop) {
    padding: 16px;
    img {
      height: 56px;
    }
    &__title {
      font-size: 32px;
    }
  }
}
</style>
