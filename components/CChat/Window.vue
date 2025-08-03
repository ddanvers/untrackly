<template>
  <section class="chat">
    <header class="chat__header">
      <span class="chat__title">{{ title }}</span>
      <nav class="chat__actions">
        <CButton
          @click="onVideoCall"
          bgColor="transparent"
          variant="icon-default"
          class="form__send"
          size="large"
          icon-size="i-large"
          ><NuxtImg src="/icons/chat/video.svg" width="32px"></NuxtImg
        ></CButton>
        <CButton
          @click="onAudioCall"
          bgColor="transparent"
          variant="icon-default"
          class="form__send"
          size="large"
          icon-size="i-large"
          ><NuxtImg src="/icons/chat/phone.svg" width="32px"></NuxtImg
        ></CButton>
      </nav>
    </header>
    <section
      class="chat__body"
      :class="{
        'chat__body--minimized': isVideoCallMinimized,
      }"
      ref="bodyRef"
      @scroll="onScroll"
    >
      <CChatMessage
        class="chat__message"
        v-for="msg in messages"
        :id="msg.id"
        :key="msg.id"
        :message="msg"
        :isMe="msg.sender === meId"
        :meId="meId"
        @read="onRead(msg.id)"
        @reply="onReply"
        @scroll-to-message="scrollToMessage"
      />
    </section>
    <CChatMessageForm
      @send="sendMessage"
      @sendAllFiles="onSendAllFiles"
      @sendFile="sendFile"
      :replyingTo="replyingTo"
      @cancelReply="cancelReply"
      @go-to-reply="goToReply"
    />
  </section>
</template>

<script setup lang="ts">
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  read?: boolean;
}
interface ReplyMessageData {
  id: string;
  text: string;
  sender: string;
}
const props = defineProps<{
  title: string;
  meId: string;
  messages: Message[];
  isVideoCallMinimized: boolean;
}>();

const emit = defineEmits<{
  (
    e: "sendMessage",
    payload: {
      text: string;
      replyMessage: ReplyMessageData | null;
    },
  ): void;
  (e: "sendFile", file: File): void;
  (
    e: "sendAllFiles",
    payload: {
      text: string;
      replyMessage: ReplyMessageData | null;
      files: {
        name: string;
        type: string;
        size: number;
        file: File;
        preview?: string;
      }[];
    },
  ): void;
  (e: "readMessage", id: string): void;
  (e: "call", type: "audio" | "video"): void;
}>();

const bodyRef = ref<HTMLElement>();
const isAtBottom = ref(true);
const notificationSound = new Audio("/sounds/notification.mp3");
const replyingTo = ref<Message | null>(null);
notificationSound.preload = "auto";

function onVideoCall() {
  emit("call", "video");
}
function onAudioCall() {
  emit("call", "audio");
}
function onReply(message: Message) {
  replyingTo.value = message;
}
function scrollToMessage(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // триггерим анимацию
  el.classList.add("chat__message--highlight");
  // по окончании убираем класс, чтобы можно было воспроизвести позже
  el.addEventListener(
    "animationend",
    () => el.classList.remove("chat__message--highlight"),
    {
      once: true,
    },
  );
}
function goToReply() {
  if (replyingTo.value) {
    scrollToMessage(replyingTo.value.id);
  }
}
function cancelReply() {
  replyingTo.value = null;
}
onMounted(() => {
  console.log("[Window.vue] mounted");
  scrollToBottom();
});

function sendMessage(text: string) {
  console.log("[Window.vue] sendMessage", text);
  emit("sendMessage", {
    text,
    replyMessage: replyingTo.value
      ? {
          id: replyingTo.value?.id as string,
          text: replyingTo.value?.text as string,
          sender: replyingTo.value?.sender as string,
        }
      : null,
  });
  setTimeout(scrollToBottom, 0);
  replyingTo.value = null;
}

function onSendAllFiles(payload: {
  text: string;
  files: {
    name: string;
    type: string;
    size: number;
    file: File;
    preview?: string;
  }[];
}) {
  console.log("[Window.vue] onSendAllFiles", payload);
  emit("sendAllFiles", {
    ...payload,
    replyMessage: replyingTo.value
      ? {
          id: replyingTo.value?.id as string,
          text: replyingTo.value?.text as string,
          sender: replyingTo.value?.sender as string,
        }
      : null,
  });
  setTimeout(scrollToBottom, 0);
  replyingTo.value = null;
}

function onRead(id: string) {
  console.log("[Window.vue] onRead", id);
  emit("readMessage", id);
}

watch(
  () => props.messages,
  (val) => {
    console.log("[Window.vue] messages updated", val);
  },
);
function scrollToBottom() {
  const el = bodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function onScroll() {
  const el = bodyRef.value!;
  isAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
}

onMounted(() => {
  scrollToBottom();
});

watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      if (!isAtBottom.value) {
        const newMsg = props.messages[newLen - 1];
        if (newMsg.sender !== props.meId) {
          notificationSound.play().catch(() => {});
        }
      }
      if (isAtBottom.value) {
        nextTick(scrollToBottom);
      }
    }
  },
);
</script>

<style lang="scss" scoped>
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat {
  background-color: var(--color-bg-on-secondary);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
  }
  &__actions {
    display: flex;
    gap: 8px;
    img {
      // filter: var(--app-filter-pink-500);
    }
  }
  &__title {
    font-size: 32px;
    color: var(--color-primary-on-text);
    @media screen and (max-width: $app-mobile) {
      font-size: 24px;
    }
  }
  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: var(--color-bg-on-primary);
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px;
    @media screen and (max-width: $app-laptop) {
      &--minimized {
        height: calc((100vh - 80px - 105px) / 2);
        margin-top: calc((100vh - 80px - 105px) / 2);
      }
    }
    .chat__message {
      &--highlight {
        animation: pulse-highlight 2s ease both;
      }
    }
  }
}

@keyframes pulse-highlight {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: var(--color-primary-on-fill);
  }
  100% {
    background-color: transparent;
  }
}
</style>
