<template>
  <main class="chat-page" aria-label="Чат">
    <section class="chat-invitation" aria-labelledby="chat-invitation-title">
      <header class="chat-invitation__header">
        <h1 id="chat-invitation-title" class="chat-invitation__title">
          Приглашение в&nbsp;закрытый чат
        </h1>
      </header>
      <section v-if="!isInvited" class="chat-invitation__content" aria-label="Поделиться ссылкой">
        <h2 class="visually-hidden">Поделиться ссылкой</h2>
        <p class="chat-invitation__hint">
          Поделитесь пригласительной ссылкой с&nbsp;участником чата любым удобным для вас способом
        </p>
        <div class="chat-invitation__link-container">
          <div
            ref="linkBlock"
            class="chat-invitation__link-wrapper"
            :style="{
              height: fixedHeight ? fixedHeight + 'px' : 'auto',
              backgroundColor: animating ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
            }"
          >
            <span class="chat-invitation__link" aria-label="Ссылка для приглашения">{{
              displayText
            }}</span>
          </div>
          <CButton
            @click="copyInvitationLink"
            variant="secondary"
            :aria-label="'Скопировать ссылку'"
          >
            <span>Скопировать</span>
          </CButton>
        </div>
      </section>
      <section v-else class="chat-invitation__content" aria-label="Принять приглашение">
        <h2 class="visually-hidden">Принять приглашение</h2>
        <p class="chat-invitation__hint">
          С вами поделились пригласительной ссылкой. <br />
          Примите приглашение, чтобы начать чат.
        </p>
      </section>
      <nav class="chat-invitation__button-container" aria-label="Действия приглашения">
        <ul class="chat-invitation__actions">
          <li class="chat-invitation__action" v-if="!isInvited">
            <CButton
              @click="goToChat"
              class="chat-invitation__button"
              size="extra-large"
              :aria-label="'Перейти в чат'"
            >
              <span>Перейти в чат</span>
            </CButton>
          </li>
          <li class="chat-invitation__action" v-if="isInvited">
            <CButton
              @click="goToChat"
              class="chat-invitation__button"
              size="extra-large"
              :aria-label="'Принять приглашение'"
              fill
            >
              <span>Принять</span>
            </CButton>
          </li>
          <li class="chat-invitation__action" v-if="isInvited">
            <CButton
              @click="rejectInvite"
              class="chat-invitation__button chat-invitation__button--secondary"
              size="extra-large"
              variant="secondary"
              fill
              :aria-label="'Отклонить приглашение'"
            >
              <span>Отклонить</span>
            </CButton>
          </li>
        </ul>
      </nav>
    </section>
  </main>
</template>

<script setup lang="ts">
const route = useRoute();
definePageMeta({
  header: false,
});

const linkBlock = ref<HTMLElement | null>(null);
const copying = shallowRef(false);
const sessionId = route.params.id as string;
const isInvited = shallowRef(route.query.invited);
const fixedHeight = shallowRef<number | null>(null);
const animating = shallowRef(false);
const displayText = shallowRef(getInviteLink());

function getInviteLink() {
  if (!window) return "Генерируем ссылку...";
  return `${window.location.href}?invited=true`;
}

async function copyInvitationLink() {
  if (copying.value) return;
  copying.value = true;
  if (!linkBlock.value) {
    copying.value = false;
    return;
  }
  fixedHeight.value = linkBlock.value.offsetHeight;
  await navigator.clipboard.writeText(getInviteLink());
  animating.value = true;
  displayText.value = "";
  const targetText = "Скопировано";
  setTimeout(() => {
    let i = 0;
    const interval = setInterval(() => {
      displayText.value += targetText[i];
      i++;
      if (i >= targetText.length) {
        clearInterval(interval);
        setTimeout(() => {
          displayText.value = getInviteLink();
          animating.value = false;
          fixedHeight.value = null;
          copying.value = false;
        }, 1000);
      }
    }, 50);
  }, 300);
}

function goToChat() {
  navigateTo({
    path: `/chat/${sessionId}`,
    query: { invited: isInvited.value },
  });
}
function rejectInvite() {
  navigateTo("/");
}
</script>

<style scoped lang="scss">
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
$app-medium-height: 750px;
$app-small-height: 520px;
.chat-page {
  min-height: 100vh;
  width: 100%;
  background: var(--app-pink-gradient-bg);
  position: relative;
  display: flex;
  flex: 1 1 auto;
  background-color: var(--color-bg-on-secondary);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .chat-invitation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    width: max-content;
    max-width: 100%;
    padding: 24px;
    &__header {
      margin-bottom: 8px;
      text-align: center;
    }

    &__title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-primary-on-text);
      margin: 0;
      text-wrap: balance;
    }

    &__content {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 64px;
      max-width: 100%;
      @media screen and (max-height: 750px) and (max-width: $app-desktop) {
        gap: 64px;
      }
      @media screen and (max-width: $app-mobile) {
        gap: 32px;
      }
      @media screen and (max-height: 420px) {
        gap: 32px;
      }
    }

    &__hint {
      font-size: 24px;
      text-wrap: balance;
      text-align: center;
      color: var(--color-neutral-on-text);
      max-width: 560px;
      @media screen and (max-width: $app-mobile) {
        font-size: 20px;
      }
      @media screen and (max-height: 420px) {
        font-size: 20px;
      }
    }

    &__link-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 32px;
      max-width: 100%;
    }

    &__link-wrapper {
      position: relative;
      min-height: 72px;
      display: flex;
      align-items: center;
      max-width: 100%;
      justify-content: center;
      padding: 24px 32px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      width: 320px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      color: var(--color-neutral-on-text);
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      word-break: break-word;
      transition:
        background-color 0.3s ease,
        box-shadow 0.3s ease,
        border-color 0.3s ease;
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.2);
      }
      @media screen and (max-width: $app-mobile) {
        font-size: 16px;
        padding: 12px 16px;
      }
      @media screen and (max-height: 420px) {
        font-size: 16px;
        padding: 12px 16px;
      }
    }

    &__link {
      display: block;
      width: 100%;
    }

    &__button-container {
      width: 100%;
      display: flex;
      gap: 40px;
      justify-content: center;
      margin-top: 32px;
      @media screen and (max-width: $app-mobile) {
        margin-top: 5vh;
      }
      @media screen and (max-width: $app-narrow-mobile) {
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
      .chat-invitation__button {
        span {
          font-size: 20px;
        }
      }
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      gap: 32px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    &__action {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
