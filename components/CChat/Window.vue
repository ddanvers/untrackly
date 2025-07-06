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
    <section class="chat__body" ref="bodyRef" @scroll="onScroll">
      <CChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :isMe="msg.sender === meId"
        @read="onRead(msg.id)"
      />
    </section>
    <CChatMessageForm @send="sendMessage" @sendAllFiles="onSendAllFiles" @sendFile="sendFile" />
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

const props = defineProps<{
  title: string;
  meId: string;
  messages: Message[];
}>();

const emit = defineEmits<{
  (e: "sendMessage", payload: string): void;
  (e: "sendFile", file: File): void;
  (
    e: "sendAllFiles",
    payload: {
      text: string;
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
notificationSound.preload = "auto";

function onVideoCall() {
  emit("call", "video");
}
function onAudioCall() {
  emit("call", "audio");
}

onMounted(() => {
  console.log("[Window.vue] mounted");
  scrollToBottom();
});

function sendMessage(text: string) {
  console.log("[Window.vue] sendMessage", text);
  emit("sendMessage", text);
  setTimeout(scrollToBottom, 0);
}

function sendFile(file: File) {
  console.log("[Window.vue] sendFile", file);
  emit("sendFile", file);
  setTimeout(scrollToBottom, 0);
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
  emit("sendAllFiles", payload);
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
  background-color: var(--app-dirty-blue-100);
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
      filter: var(--app-filter-pink-500);
    }
  }
  &__title {
    font-size: 32px;
    color: var(--app-text-primary);
    @media screen and (max-width: $app-mobile) {
      font-size: 24px;
    }
  }
  &__body {
    display: flex;
    flex-direction: column;
    gap: 24px;
    background-color: var(--app-dirty-blue-50);
    height: 100%;
    overflow-y: auto;
    padding: 16px;
  }
}
</style>
