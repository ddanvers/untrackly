<template>
  <main class="chat-page" aria-label="Чат">
    <section
      v-if="showConnectionLoader"
      class="connection-loader"
      aria-label="Восстановление соединения"
    >
      <div class="connection-loader__content">
        <h2 class="connection-loader__title">Восстановление соединения</h2>
        <p class="connection-loader__message">
          {{ connectionLoaderMessage }}
        </p>
        <div class="connection-loader__spinner">
          <div class="spinner-ring"></div>
        </div>
      </div>
    </section>
    <section
      v-if="step === 'waiting'"
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
          :hide-header="false"
          :meId="useDeviceId() || ''"
          @sendMessage="sendMessage"
          @editMessage="editMessage"
          @readMessage="readMessage"
          @deleteMessage="deleteMessage"
          @call="onCall"
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
const step = shallowRef<"waiting" | "chat">(
  route.query.chatting ? "chat" : "waiting",
);
const consoleLogs = ref<string[]>([]);
const roomDataExpanded = shallowRef(true);
const waitingDots = shallowRef(0);
let waitingInterval: number | null = null;
let loadingStopped = false;
const consoleFinished = ref(false);
const sessionId = route.params.id as string;
const isInvited = shallowRef(route.query.invited);
const displayText = shallowRef("Генерируем ссылку...");
const showCall = ref(false);
const showChat = ref(true);

const callingAudio = import.meta.client
  ? new Audio("/sounds/calling.mp3")
  : null;
if (callingAudio) {
  callingAudio.loop = true;
  callingAudio.preload = "auto";
}
const establishedAudio = import.meta.client
  ? new Audio("/sounds/call_established.mp3")
  : null;
if (establishedAudio) {
  establishedAudio.preload = "auto";
}
const endedAudio = import.meta.client
  ? new Audio("/sounds/call_ended.mp3")
  : null;
if (endedAudio) {
  endedAudio.preload = "auto";
}
let isCallingPlaying = false;

const {
  messages,
  initPeer,
  sendMessage,
  editMessage,
  deleteMessage,
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
const sessionDB = useSessionDB(sessionId);
const showConnectionLoader = ref(false);
const connectionLoaderMessage = ref("Пытаемся восстановить соединение...");
const callStatusText = ref("");

const isCameraEnabled = computed(() => {
  if (!localStream.value) return false;
  return localStream.value.getVideoTracks().some((t) => t.enabled);
});
const isMicEnabled = computed(() => {
  if (!localStream.value) return false;
  return localStream.value.getAudioTracks().some((t) => t.enabled);
});
function getInviteLink() {
  return `${window?.location.href}?invited=true`;
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

function startConnectionLoader(
  message = "Пытаемся восстановить соединение...",
) {
  showConnectionLoader.value = true;
  connectionLoaderMessage.value = message;
}

function stopConnectionLoader() {
  showConnectionLoader.value = false;
}
function initChat() {
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

watch(
  () => roomData.value.network.connectionStatus,
  (status) => {
    checkConnection(status);
  },
  { immediate: true },
);
function checkConnection(status: string) {
  if (step.value === "chat") {
    if (status === "connecting" || status === "reconnecting") {
      startConnectionLoader("Пытаемся восстановить соединение...");
    } else if (status === "failed") {
      startConnectionLoader("Соединение потеряно, восстанавливаем...");
    } else if (status === "connected") {
      stopConnectionLoader();
    } else if (status === "disconnected") {
      startConnectionLoader("Соединение разорвано, переподключаемся...");
    }
  }
}

function onCall(type: "audio" | "video") {
  showCall.value = true;
  startCall(type === "video");
  callType.value = type;
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
        navigateTo({
          path: `/chat/${sessionId}`,
          query: { invited: isInvited.value, chatting: "true" },
          replace: true,
        });
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
function stopCallingLoop() {
  if (isCallingPlaying) {
    if (callingAudio) {
      callingAudio.pause();
      callingAudio.currentTime = 0;
    }

    isCallingPlaying = false;
  }
}

function stopAll() {
  stopCallingLoop();
  if (establishedAudio) {
    establishedAudio.pause();
    establishedAudio.currentTime = 0;
  }
  if (endedAudio) {
    endedAudio.pause();
    endedAudio.currentTime = 0;
  }
}

async function safePlay(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    await audio.play();
  } catch (e) {
    console.error(e);
  }
}

watch(
  () => callState.value,
  (newVal) => {
    if (newVal === "calling") {
      callStatusText.value = "Звоним собеседнику...";
      if (!isCallingPlaying) {
        stopAll();
        isCallingPlaying = true;
        safePlay(callingAudio);
      }
      return;
    }
    if (newVal === "incoming") {
      callStatusText.value = "Входящий звонок";
      if (!isCallingPlaying) {
        stopAll();
        isCallingPlaying = true;
        safePlay(callingAudio);
      }
      return;
    }
    if (newVal === "active") {
      callStatusText.value = "Идёт звонок";
      stopCallingLoop();
      if (establishedAudio) {
        establishedAudio.currentTime = 0;
      }
      safePlay(establishedAudio);
      return;
    }
    if (newVal === "ended") {
      callStatusText.value = "Звонок завершён";
      stopCallingLoop();
      if (endedAudio) {
        endedAudio.currentTime = 0;
      }
      safePlay(endedAudio);
      return;
    }
    stopAll();
  },
  { immediate: true },
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
  displayText.value = getInviteLink();
  window.addEventListener("resize", checkCallChatVisibilitySwap);
  (async () => {
    try {
      await sessionDB.openDB();
      const saved = await sessionDB.load();
      console.log(saved);
      if (saved && saved.step === "chat") {
        try {
          if (messages && typeof (messages as any).value !== "undefined") {
            (messages as any).value = saved.messages || [];
          }
        } catch (err) {}
        step.value = "chat";
        showChat.value = true;
        showCall.value = false;
        consoleFinished.value = true;
        loadingStopped = true;
        waitingDots.value = 0;
        consoleLogs.value.push("RESTORE: session restored from IndexedDB");

        // Параллельно (незаметно) пытаемся реинициализировать peer для восстановления соединения
        // (не меняем UI — пользователь уже в chat)
        setTimeout(() => {
          try {
            initPeer({ reconnect: true });
            navigateTo({
              path: `/chat/${sessionId}`,
              query: { invited: isInvited.value, chatting: "true" },
              replace: true,
            });
          } catch (e) {
            // best-effort
          }
        }, 50);
      } else {
        initChat();
      }
    } catch (err) {
      // noop — best-effort восстановление
    }
  })();
});
onBeforeUnmount(async () => {
  window.removeEventListener("resize", checkCallChatVisibilitySwap);
  // не удаляем sessionStorage тут — sessionStorage сохраняет вкладку при reload
  // если компонент размонтируется (навигация) — очищаем БД (пользователь ушёл)
  try {
    // если уходим не в рамках активного чата — удаляем сохранение
    if (step.value !== "chat") {
    } else {
      // при навигации внутри приложения (onBeforeUnmount) — также сохраняем текущее состояние
      await sessionDB.save({
        step: step.value,
        messages: Array.isArray((messages as any).value)
          ? (messages as any).value
          : [],
      });
    }
  } catch (err) {}
});
watch(
  messages as any,
  () => {
    if (step.value === "chat") {
      try {
        sessionDB.save({
          step: step.value,
          messages: Array.isArray((messages as any).value)
            ? (messages as any).value
            : [],
        });
      } catch (err) {}
    }
  },
  { deep: true },
);

watch(step, (val) => {
  if (val !== "chat") {
  } else {
    window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
      if (step.value === "chat") {
        // сохраняем состояние в IndexedDB (асинхронно — best-effort)
        try {
          sessionDB.save({
            step: step.value,
            messages: Array.isArray((messages as any).value)
              ? (messages as any).value
              : [],
          });
        } catch (err) {}
        // показываем стандартный диалог предупреждения
        e.preventDefault();
        e.returnValue = "";
      }
    });
    sessionDB
      .save({
        step: step.value,
        messages: Array.isArray((messages as any).value)
          ? (messages as any).value
          : [],
      })
      .catch(() => {});
  }
});

// 5) В endSession() добавляем очистку БД
const endSession = async () => {
  if (conn.value) {
    conn.value.close();
  }
  if (peer.value) {
    peer.value.destroy();
  }
  try {
    await sessionDB.clearAll();
  } catch (err) {}
  navigateTo("/");
};
onBeforeUnmount(() => {
  stopAll();
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
  .connection-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(var(--color-bg-on-secondary-rgb, 0, 0, 0), 0.95);
    backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;

    &__content {
      text-align: center;
      color: var(--color-primary-on-text);
      max-width: 400px;
      padding: 24px;
    }

    &__spinner {
      margin: 0 auto 24px;
      width: 60px;
      height: 60px;
      position: relative;

      .spinner-ring {
        width: 60px;
        height: 60px;
        border: 4px solid var(--color-neutral-on-outline);
        border-top: 4px solid var(--color-primary-on-fill);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    &__title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--color-primary-on-text);
    }

    &__message {
      font-size: 16px;
      color: var(--color-neutral-on-text);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    &__dots {
      display: flex;
      justify-content: center;
      gap: 8px;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-neutral-on-outline);
        transition: background-color 0.3s ease;

        &.active {
          background: var(--color-primary-on-fill);
        }
      }
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
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
