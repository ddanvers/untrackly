<template>
  <main class="chat-page" aria-label="Чат">
    <ChatConnectionLoader v-if="showConnectionLoader" :message="connectionLoaderMessage" />

    <ChatConsole
      v-if="step === 'waiting'"
      :logs="consoleLogs"
      :finished="consoleFinished"
      :is-connection-established="isConnectionEstablished"
      :waiting-dots="waitingDots"
    />

    <section
      v-else-if="step === 'chat'"
      class="chat-window"
      aria-label="Окно чата"
      :class="{
        'chat-window--call-show': showCall,
        'chat-window--chat-show': showChat,
      }"
    >
      <ChatRoomData
        v-if="windowWidth > 1384"
        :room-data="roomData"
        :expanded="roomDataExpanded"
        @toggleExpand="roomDataExpanded = !roomDataExpanded"
        @endSession="handleEndSession"
      />

      <div v-show="showCall" class="call-wrapper liquid-glass">
        <CChatVideoCall
          :visible="showCall"
          :incoming="callState === 'incoming'"
          :accepted="callState === 'active'"
          :callStatusText="callStatusText"
          :local-stream="localStream"
          :remote-streams="remoteStreams"
          :screen-share-stream="screenShareStream"
          :isMeScreenSharing="isMeScreenSharing"
          :cam-enabled="isCameraEnabled"
          :mic-enabled="isMicEnabled"
          :screen-share-enabled="isScreenShareEnabled"
          :screen-share-owner-id="screenShareOwnerId"
          :members="roomData.members"
          @accept="onAcceptCall"
          @decline="onDeclineCall"
          @end="onEndCall"
          @toggleMic="onToggleMic"
          @toggleCam="onToggleCam"
          @toggleScreenShare="onToggleScreenShare"
        >
          <template #headerButtons>
            <div class="chat-header-buttons-wrapper">
              <CButton
                @click="swapToRoomData"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/room/info.svg" width="32px" height="32px"></NuxtImg>
              </CButton>
              <CButton
                @click="swapToChat"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/swap_to_chat.svg" width="48px" height="32px"></NuxtImg>
              </CButton>
            </div>
          </template>
        </CChatVideoCall>
      </div>
      <div v-show="showChat" class="chat-wrapper">
        <CChatWindow
          :title="windowTitle"
          :messages="messages"
          :members="roomData.members"
          :hide-header="false"
          :meId="useDeviceId() || ''"
          @sendMessage="sendMessage"
          @editMessage="editMessage"
          @readMessage="readMessage"
          @transcribeVoiceMessage="transcribeVoiceMessage"
          @deleteMessage="deleteMessage"
          @replyToMessage="replyToMessage"
          @call="onCall"
        >
          <template #headerButtons>
            <div class="chat-header-buttons-wrapper" :class="{
            'chat-header-buttons-wrapper--active-call': callState === 'active'}">
              <CButton
                v-if="windowWidth <= 1384"
                @click="swapToRoomData"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/room/info.svg" width="32px"></NuxtImg>
              </CButton>
              <CButton
                v-if="!['active', 'calling', 'incoming'].includes(callState)"
                @click="onCall('video')"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/video.svg" width="32px"></NuxtImg>
              </CButton>
              <CButton
                v-if="!['active', 'calling', 'incoming'].includes(callState)"
                @click="onCall('audio')"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/phone.svg" width="32px"></NuxtImg>
              </CButton>
              <CButton
                v-if="callState === 'active'"
                @click="swapToCall"
                bgColor="transparent"
                variant="icon-default"
                class="form__send"
                size="large"
                icon-size="i-large"
                ><NuxtImg src="/icons/chat/swap_to_call.svg" width="48px" height="32px"></NuxtImg>
              </CButton>
            </div>
          </template>
        </CChatWindow>
      </div>
      <div v-if="showRoomData" class="room-data-wrapper">
        <CChatHeader title="Данные комнаты">
          <template #buttons>
            <CButton
              v-if="callState === 'active'"
              @click="swapToCall"
              bgColor="transparent"
              variant="icon-default"
              size="large"
              icon-size="i-large"
              ><NuxtImg src="/icons/chat/swap_to_call.svg" width="48px" height="32px"></NuxtImg>
            </CButton>
            <CButton
              @click="swapToChat"
              bgColor="transparent"
              variant="icon-default"
              size="large"
              icon-size="i-large"
              ><NuxtImg src="/icons/chat/swap_to_chat.svg" width="48px" height="32px"></NuxtImg>
            </CButton>
          </template>
        </CChatHeader>
        <ChatRoomData
          :room-data="roomData"
          :expanded="true"
          class="room-data--standalone"
          @endSession="handleEndSession"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import ChatConnectionLoader from "~/components/chat/session/ChatConnectionLoader.vue";
import ChatConsole from "~/components/chat/session/ChatConsole.vue";
import ChatRoomData from "~/components/chat/session/ChatRoomData.vue";
import { useChatAudio } from "~/composables/chat/useChatAudio";
import { useChatSession } from "~/composables/chat/useChatSession";

const route = useRoute();
definePageMeta({
  header: false,
});

const sessionId = route.params.id as string;
const isInvited = shallowRef(route.query.invited === "true");
const roomDataExpanded = shallowRef(true);
const showCall = ref(false);
const showChat = ref(true);
const showRoomData = ref(false);

const windowWidth = ref(0);

const {
  messages,
  initPeer,
  sendMessage,
  editMessage,
  deleteMessage,
  readMessage,
  replyToMessage,
  peer,
  connections, // Updated
  roomData,
  updateMember,
  isConnectionEstablished,
  callState,
  localStream,
  remoteStreams, // Updated
  screenShareStream,
  isCameraEnabled,
  isMicEnabled,
  startCall,
  acceptCall,
  declineCall,
  endCall,
  // callType, // Not exposed in new usePeer? I need to check
  toggleCamera,
  toggleScreenShare,
  isScreenShareEnabled,
  screenShareOwnerId,
  toggleMic,
} = usePeer({ sessionId, isInitiator: !isInvited.value });

// Manually track call type since usePeer simplified media somewhat
const callType = ref<"audio" | "video">("video");

const isMeScreenSharing = computed(() => {
  return isScreenShareEnabled.value; // Simplification, strictly checks if *I* enabled it
});

const {
  step,
  consoleLogs,
  consoleFinished,
  waitingDots,
  restoreSession,
  endSession,
} = useChatSession(
  sessionId,
  isInvited.value,
  messages,
  initPeer,
  isConnectionEstablished,
  roomData,
  updateMember,
);

useChatAudio(callState);

const showConnectionLoader = ref(false);
const connectionLoaderMessage = ref("Пытаемся восстановить соединение...");
const callStatusText = ref("");

const windowTitle = computed(() => {
  const count = Object.keys(roomData.value.members).length;
  if (!count) return "Чат";
  return `Чат (${count} уч.)`;
});

function swapToCall() {
  showChat.value = false;
  showCall.value = true;
  showRoomData.value = false;
}
function swapToChat() {
  showChat.value = true;
  showCall.value = false;
  showRoomData.value = false;
}

function swapToRoomData() {
  showChat.value = false;
  showCall.value = false;
  showRoomData.value = true;
}

function startConnectionLoader(
  message = "Пытаемся восстановить соединение...",
) {
  showConnectionLoader.value = true;
  connectionLoaderMessage.value = message;
}

function stopConnectionLoader() {
  showConnectionLoader.value = false;
}

watch(step, (val) => {
  if (val === "chat") {
    checkConnection(roomData.value.network.connectionStatus);
  }
});

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

const transcribeVoiceMessage = async (id: string, audioBinary: ArrayBuffer) => {
  let transcriptionResult = "";
  try {
    const audioBlob = new Blob([audioBinary], { type: "audio/wav" });
    const result = await $fetch("/api/transcribe-audio", {
      method: "POST",
      body: audioBlob,
    });
    transcriptionResult =
      (result as any).results?.channels?.[0]?.alternatives?.[0]?.transcript ||
      "Транскрибация не удалась";
    messages.value.find((m) => m.id === id)!.transcription =
      transcriptionResult;
  } catch (error: any) {
    console.error("Transcription failed:", error);
    if (error?.data?.statusMessage) {
      transcriptionResult = `Ошибка: ${error.data.statusMessage}`;
    } else {
      transcriptionResult = "Ошибка при транскрибации";
    }
  }
};

function onCall(type: "audio" | "video") {
  showCall.value = true;
  callType.value = type;
  // Start call to ALL connected peers
  startCall(type === "video");
}

function onAcceptCall(opts?: { mic?: boolean; cam?: boolean }) {
  acceptCall(opts);
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
function onToggleScreenShare(enabled: boolean) {
  toggleScreenShare(enabled);
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

function checkCallChatVisibilitySwap() {
  if (window.innerWidth > 1384) {
    if (["calling", "incoming", "active"].includes(callState.value)) {
      showCall.value = true;
    }
    showChat.value = true;
    showRoomData.value = false;
  }
}

watch(
  () => showCall.value,
  (val) => {
    if (val) {
      roomDataExpanded.value = false;
    }
  },
);

watch(
  () => callState.value,
  (newVal) => {
    if (newVal === "calling") {
      callStatusText.value = "Звоним...";
      return;
    }
    if (newVal === "incoming") {
      callStatusText.value = "Входящий звонок";
      return;
    }
    if (newVal === "active") {
      callStatusText.value = "Идёт звонок";
      return;
    }
    if (newVal === "ended") {
      callStatusText.value = "Звонок завершён";
      return;
    }
  },
  { immediate: true },
);

// We no longer manually map video elements in the parent because VideoCall.vue handles the grid loop.
// But we might need to handle the screen share or local video?
// VideoCall.vue handles "myVideo" ref and "remoteStreams" loop internally.
// So we don't need the big watcher here that sets srcObject.
// CChatVideoCall component props binding is sufficient.

const handleEndSession = async () => {
  Object.values(connections).forEach((conn) => {
    conn.close();
  });
  for (const k of Object.keys(connections)) delete connections[k];
  if (peer.value) {
    peer.value.destroy();
  }
  await endSession();
};

onMounted(() => {
  window.addEventListener("resize", () => {
    windowWidth.value = window.innerWidth;
    checkCallChatVisibilitySwap();
  });
  restoreSession();
});

onBeforeUnmount(async () => {
  window.removeEventListener("resize", checkCallChatVisibilitySwap);
});
</script>

<style scoped lang="scss">
@import "@/assets/styles/pages/chat.scss";

$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;

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
      display: flex;
      align-items: center;
      &--active-call {
        @media screen and (min-width: $app-desktop) {
          display: none;
        }
      }
    }
    @media screen and (max-width: $app-desktop) {
      height: 100vh;
      flex-shrink: 0;
    }
  }
  @media screen and (max-width: $app-desktop) {
    height: 100vh;
    flex-direction: column;
    /* ensure proper stacking/visibility */
  }

  @media screen and (max-width: $app-desktop) {
    &--call-show {
      .chat-wrapper {
        display: none;
      }
    }
  }

  .room-data-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    .room-data--standalone {
      width: 100%;
      height: 100%;
      background: transparent;
      backdrop-filter: none;
      box-shadow: none;
      padding: 24px;
      overflow-y: auto;
    }
  }
}
</style>
