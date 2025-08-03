<template>
  <main class="chat-page" aria-label="Чат">
    <section
      v-if="step === 'invite'"
      class="chat-invitation"
      aria-labelledby="chat-invitation-title"
    >
      <header class="chat-invitation__header">
        <h1 id="chat-invitation-title" class="chat-invitation__title">
          Приглашение в закрытый чат
        </h1>
      </header>
      <section v-if="!isInvited" class="chat-invitation__content" aria-label="Поделиться ссылкой">
        <h2 class="visually-hidden">Поделиться ссылкой</h2>
        <p class="chat-invitation__hint">
          Поделитесь пригласительной ссылкой с участником чата любым удобным для вас способом
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
          <li v-if="!isInvited">
            <CButton
              @click="goToChat"
              class="chat-invitation__button"
              size="extra-large"
              :aria-label="'Перейти в чат'"
            >
              <span>Перейти в чат</span>
            </CButton>
          </li>
          <li v-if="isInvited">
            <CButton
              @click="goToChat"
              class="chat-invitation__button"
              size="extra-large"
              :aria-label="'Принять приглашение'"
            >
              <span>Принять</span>
            </CButton>
          </li>
          <li v-if="isInvited">
            <CButton
              @click="rejectInvite"
              class="chat-invitation__button chat-invitation__button--secondary"
              size="extra-large"
              variant="secondary"
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
        <!-- левая колонка: логи консоли -->
        <div class="console-window">
          <p class="console-line" v-for="(msg, i) in consoleLogs" :key="i">&gt; {{ msg }}</p>
          <div v-if="!consoleFinished" class="console-line blink">|</div>
        </div>

        <!-- правая колонка: само поле со змейкой -->
        <div class="snake-wrapper">
          <Snake v-show="consoleFinished" />
        </div>
      </div>
    </section>

    <section v-else-if="step === 'chat'" class="chat-window" aria-label="Окно чата">
      <CChatWindow
        title="Собеседник"
        :messages="messages"
        @sendMessage="sendMessage"
        @sendAllFiles="sendFileHandler"
        @readMessage="readMessage"
        :meId="peer?.id || ''"
        @call="onCall"
        :isVideoCallMinimized="isVideoCallMinimized"
      />
      <CChatVideoCall
        :visible="showCall"
        :incoming="callState === 'incoming'"
        :accepted="callState === 'active'"
        :callStatusText="callStatusText"
        @minimize="onMinimizeVideoCall"
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
const route = useRoute();
definePageMeta({
  header: false,
});
const step = shallowRef<"invite" | "waiting" | "chat">("invite");
const linkBlock = ref<HTMLElement | null>(null);
const consoleLogs = ref<string[]>([]);
const consoleFinished = ref(false);
const LOADING_MASSAGES = [
  "BOOT: CHATTOR-OS v1.4",
  "LOADING MODULE proxy-server.dll… OK",
  "PING peer.network… TIME=000ms",
  "AWAITING HANDSHAKE FROM REMOTE NODE",
  "LOADING snake.exe…",
  "snake.exe INITIALIZED",
  "LAUNCHING GAME-MODULE…",
];
const copying = shallowRef(false);
const sessionId = route.params.id as string;
const isInvited = shallowRef(route.query.invited);
const fixedHeight = shallowRef<number | null>(null);
const animating = shallowRef(false);
const displayText = shallowRef(getInviteLink());
const showCall = ref(false);
const isVideoCallMinimized = ref(false);
const {
  messages,
  initPeer,
  sendMessage,
  sendAllFiles,
  readMessage,
  peer,
  conn,
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
  // 1. Инициализируем пир
  initPeer();
  step.value = "waiting";

  // 2. Как только peer открылся — сохраняем его ID
  peer.value?.on("open", (id: string) => {
    consoleLogs.value.push(`OPEN: peer.on("open"): id=${id}`);
  });

  // 4. Собираем шаблон логов с плейсхолдерами
  const LOADING_MESSAGES = [
    "DOMAIN: untrackly.com",
    `INIT: sessionId="${sessionId}", ${isInvited.value ? "invited" : "initiator"}`,
    "CONFIG: peerjs-server-gims.onrender.com (secure)",
    !isInvited.value
      ? "LISTEN: waiting for incoming connections…"
      : "CONNECT: dialing peer ${sessionId}…",
    // дальше будет OPEN и STATUS и PING из событий выше
    "LOAD: snake.exe",
    "READY: snake.exe",
    "LAUNCH: game-module",
  ];

  // 5. «Печатаем» всё с таймингом
  let idx = 0;
  const tick = () => {
    if (idx < LOADING_MESSAGES.length) {
      consoleLogs.value.push(LOADING_MESSAGES[idx++]);
      setTimeout(tick, 800);
    } else {
      // ждем, пока все события (open, open-conn, ping) попадут в логи...
      // и через короткую задержку запускаем змейку
      setTimeout(() => {
        consoleFinished.value = true;
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

watch(isConnectionEstablished, () => {
  if (isConnectionEstablished.value) {
    consoleLogs.value.push("STATUS: connection established");
    // простейший «ping»
    const t0 = Date.now();
    conn.value!.send({ type: "ping", t0 });
    conn.value!.on("data", (data: any) => {
      if (data.type === "pong" && data.t0 === t0) {
        const latency = Date.now() - t0;
        consoleLogs.value.push(`PING: ${latency} ms`);
      }
    });
    // step.value = "chat";
  }
});

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
  padding: 24px;
  @media screen and (max-width: $app-laptop) {
    padding: 12px;
  }
  .chat-invitation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
    &__header {
      margin-bottom: 8px;
      text-align: center;
    }

    &__title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-primary-on-text);
      margin: 0;
    }

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
      margin-top: 10vh;
      @media screen and (max-width: $app-mobile) {
        margin-top: 5vh;
      }
      @media screen and (max-width: $app-narrow-mobile) {
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
      .chat-invitation__button {
        width: fit-content;
        span {
          font-size: 20px;
        }
      }
    }

    &__actions {
      display: flex;
      gap: 40px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
  }

  .chat-waiting {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--app-text-primary);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    @media screen and (max-width: $app-mobile) {
      position: static;
      transform: translate(0, 0);
    }
    .waiting-shell {
      display: flex;
      gap: 72px;
      max-width: 100%;
      align-items: center;
      justify-content: center;
      @media screen and (max-width: $app-mobile) {
        flex-direction: column;
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
      }
    }
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  .chat-window {
    width: 960px;
    max-width: 100%;
    height: calc(100% - 48px);
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
  border-top: 5px solid var(--app-text-primary);
  border-bottom: 5px solid var(--app-text-primary);
  position: relative;
  background: linear-gradient(var(--app-pink-500) 30px, transparent 0) no-repeat;
  background-size: 2px 40px;
  background-position: 50% 0px;
  animation: spinx 5s linear infinite;
}
.loader:before,
.loader:after {
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
  0%,
  100% {
    background-image: linear-gradient(var(--app-pink-500) 40px, transparent 0);
    background-position: 0% 0px;
  }
  50% {
    background-image: linear-gradient(var(--app-pink-500) 40px, transparent 0);
    background-position: 0% 40px;
  }
  50.1% {
    background-image: linear-gradient(var(--app-pink-500) 40px, transparent 0);
    background-position: 0% -40px;
  }
}
@keyframes lqb {
  0% {
    background-image: linear-gradient(var(--app-pink-500) 40px, transparent 0);
    background-position: 0 40px;
  }
  100% {
    background-image: linear-gradient(var(--app-pink-500) 40px, transparent 0);
    background-position: 0 -40px;
  }
}
@keyframes spinx {
  0%,
  49% {
    transform: rotate(0deg);
    background-position: 50% 36px;
  }
  51%,
  98% {
    transform: rotate(180deg);
    background-position: 50% 4px;
  }
  100% {
    transform: rotate(360deg);
    background-position: 50% 36px;
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
