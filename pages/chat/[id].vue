<template>
  <main class="page-chat">
    <section v-if="step === 'invite'" class="person-invitation">
      <section v-if="!isInvited" class="person-invitation__content">
        <div class="person-invitation__hint">
          Поделитесь пригласительной ссылкой с участником чата любым удобным для вас способом
        </div>
        <div class="person-invitation__link-container">
          <div
            ref="linkBlock"
            class="person-invitation__link-wrapper"
            :style="{
              height: fixedHeight ? fixedHeight + 'px' : 'auto',
              backgroundColor: animating ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            }"
          >
            <span class="person-invitation__link">{{ displayText }}</span>
          </div>
        <CButton @click="copy" type="secondary">
          <span>Скопировать</span>
        </CButton>
        </div>
      </section>
      <section v-else class="person-invitation__content">
        <div class="person-invitation__hint">
          С вами поделились пригласительной ссылкой. <br />
          Примите приглашение, чтобы начать чат.
        </div>
      </section>
      <section class="person-invitation__button-container">
        <CButton
          @click="goToChat"
          v-if="!isInvited"
          height="78px"
          class="person-invitation__button"
          size="large"
        >
          <span>Перейти в чат</span>
        </CButton>
        <CButton
          @click="goToChat"
          v-if="isInvited"
          height="78px"
          class="person-invitation__button"
          size="large"
        >
          <span>Принять</span>
        </CButton>
        <CButton
          @click="rejectInvite"
          v-if="isInvited"
          height="78px"
          class="person-invitation__button"
          size="large"
        >
          <span>Отклонить</span>
        </CButton>
      </section>
    </section>

<section v-else-if="step === 'waiting'" class="page-chat__waiting-window">
    Ожидается подключение собеседника
    <span class="loader"></span>
</section>



    <section v-else-if="step === 'chat'" class="page-chat__chat-window">
      <CChatWindow
        title="Ваш собеседник"
        :messages="messages"
        @sendMessage="sendMessage"
        @sendFile="sendFileHandler"
        @sendAllFiles="sendFileHandler"
        :meId="peer?.id"
        @call="onCall"
      />
      <CVideoCall
        :visible="showCall"
        :incoming="callState === 'incoming'"
        :accepted="callState === 'active'"
        :callStatusText="callStatusText"
        @accept="onAcceptCall"
        @decline="onDeclineCall"
        @end="onEndCall"
        @toggleMic="onToggleMic"
        @toggleCam="onToggleCam"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, computed } from "vue";
import CVideoCall from '~/components/CChat/CVideoCall.vue'

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  read?: boolean;
  type?: string;
  fileUrl?: string;
  fileName?: string;
}

const step = shallowRef<"invite" | "waiting" | "chat">("invite");
const route = useRoute();
const linkBlock = ref<HTMLElement | null>(null);
const copying = ref(false);
const sessionId = route.params.id as string;
const isInvited = ref(route.query.invited);
const fixedHeight = ref<number | null>(null);
const animating = ref(false);
const displayText = ref(getInviteLink());

const { messages, initPeer, sendMessage, sendFile, sendAllFiles, peer, isConnectionEstablished, callState, localStream, remoteStream, startCall, acceptCall, declineCall, endCall, callType, toggleCamera, toggleMic } = usePeer(
  sessionId,
  !isInvited.value
);

function getInviteLink() {
  if (!window) return "Генерируем ссылку...";
  return `${window.location.href}?invited=true`;
}

async function copy() {
  if (copying.value) return; // Если уже копируем — выходим

  copying.value = true;     // Блокируем кнопку

  if (!linkBlock.value) {
    copying.value = false;   // Если нет блока, разблокируем и выходим
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
          copying.value = false;  // Разблокируем кнопку после окончания анимации
        }, 1000);
      }
    }, 50);
  }, 300);
}


function goToChat() {
  initPeer();
  step.value = "waiting";
}

function rejectInvite() {
  navigateTo("/");
}

function sendFileHandler(payload: any) {
  console.log('[id.vue] sendFileHandler', payload)
  // Всегда ожидаем массив файлов (даже если один файл)
  if (payload && Array.isArray(payload.files) && payload.files.length > 0) {
    console.log('[id.vue] sendFileHandler: отправка группы файлов (всегда массив)', payload.files)
    sendAllFiles(payload)
  } else {
    // fallback: возможно только текст или пустой массив
    console.warn('[id.vue] sendFileHandler: нет файлов для отправки или неизвестный payload', payload)
  }
}

const showCall = ref(false)
const callStatusText = computed(() => {
  if (callState.value === 'calling') return 'Звонок...'
  if (callState.value === 'incoming') return 'Входящий звонок'
  if (callState.value === 'active') return 'Видеозвонок'
  if (callState.value === 'ended') return 'Звонок завершён'
  return ''
})

function onCall(type: 'audio' | 'video') {
  showCall.value = true
  startCall(type === 'video')
  callType.value = type
}
function onAcceptCall(opts?: { mic?: boolean, cam?: boolean }) {
  acceptCall(callType.value === 'video')
  setTimeout(() => {
    if (opts) {
      if (localStream.value) {
        localStream.value.getAudioTracks().forEach(t => t.enabled = opts.mic !== false)
        localStream.value.getVideoTracks().forEach(t => t.enabled = opts.cam !== false)
      }
    }
  }, 500)
}
function onDeclineCall() {
  declineCall()
  showCall.value = false
}
function onEndCall() {
  endCall()
  showCall.value = false
}
function onToggleMic(enabled: boolean) {
  toggleMic(enabled)
}
function onToggleCam(enabled: boolean) {
  toggleCamera(enabled)
}

watch(callState, (val) => {
  if (val === 'idle') {
    showCall.value = false
    // Сброс UI состояния микрофона/камеры после завершения звонка
    setTimeout(() => {
      const videoComp = document.querySelector('.video-call__overlay')
      if (videoComp) {
        const micBtn = videoComp.querySelector('.video-call__controls button:nth-child(1)')
        const camBtn = videoComp.querySelector('.video-call__controls button:nth-child(2)')
        if (micBtn) micBtn.classList.remove('active')
        if (camBtn) camBtn.classList.remove('active')
      }
    }, 300)
  }
  if (val === 'calling' || val === 'incoming' || val === 'active') showCall.value = true
})

watch(isConnectionEstablished, () => {
  console.log('[id.vue] isConnectionEstablished changed', isConnectionEstablished.value)
  if (isConnectionEstablished.value) {
    step.value = "chat";
  }
});

watch([localStream, remoteStream, showCall], ([my, remote, show]) => {
  if (!show) return
  const videoComp = document.querySelector('.video-call__overlay')
  if (!videoComp) return
  const myVideo = videoComp.querySelector('.video-call__my-video') as HTMLVideoElement
  const remoteVideo = videoComp.querySelector('.video-call__remote-video') as HTMLVideoElement
  if (myVideo && my) myVideo.srcObject = my
  if (remoteVideo && remote) remoteVideo.srcObject = remote
})
</script>

<style scoped lang="scss">
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.page-chat {
  height: 100vh;
  min-height: max-content;
  width: 100vw;
  background: var(--app-purple-gradient-bg);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  .person-invitation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;

    &__content {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 128px;
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
      color: var(--app-text-primary);
      max-width: 800px;
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
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      width: 320px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      color: var(--app-text-primary);
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      word-break: break-word;
      transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
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
      margin-top: 10vh;
      @media screen and (max-width: $app-mobile) {
        margin-top: 5vh;
      }
      @media screen and (max-width: $app-narrow-mobile) {
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
      .person-invitation__button {
        width: fit-content;

        span {
          font-size: 22px;
        }
      }
    }
  }

  &__waiting-window {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--app-text-primary);
    font-size: 18px;
        display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  &__chat-window {
    width: 960px;
    max-width: 100%;
    position: absolute;
    top: 50%;
        height: calc(100% - 48px);
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 24px;
    overflow: hidden;
    @media screen and (max-width: $app-laptop) {
      height: 100vh;
      width: 100vw;
      border-radius: 0;
    }
  }
}
.loader {
  box-sizing: border-box;
  display: inline-block;
  width: 50px;
  height: 80px;
  border-top: 5px solid var(--app-text-primary);;
  border-bottom: 5px solid var(--app-text-primary);;
  position: relative;
  background: linear-gradient(var(--app-purple-500) 30px, transparent 0) no-repeat;
  background-size: 2px 40px;
  background-position: 50% 0px;
  animation: spinx 5s linear infinite;
}
.loader:before, .loader:after {
  content: "";
  width: 40px;
  left: 50%;
  height: 35px;
  position: absolute;
  top: 0;
  transform: translatex(-50%);
  background: rgba(255, 255, 255, 0.4);
  border-radius: 0 0 20px 20px;
  background-size: 100% auto;
  background-repeat: no-repeat;
  background-position: 0 0px;
  animation: lqt 5s linear infinite;
}
.loader:after {
  top: auto;
  bottom: 0;
  border-radius: 20px 20px 0 0;
  animation: lqb 5s linear infinite;
}
@keyframes lqt {
  0%, 100% {
    background-image: linear-gradient(var(--app-purple-500) 40px, transparent 0);
    background-position: 0% 0px;
  }
  50% {
    background-image: linear-gradient(var(--app-purple-500) 40px, transparent 0);
    background-position: 0% 40px;
  }
  50.1% {
    background-image: linear-gradient(var(--app-purple-500) 40px, transparent 0);
    background-position: 0% -40px;
  }
}
@keyframes lqb {
  0% {
    background-image: linear-gradient(var(--app-purple-500) 40px, transparent 0);
    background-position: 0 40px;
  }
  100% {
    background-image: linear-gradient(var(--app-purple-500) 40px, transparent 0);
    background-position: 0 -40px;
  }
}
@keyframes spinx {
  0%, 49% {
    transform: rotate(0deg);
    background-position: 50% 36px;
  }
  51%, 98% {
    transform: rotate(180deg);
    background-position: 50% 4px;
  }
  100% {
    transform: rotate(360deg);
    background-position: 50% 36px;
  }
}
    
</style>
