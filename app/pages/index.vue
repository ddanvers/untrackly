<template>
  <main class="page-hero">
    <div class="page-hero__content">
      <div class="logo-container">
        <div class="logo-tilt-box">
          <div class="logo-wrapper">
            <Logo class="logo-icon" :isClosed="!!chatRoomId" />
          </div>
          <div class="logo-container__text">
            <h1 class="logo-container__brand-name">untrackly</h1>
            <p class="logo-container__slogan">Your words are only yours</p>
          </div>
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
            placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
            dataMaska="********-****-****-****-************"
            :readonlyProp="isChatRoomIdGenerated"
            valid
          ></CInput>
          <CButton variant="secondary" @click="toggleChatRoomIdGeneration">
            {{ isChatRoomIdGenerated ? "Удалить код" : "Сгенерировать" }}
          </CButton>
        </div>
        <CButton fill :disabled="!isChatRoomIdValid" @click="launchChat"
          >Инициировать подключение</CButton
        >
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
definePageMeta({
  header: true,
});
const chatRoomId = shallowRef("");
const isChatRoomIdGenerated = shallowRef(false);
const isChatRoomIdValid = computed(() => {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(chatRoomId.value);
});
function launchChat() {
  navigateTo(`/chat/${chatRoomId.value}/entry`);
}
function toggleChatRoomIdGeneration() {
  if (isChatRoomIdGenerated.value) {
    chatRoomId.value = "";
    isChatRoomIdGenerated.value = false;
    return;
  }
  chatRoomId.value = crypto.randomUUID();
  isChatRoomIdGenerated.value = true;
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
    description: "Прямое подключение через протокол WebRTC",
    icon: "/icons/main/cards/web.svg",
  },
];
</script>

<style lang="scss" scoped>
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
$app-medium-height: 750px;
$app-small-height: 520px;
.page-hero {
  height: calc(100vh - 72px);
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
    margin: auto 0;
    @media screen and (max-width: $app-desktop) {
      justify-content: space-between;
      align-items: flex-start;
      padding: 0px 64px;
    }
    @media screen and (max-width: $app-laptop) {
      min-height: calc(100vh - 72px);
      width: max-content;
      flex-direction: column;
      justify-content: center;
      gap: 48px;
      padding: 24px;
    }
    @media screen and (max-width: $app-narrow-mobile) {
      padding: 8px;
    }
    @media screen and (max-height: $app-small-height) {
      justify-content: flex-start;
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
.logo-tilt-box {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 10px;
  border-radius: 20px;
  transition: transform 0.1s ease-out;
  will-change: transform;

  .logo-wrapper {
    position: relative;
    width: 148px;
    height: 148px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-icon {
    width: 100%;
    position: relative;
    z-index: 2;
  }

  .logo-container__text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 6px;
    padding: 12px;
  }

  .logo-container__brand-name {
    font-weight: 700;
    font-size: 72px;
    background: linear-gradient(135deg, var(--orange-3) 0%, var(--orange-5) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .logo-container__slogan {
    font-weight: 400;
    font-size: 18px;
    color: var(--color-primary-on-text);
    opacity: 0.9;
  }
  @media screen and (max-width: $app-desktop) {
    img {
      display: none;
    }
    .logo-container__brand-name {
      font-size: 56px;
    }
  }
  @media screen and (max-width: $app-laptop) {
    .logo-container__brand-name {
      font-size: 48px;
    }
    .logo-container__slogan {
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
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
    @media screen and (max-width: $app-mobile) {
      flex-direction: column;
      button {
        width: 100%;
      }
    }
  }
  @media screen and (max-width: $app-narrow-mobile) {
    padding: 12px;
  }
}
.attractive-info-card {
  width: 380px;
  max-width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  gap: 16px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  transition:
    transform 0.4s ease,
    box-shadow 0.4s ease,
    border-color 0.4s ease;
  &:hover {
    transform: translateY(-8px);
    box-shadow:
      0 16px 48px 0 rgba(0, 0, 0, 0.25),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  img {
    height: 72px;
  }
  &__title {
    color: var(--color-primary-on-text);
    font-size: 40px;
    font-weight: 400;
  }
  &__description {
    color: var(--color-black);
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
