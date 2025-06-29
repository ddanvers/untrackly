<template>
  <section class="chat">
    <header class="chat__header">
      <span class="chat__title">{{ title }}</span>
      <div class="chat__actions">
        <CButton
          @click="onVideoCall"
          bgColor="transparent"
          type="icon-default"
          class="form__send"
          size="large"
          icon-size="i-large"
          ><NuxtImg src="/icons/chat/video.svg" width="32px"></NuxtImg
        ></CButton>
        <CButton
          @click="onAudioCall"
          bgColor="transparent"
          type="icon-default"
          class="form__send"
          size="large"
          icon-size="i-large"
          ><NuxtImg src="/icons/chat/phone.svg" width="32px"></NuxtImg
        ></CButton>
      </div>
    </header>

    <div class="chat__body" ref="bodyRef" @scroll="onScroll">
      <CChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :isMe="msg.sender === meId"
        @read="onRead(msg.id)"
      />
    </div>

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

function scrollToBottom() {
  const el = bodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function onVideoCall() {
  emit("call", "video");
}
function onAudioCall() {
  emit("call", "audio");
}
// при монтировании скроллим вниз
onMounted(() => {
  console.log("[Window.vue] mounted");
  scrollToBottom();
});

// отправка
function sendMessage(text: string) {
  console.log("[Window.vue] sendMessage", text);
  emit("sendMessage", text);
  setTimeout(scrollToBottom, 0);
}

// отправка файла
function sendFile(file: File) {
  console.log("[Window.vue] sendFile", file);
  emit("sendFile", file);
  setTimeout(scrollToBottom, 0);
}

// отправка всех файлов
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

// чтение при скролле: помечаем прочитанные, когда они попадают в зону видимости
function onScroll() {
  const el = bodyRef.value;
  if (!el) {
    console.log("[Window.vue] onScroll: no bodyRef");
    return;
  }
  // находим все сообщения в DOM
  const items = el.querySelectorAll<HTMLElement>(".chat__message");
  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
      const id = item.dataset.id!;
      emit("readMessage", id);
    }
  });
}

// ручной вызов от ChatMessage
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
