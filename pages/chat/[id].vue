<template>
  <main class="chat-page" aria-label="Чат">
    <section
      v-if="step === 'invite'"
      class="chat-invitation"
      aria-labelledby="chat-invitation-title"
    >
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

    <section
      v-else-if="step === 'waiting'"
      class="chat-waiting"
      aria-label="Ожидание подключения собеседника"
    >
      <div class="waiting-shell">
        <div class="console-window-wrapper">
          <div class="console-window">
            <p class="console-line" v-for="(msg, i) in consoleLogs" :key="i">&gt; {{ msg }}</p>
            <div v-if="!consoleFinished" class="console-line blink">|</div>
            <div v-if="consoleFinished && !isConnectionEstablished" class="console-line">
              &gt; STATUS: Waiting{{ ".".repeat(waitingDots) }}{{ " ".repeat(3 - waitingDots) }}
            </div>
          </div>
        </div>
        <div class="snake-wrapper">
          <Snake v-show="consoleFinished" />
        </div>
      </div>
    </section>

    <section
      v-else-if="step === 'chat'"
      class="chat-window"
      aria-label="Окно чата"
      :class="{
        'chat-window--call-show': showCall,
        'chat-window--chat-show': showChat,
      }"
    >
      <div class="room-data" :class="{ 'room-data--compact': !roomDataExpanded }">
        <header class="room-data__header">
          <NuxtImg
            class="room-data__compact-img"
            src="/icons/chat/room/info.svg"
            width="32px"
          ></NuxtImg>
          <h2 class="room-data__title">Данные комнаты</h2>
        </header>
        <section class="room-data__body">
          <div class="room-data__block">
            <NuxtImg
              class="room-data__compact-img"
              src="/icons/chat/room/door.svg"
              width="32px"
            ></NuxtImg>
            <h3 class="room-data__block-title">О комнате</h3>
            <div class="room-data__block-info">
              <ul class="room-data__block-list">
                <li class="room-data__block-item">
                  <div class="room-data__block-label">ID</div>
                  <div class="room-data__block-value">{{ roomData.room?.id }}</div>
                </li>
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Дата создания</div>
                  <div class="room-data__block-value">
                    {{ formatUTCDateIntl(roomData.room?.dateCreated) }}
                  </div>
                </li>
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Дата изменения</div>
                  <div class="room-data__block-value">
                    {{ formatUTCDateIntl(roomData.room?.dateUpdated) }}
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div class="room-data__block">
            <NuxtImg
              class="room-data__compact-img"
              src="/icons/chat/room/people.svg"
              width="32px"
            ></NuxtImg>
            <h3 class="room-data__block-title">Участники</h3>
            <div class="room-data__block-info">
              <ul class="room-data__block-list">
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Вы</div>
                  <div class="room-data__block-value">
                    <div
                      class="circle-state"
                      :class="{
                        'circle-state--active': true,
                        'circle-state--error': false,
                      }"
                    ></div>
                    {{ roomData.members?.yourStatus }}
                  </div>
                </li>
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Собеседник</div>
                  <div class="room-data__block-value">
                    <div
                      class="circle-state"
                      :class="{
                        'circle-state--active': true,
                        'circle-state--error': false,
                      }"
                    ></div>
                    {{ roomData.members?.companionStatus }}
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div class="room-data__block">
            <NuxtImg
              class="room-data__compact-img"
              src="/icons/chat/room/network.svg"
              width="32px"
            ></NuxtImg>
            <h3 class="room-data__block-title">Сеть</h3>
            <div class="room-data__block-info">
              <ul class="room-data__block-list">
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Подключение</div>
                  <div class="room-data__block-value">
                    <div
                      class="circle-state"
                      :class="{
                        'circle-state--active': true,
                        'circle-state--error': false,
                      }"
                    ></div>
                    {{ roomData.network?.connectionStatus }}
                  </div>
                </li>
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Отправлено</div>
                  <div class="room-data__block-value">
                    {{ formatBytesToMB(roomData.network?.sentBytes) }} MB
                  </div>
                </li>
                <li class="room-data__block-item">
                  <div class="room-data__block-label">Получено</div>
                  <div class="room-data__block-value">
                    {{ formatBytesToMB(roomData.network?.receivedBytes) }} MB
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
        <footer class="room-data__footer">
          <div @click="endSession">
            <NuxtImg
              class="room-data__footer-end-session room-data__compact-img"
              src="/icons/chat/room/power_off.svg"
              width="32px"
            ></NuxtImg>
            <CButton
              class="room-data__footer-button"
              variant="quaternary"
              textColor="var(--color-negative-on-text)"
              >Завершить сеанс</CButton
            >
          </div>
          <NuxtImg
            @click="roomDataExpanded = !roomDataExpanded"
            class="room-data__footer-expand"
            src="/icons/chat/room/arrow_expand_right.svg"
            width="32px"
          ></NuxtImg>
        </footer>
      </div>
      <div v-show="showCall" class="call-wrapper">
        <CChatVideoCall
          :visible="showCall"
          :incoming="callState === 'incoming'"
          :accepted="callState === 'active'"
          :callStatusText="callStatusText"
          :local-stream="localStream"
          :remote-stream="remoteStream"
          :cam-enabled="isCameraEnabled"
          :mic-enabled="isMicEnabled"
          @minimize="onMinimizeVideoCall"
          @accept="onAcceptCall"
          @decline="onDeclineCall"
          @end="onEndCall"
          @toggleMic="onToggleMic"
          @toggleCam="onToggleCam"
        >
          <template #headerButtons>
            <CButton
              @click="swapToChat"
              bgColor="transparent"
              variant="icon-default"
              class="form__send"
              size="large"
              icon-size="i-large"
              ><NuxtImg src="/icons/chat/swap_to_chat.svg" width="48px"></NuxtImg
            ></CButton>
          </template>
        </CChatVideoCall>
      </div>
      <div v-show="showChat" class="chat-wrapper">
        <CChatWindow
          title="Собеседник"
          :messages="messages"
          @sendMessage="sendMessage"
          :hide-header="false"
          @sendAllFiles="sendFileHandler"
          @readMessage="readMessage"
          :meId="peer?.id || ''"
          @call="onCall"
          :isVideoCallMinimized="isVideoCallMinimized"
        >
          <template #headerButtons>
            <div v-if="callState === 'active'" class="chat-header-buttons-wrapper">
              <CButton
                @click="swapToCall"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/swap_to_call.svg" width="48px"></NuxtImg
              ></CButton>
            </div>
          </template>
        </CChatWindow>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const route = useRoute();
definePageMeta({
  header: false,
});
const step = shallowRef<"invite" | "waiting" | "chat">("invite");
const linkBlock = ref<HTMLElement | null>(null);
const consoleLogs = ref<string[]>([]);
const roomDataExpanded = shallowRef(true);
const waitingDots = shallowRef(0);
let waitingInterval: number | null = null;
let loadingStopped = false;
const consoleFinished = ref(false);
const copying = shallowRef(false);
const sessionId = route.params.id as string;
const isInvited = shallowRef(route.query.invited);
const fixedHeight = shallowRef<number | null>(null);
const animating = shallowRef(false);
const displayText = shallowRef(getInviteLink());
const showCall = ref(false);
const showChat = ref(true);
const isVideoCallMinimized = ref(false);
const {
  messages,
  initPeer,
  sendMessage,
  sendAllFiles,
  readMessage,
  peer,
  conn,
  roomData,
  isConnectionEstablished,
  callState,
  localStream,
  remoteStream,
  startCall,
  acceptCall,
  declineCall,
  endCall,
  callType,
  toggleCamera,
  toggleMic,
} = usePeer(sessionId, !isInvited.value);
const callStatusText = computed(() => {
  if (callState.value === "calling") return "Звоним собеседнику...";
  if (callState.value === "incoming") return "Входящий звонок";
  if (callState.value === "active") return "Идёт звонок";
  if (callState.value === "ended") return "Звонок завершён";
  return "";
});
const isCameraEnabled = computed(() => {
  if (!localStream.value) return false;
  return localStream.value.getVideoTracks().some((t) => t.enabled);
});
const isMicEnabled = computed(() => {
  if (!localStream.value) return false;
  return localStream.value.getAudioTracks().some((t) => t.enabled);
});
function getInviteLink() {
  if (!window) return "Генерируем ссылку...";
  return `${window.location.href}?invited=true`;
}
function swapToCall() {
  showChat.value = false;
  showCall.value = true;
}
function swapToChat() {
  showChat.value = true;
  showCall.value = false;
}
const formatUTCDateIntl = (date: string) => {
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date(date));
};
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
  initPeer();
  step.value = "waiting";
  peer.value?.on("open", (id: string) => {
    consoleLogs.value.push(`OPEN: Peer open with id ${id}`);
  });
  const LOADING_MESSAGES = [
    `DOMAIN: ${window.location.host}`,
    `INIT: sessionId ${sessionId}, ${isInvited.value ? "invited" : "initiator"}`,
    "CONFIG: secure",
    !isInvited.value
      ? "LISTEN: waiting for incoming connections…"
      : `CONNECT: dialing peer ${sessionId}…`,
    "WHILE_LOADING: snake.exe",
    "LAUNCH: game-module",
  ];
  let idx = 0;
  loadingStopped = false;
  const tick = () => {
    if (loadingStopped) return;
    if (idx < LOADING_MESSAGES.length) {
      consoleLogs.value.push(LOADING_MESSAGES[idx++]);
      setTimeout(tick, 800);
    } else {
      setTimeout(() => {
        consoleFinished.value = true;
        waitingDots.value = 0;
        if (waitingInterval) clearInterval(waitingInterval);
        waitingInterval = window.setInterval(() => {
          waitingDots.value = (waitingDots.value + 1) % 4;
        }, 500);
      }, 500);
    }
  };
  tick();
}
function rejectInvite() {
  navigateTo("/");
}

function sendFileHandler(payload: any) {
  if (payload && Array.isArray(payload.files) && payload.files.length > 0) {
    sendAllFiles(payload);
  }
}

function onCall(type: "audio" | "video") {
  showCall.value = true;
  startCall(type === "video");
  callType.value = type;
}
function onMinimizeVideoCall(state: boolean) {
  isVideoCallMinimized.value = state;
}
function onAcceptCall(opts?: { mic?: boolean; cam?: boolean }) {
  acceptCall({ cam: callType.value === "video" });
  setTimeout(() => {
    if (opts && localStream.value) {
      localStream.value.getAudioTracks().forEach((t) => {
        t.enabled = opts.mic !== false;
      });
      localStream.value.getVideoTracks().forEach((t) => {
        t.enabled = opts.cam !== false;
      });
    }
  }, 500);
}

function onDeclineCall() {
  declineCall();
  showCall.value = false;
}

function onEndCall() {
  endCall();
  showCall.value = false;
}

function onToggleMic(enabled: boolean) {
  toggleMic(enabled);
}

function onToggleCam(enabled: boolean) {
  toggleCamera(enabled);
}

watch(callState, (val) => {
  if (val === "idle") {
    showCall.value = false;
    setTimeout(() => {
      const videoComp = document.querySelector(".video-call");
      if (videoComp) {
        const micBtn = videoComp.querySelector(
          ".video-call__controls button:nth-child(1)",
        );
        const camBtn = videoComp.querySelector(
          ".video-call__controls button:nth-child(2)",
        );
        micBtn?.classList.remove("active");
        camBtn?.classList.remove("active");
      }
    }, 300);
  }
  if (["calling", "incoming", "active"].includes(val)) showCall.value = true;
});
const formatBytesToMB = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(2);
};
function checkCallChatVisibilitySwap() {
  if (window.innerWidth > 1384) {
    if (["calling", "incoming", "active"].includes(callState.value)) {
      showCall.value = true;
    }
    showChat.value = true;
  }
}
const endSession = () => {
  if (conn.value) {
    conn.value.close();
  }
  if (peer.value) {
    peer.value.destroy();
  }
  navigateTo("/");
};
watch(isConnectionEstablished, () => {
  if (isConnectionEstablished.value) {
    loadingStopped = true;
    if (waitingInterval) {
      clearInterval(waitingInterval);
      waitingInterval = null;
    }
    consoleLogs.value.push("STATUS: connection established");
    let countdown = 3;
    const countdownMessages = ["Initializing..."];
    let countdownIdx = 0;
    const showCountdown = () => {
      if (countdownIdx < countdownMessages.length) {
        consoleLogs.value.push(countdownMessages[countdownIdx++]);
        setTimeout(showCountdown, 800);
      } else if (countdown > 0) {
        consoleLogs.value.push(`Countdown: ${countdown} s.`);
        countdown--;
        setTimeout(showCountdown, 1000);
      } else {
        consoleLogs.value.push("Connection established!");
        step.value = "chat";
      }
    };
    showCountdown();
    const t0 = Date.now();
    conn.value!.send({ type: "ping", t0 });
    conn.value!.on("data", (data: any) => {
      if (data.type === "ping") {
        const latency = Date.now() - t0;
        consoleLogs.value.push(`PING: ${latency} ms`);
      }
    });
  }
});
watch(
  () => showCall.value,
  (val) => {
    if (val) {
      roomDataExpanded.value = false;
    }
  },
);
watch([localStream, remoteStream, showCall], ([my, remote, show]) => {
  if (!show) return;
  const videoComp = document.querySelector(".video-call");
  if (!videoComp) return;
  const myVideo = videoComp.querySelector(
    ".video-call__my-video",
  ) as HTMLVideoElement;
  const remoteVideo = videoComp.querySelector(
    ".video-call__remote-video",
  ) as HTMLVideoElement;
  if (myVideo && my) myVideo.srcObject = my;
  if (remoteVideo && remote) remoteVideo.srcObject = remote;
});
onMounted(() => {
  window.addEventListener("resize", checkCallChatVisibilitySwap);
});
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

  .chat-waiting {
    color: var(--app-text-primary);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    padding: 24px;
    @media screen and (max-width: $app-mobile) {
      position: static;
      transform: translate(0, 0);
    }
    .waiting-shell {
      display: flex;
      flex-wrap: wrap;
      gap: 72px;
      width: max-content;
      max-width: 100%;
      align-items: center;
      justify-content: center;
      @media screen and (max-width: $app-mobile) {
        flex-direction: column;
      }
      .console-window-wrapper {
        display: flex;
        align-items: center;
        max-width: 100%;
        height: calc(100vh - 48px);
      }
      .console-window {
        width: 400px;
        max-width: 100%;
        overflow-wrap: anywhere;
        padding: 16px;
        background: var(--color-bg-on-secondary);
        border: 1px solid var(--color-neutral-on-outline);
        height: 400px;
        overflow-y: auto;
      }
      .console-line {
        font-family: "Courier New", monospace;
        color: var(--color-primary-on-text);
        margin: 0;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      .blink {
        animation: blink 1s steps(1) infinite;
      }

      .snake-wrapper {
        position: relative;
        max-width: 100%;
        height: calc(100vh - 48px);
      }
    }
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  .chat-window {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    .chat-wrapper,
    .call-wrapper {
      width: 100%;
      height: 100%;
      .chat-header-buttons-wrapper {
        display: none;
      }
      @media screen and (max-width: $app-desktop) {
        height: 100vh;
        flex-shrink: 0;
        .chat-header-buttons-wrapper {
          display: block;
        }
      }
    }
    @media screen and (max-width: $app-desktop) {
      height: max-content;
      flex-direction: column;
    }
    .room-data {
      display: flex;
      flex-direction: column;
      width: 582px;
      flex-shrink: 0;
      overflow: hidden;
      white-space: nowrap;
      border-right: 1px solid var(--color-neutral-on-outline);
      will-change: width;
      transition: width 0.3s ease;
      padding-bottom: 24px;
      @media screen and (max-width: $app-desktop) {
        order: 3;
        width: 100%;
        height: 100vh;
        &__footer-expand {
          display: none;
        }
      }
      .room-data__compact-img {
        display: none;
      }
      @media screen and (min-width: $app-desktop) {
        &--compact {
          width: 92px;
          .room-data__block-info,
          .room-data__block-title,
          .room-data__footer-button,
          .room-data__title {
            display: none;
          }
          .room-data__compact-img {
            display: block;
          }
          .room-data__body,
          .room-data__header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
          }
          .room-data__footer-expand {
            transform: rotate(-180deg);
          }
          .room-data__footer-end-session,
          .room-data__footer-expand {
            cursor: pointer;
          }
        }
      }
      &__header {
        background-color: var(--color-bg-on-primary);
        padding: 24px;
        .room-data__title {
          color: var(--color-primary-on-text);
          font-size: 32px;
        }
      }
      &__body {
        display: flex;
        gap: 8px;
        flex-direction: column;
        .room-data__block {
          display: flex;
          gap: 12px;
          flex-direction: column;
          .room-data__block-title {
            padding: 12px;
            color: var(--color-primary-on-text);
            font-size: 18px;
            border-bottom: 1px solid var(--color-neutral-on-outline);
          }
          .room-data__block-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            .room-data__block-item {
              display: flex;
              gap: 24px;
              .room-data__block-label {
                font-size: 16px;
                width: 160px;
                padding: 12px;
                color: var(--color-neutral-on-text);
              }
              .room-data__block-value {
                display: flex;
                gap: 8px;
                align-items: center;
                font-size: 14px;
                padding: 12px;
                color: var(--color-neutral-on-muted);
              }
            }
          }
        }
      }
      .room-data__footer {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        justify-content: center;
        align-items: center;
        margin-top: 48px;
      }
      &__footer-expand {
        margin-top: auto;
        margin-left: 24px;
        margin-right: auto;
        cursor: pointer;
        transition: transform 0.3s ease;
      }
    }
    @media screen and (max-width: $app-desktop) {
      &--call-show {
        .chat-wrapper {
          display: none;
        }
      }
    }
  }
  .circle-state {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    &--active {
      background-color: var(--color-positive-on-fill);
    }
    &--error {
      background-color: var(--color-negative-on-fill);
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
