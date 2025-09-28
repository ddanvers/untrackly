<template>
  <section class="chat">
    <CChatHeader title="Собеседник">
      <template #buttons>
        <slot name="headerButtons">
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
        </slot>
      </template>
    </CChatHeader>
    <section class="chat__body" ref="bodyRef" @scroll="onScroll">
      <div v-if="messages.length">
        <CChatMessage
          class="chat__message"
          :parentContainer="bodyRef"
          v-for="msg in messages"
          :id="msg.id"
          :key="msg.id"
          :message="msg"
          :isMe="msg.sender === meId"
          :meId="meId"
          @read="onRead(msg.id)"
          @reply="onReply"
          @delete="onDelete"
          @transcribe="onTranscribe"
          @edit="onEdit"
          @scroll-to-message="scrollToMessage"
        />
      </div>
      <div v-else class="chat__body--empty">Чат пуст. Всё готово к обмену сообщениями</div>
    </section>
    <CChatMessageForm
      @sendMessage="sendMessage"
      @editMessage="editMessage"
      @replyToMessage="replyToMessage"
      :replyingTo="replyingTo"
      :editingMessage="editingMessage"
      @removeAttachedMessage="removeAttachedMessage"
      @go-to-reply="goToReply"
    />
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  meId: string;
  messages: Message[];
}>();

const emit = defineEmits<{
  (e: "sendMessage", payload: SendMessageRequest): void;
  (e: "editMessage", payload: EditMessageRequest): void;
  (e: "replyToMessage", payload: ReplyMessageRequest): void;
  (e: "deleteMessage", id: string): void;
  (e: "transcribeVoiceMessage", id: string, audioBinary?: ArrayBuffer): void;
  (e: "readMessage", id: string): void;
  (e: "call", type: "audio" | "video"): void;
}>();

const bodyRef = ref<HTMLElement>();
const isAtBottom = ref(true);
const notificationSound = import.meta.client
  ? new Audio("/sounds/notification.mp3")
  : null;
const replyingTo = ref<Message | null>(null);
const editingMessage = ref<Message | null>(null);
function onVideoCall() {
  emit("call", "video");
}
function onAudioCall() {
  emit("call", "audio");
}
function onReply(message: Message) {
  replyingTo.value = message;
}
function onEdit(message: Message) {
  editingMessage.value = message;
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
function removeAttachedMessage() {
  replyingTo.value = null;
  editingMessage.value = null;
}
onMounted(() => {
  console.log("[Window.vue] mounted");
  scrollToBottom();
});

function sendMessage(request: SendMessageRequest) {
  console.log("[Window.vue] sendMessage", request);
  emit("sendMessage", request);
  setTimeout(scrollToBottom, 0);
}
function editMessage(request: EditMessageRequest) {
  console.log("[Window.vue] editMessage", request);
  emit("editMessage", request);
  editingMessage.value = null;
}
function replyToMessage(request: ReplyMessageRequest) {
  console.log("[Window.vue] replyToMessage", request);
  emit("replyToMessage", request);
  replyingTo.value = null;
}
function onDelete(id: string) {
  console.log("[Window.vue] deleteMessage", id);
  emit("deleteMessage", id);
}
function onTranscribe(message: Message) {
  console.log("[Window.vue] onTranscribe", message.files[0]?.file.fileData);
  emit("transcribeVoiceMessage", message.id, message.files[0]?.file.fileData);
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
  if (notificationSound) {
    notificationSound.preload = "auto";
  }
});

watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      if (!isAtBottom.value) {
        const newMsg = props.messages[newLen - 1];
        if (newMsg.sender !== props.meId) {
          if (notificationSound) {
            notificationSound.play().catch(() => {});
          }
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
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat {
  background-color: var(--color-bg-on-secondary);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  &__body {
    display: flex;
    flex-direction: column;
    overscroll-behavior: contain;
    gap: 12px;
    background-color: var(--color-bg-on-secondary);
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
    &--empty {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: var(--color-neutral-on-text);
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
