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
          :members="roomData.members"
          @accept="onAcceptCall"
          @decline="onDeclineCall"
          @end="onEndCall"
          @toggleMic="onToggleMic"
          @toggleCam="onToggleCam"
          @toggleScreenShare="onToggleScreenShare"
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
          :title="windowTitle"
          :messages="messages"
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
  // screenShareOwnerId, // Not exposed?
  toggleMic,
} = usePeer({ sessionId, isInitiator: !isInvited.value });

// Manually track call type since usePeer simplified media somewhat
const callType = ref<"audio" | "video">("video");

// Derived screen share owner check - need to re-implement if not in usePeer
// Simple check: if we are sharing screen, we own it.
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
);

useChatAudio(callState);

const showConnectionLoader = ref(false);
const connectionLoaderMessage = ref("Пытаемся восстановить соединение...");
const callStatusText = ref("");

const windowTitle = computed(() => {
  const count = Object.keys(roomData.value.members).length;
  if (!count) return "Групповой чат";
  return `Групповой чат (${count} уч.)`;
});

function swapToCall() {
  showChat.value = false;
  showCall.value = true;
}
function swapToChat() {
  showChat.value = true;
  showCall.value = false;
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
  window.addEventListener("resize", checkCallChatVisibilitySwap);
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
    /* ensure proper stacking/visibility */
  }

  @media screen and (max-width: $app-desktop) {
    &--call-show {
      .chat-wrapper {
        display: none;
      }
    }
    /* If chat is shown, hide call? or just stack? 
       Previous logic had conditional classes.
       We'll keep existing behavior. 
    */
  }
}
</style>
