<template>
  <main class="page-chat">
    <section v-if="step === 'invite'" class="person-invitation">
      <section v-if="!isInvited" class="person-invitation__content">
        <div class="person-invitation__hint">Поделитесь пригласительной ссылкой с участником чата любым удобным для вас способом</div>
        <div class="person-invitation__link-container">
          <span class="person-invitation__link">{{ getInviteLink() }}</span>
          <CButton @click="copy"  bgColor="#000000"><span style="color: white">Скопировать</span></CButton>
        </div>
      </section>
      <section v-else class="person-invitation__content">
        <div class="person-invitation__hint">С вами поделились пригласительной ссылкой. <br>
Примите приглашение, чтобы начать чат или отклоните его.</div>
      </section>
      <section class="person-invitation__button-container">
        <CButton @click="goToChat" v-if="!isInvited" height="78px" bgColor="#000000" class="person-invitation__button" size="large"><span>Перейти в чат</span></CButton>
        <CButton @click="goToChat" v-if="isInvited" height="78px" bgColor="#000000" class="person-invitation__button" size="large"><span>Принять</span></CButton>
        <CButton @click="rejectInvite" v-if="isInvited" height="78px" bgColor="#000000" class="person-invitation__button" size="large"><span>Отклонить</span></CButton>
      </section>
    </section>
    <section v-else class="page-chat__chat-window"><CChatWindow title="Ваш собеседник" :messages="messages" @sendMessage="sendMessage" :meId="peer?.id"/></section>
  </main>
</template>

<script setup lang="ts">
interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  read?: boolean
}
const step = shallowRef<"invite" | "chat">("invite")
const route = useRoute();
const sessionId = route.params.id as string
const isInvited = ref(route.query.invited)
const { messages, initPeer, sendMessage, peer } = usePeer(sessionId, !isInvited.value)
function getInviteLink() {
  return `${window.location.href}?invited=true`
}
function copy() {
  navigator.clipboard.writeText(getInviteLink())
}
function goToChat() {
    initPeer();
    setTimeout(() => {
        step.value = "chat";
  console.log(peer.value);

    }, 1000)
}
function rejectInvite() {
  navigateTo("/")
}
</script>

<style scoped lang="scss">
.page-chat {
  height: 100vh;
  width: 100vw;
  background: linear-gradient(-60deg, #7D066D 0%, #000000 89%);
  position: relative;
  .person-invitation {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
    &__content {
      display: flex;
      align-items: center;
      gap: 128px;
      padding: 0px 120px;
    } 
    &__hint {
      font-size: 24px;
      text-wrap: balance;
      text-align: center;
      color: white;
    }
    &__link-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 32px;
    }
    &__link {
      color: white;
      font-size: 18px;
      width: max-content;
    }
    &__button-container {
      width: 100%;
      display: flex;
      gap: 40px;
      justify-content: center;
      margin-top: 120px;
      .person-invitation__button {
        width: fit-content;
        span {
          color: white;
          font-size: 22px;
        }

      }

    }
  }
  &__chat-window {
    width: 1215px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 24px;
    overflow: hidden;
  }
}
</style>
