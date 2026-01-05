<template>
  <div
    class="chat-message"
    :class="{
      'chat-message--me': isMe,
    }"
    :data-id="message.id"
    ref="elRef"
  >
    <div class="chat-message__meta">
      <span class="chat-message__sender">{{ senderName }}</span>
      <div class="chat-message__time-read-container">
        <div v-if="isMe" class="chat-message__read-status">
          <CHint
            custom-content
            position="bottom"
            secondary-horizontal-placement="right"
            :horizontal-offset="20"
          >
            <NuxtImg
              :src="message.read ? '/icons/chat/double_check.svg' : '/icons/chat/check.svg'"
              width="20px"
            ></NuxtImg>
            <template #content>
              <ul class="chat-message__hint-read-status-list">
                <li>
                  <NuxtImg :src="'/icons/chat/check.svg'" width="20px"></NuxtImg> - сообщение
                  отправлено
                </li>
                <li>
                  <NuxtImg :src="'/icons/chat/double_check.svg'" width="20px"></NuxtImg> - сообщение
                  прочитано
                </li>
              </ul>
            </template>
          </CHint>
        </div>
        <time class="chat-message__time">{{ formattedTime }}</time>
        <CButtonDropdown
          :contentStyles="{ right: '0', top: 'calc(100% + 4px)', width: 'fit-content' }"
          variant="absolute"
          class="chat-message__menu-btn"
          v-model="menuOpened"
        >
          <template #button>
            <NuxtImg src="/icons/dots_vertical.svg" width="24px"></NuxtImg
          ></template>
          <ul class="chat-message__menu">
            <li class="chat-message__menu-item" @click="replyToMessage(message)">
              <NuxtImg src="/icons/chat/reply.svg" width="16px"></NuxtImg>Ответить
            </li>
            <li v-if="isMe" class="chat-message__menu-item" @click="editMessage(message)">
              <NuxtImg src="/icons/chat/pen.svg" width="16px"></NuxtImg>Редактировать
            </li>
            <li
              v-if="message.isVoiceMessage"
              class="chat-message__menu-item"
              @click="transcribeVoiceMessage(message)"
            >
              <NuxtImg src="/icons/chat/transcribe.svg" width="16px"></NuxtImg>Перевести в текст
            </li>
            <li v-if="isMe" class="chat-message__menu-item" @click="deleteMessage(message)">
              <NuxtImg src="/icons/chat/delete.svg" width="16px"></NuxtImg>Удалить
            </li>
          </ul>
        </CButtonDropdown>
      </div>
    </div>
    <div
      v-if="message.replyMessage"
      class="chat-message__reply-preview"
      @click="onClickReplyPreview"
    >
      <div class="message-form__reply">
        <div class="message-form__reply-content">
          <span class="message-form__reply-author">
            {{ replyAuthorName }}
          </span>
          <p class="message-form__reply-text">
            {{ message.replyMessage.text || "Файл" }}
          </p>
        </div>
      </div>
    </div>

    <div class="chat-message__bubble">
      <template v-if="isMessageHasOnlyImage(message) && message.files?.length">
        <div v-if="message.text" class="chat-message__group-text">{{ message.text }}</div>
        <div class="image-preview">
          <img
            :src="message.files[0].file.fileUrl"
            :alt="message.files[0].file.name"
            class="chat-message__image"
            @click="handleImgClick(message.files, message.files[0].file.fileUrl)"
          />
          <a
            :href="message.files[0].file.fileUrl"
            :download="message.files[0].file.name"
            class="download-icon"
            title="Скачать"
          >
            <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
          ></a>
        </div>
      </template>
      <template v-else-if="message.type === 'message' && message.files?.length">
        <div v-if="message.text" class="chat-message__group-text">{{ message.text }}</div>
        <ul class="file-attachments-list">
          <li
            v-for="(file, idx) in message.files"
            :key="file.file.name"
            class="file-attachment"
            :class="{
              'file-attachment--img': file.file.type && file.file.type.startsWith('image/'),
              'file-attachment--video': file.file.type && file.file.type.startsWith('video/'),
              'file-attachment--audio': file.file.type && file.file.type.startsWith('audio/'),
              'file-attachment--loading': !file.file.fileUrl
            }"
          >
            <!-- Loading State -->
            <div v-if="!file.file.fileUrl" class="file-attachment__loading-overlay">
                 <span class="loader"></span>
                 <span v-if="file.file.percentLoaded" class="percent">{{ file.file.percentLoaded }}%</span>
            </div>

            <template v-if="file.file.type && file.file.type.startsWith('image/')">
              <div class="file-attachment__img-wrapper">
                <img
                   v-if="file.file.fileUrl" 
                  @click="handleImgClick(message.files, file.file.fileUrl)"
                  :src="file.file.fileUrl"
                  class="file-attachment__img"
                />
                <a
                  v-if="file.file.fileUrl"
                  :href="file.file.fileUrl"
                  :download="file.file.name"
                  class="download-icon"
                  title="Скачать"
                >
                  <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
                ></a>
              </div>
            </template>
            <template v-else-if="file.file.type && file.file.type.startsWith('video/')">
              <img
                :src="getIconByType(file.file.name.split('.').pop())"
                class="file-attachment__type-icon"
                width="32px"
              />
              <span v-if="file.file.fileUrl" @click="handleVideoClick(file.file.fileUrl)"> {{ file.file.name }}</span>
              <span v-else> {{ file.file.name }} </span>
              <a
                v-if="file.file.fileUrl"
                :href="file.file.fileUrl"
                :download="file.file.name"
                class="download-icon"
                title="Скачать"
              >
                <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
              ></a>
            </template>
            <template v-else-if="file.file.type?.startsWith('audio/')">
              <CAudioPlayer
                v-if="file.file.fileUrl"
                :src="file.file.fileUrl"
                :filename="file.file.name"
                :file-size="formatBytes(file.file.size || 0)"
              />
               <div v-else class="audio-placeholder">
                  {{ file.file.name }}
               </div>
            </template>
            <template v-else>
              <img
                :src="getIconByType(file.file.name.split('.').pop())"
                class="file-attachment__type-icon"
                width="32px"
              />
              <a v-if="file.file.fileUrl" :href="file.file.fileUrl" target="_blank" class="file-attachment__link">{{
                file.file.name
              }}</a>
              <span v-else class="file-attachment__link">{{ file.file.name }}</span>
              <a
                v-if="file.file.fileUrl"
                :href="file.file.fileUrl"
                :download="file.file.name"
                class="download-icon"
                title="Скачать"
              >
                <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
              ></a>
            </template>
          </li>
        </ul>
      </template>
      <div
        v-if="message.isVoiceMessage && (message.transcription || isTranscribing)"
        class="chat-message__transcription"
      >
        <div class="chat-message__transcription-label">
          <NuxtImg src="/icons/chat/transcribe.svg" width="16px"></NuxtImg>
          Текст сообщения:
        </div>
        <div
          v-if="isTranscribing && !message.transcription"
          class="chat-message__transcription-loading"
        >
          <span class="chat-message__transcription-loading-text">Расшифровываем аудио</span>
          <div class="chat-message__transcription-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <p v-else class="chat-message__transcription-text">{{ message.transcription }}</p>
      </div>
      <template v-else-if="!message.files?.length">
        {{ message.text }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const DEFAULT_FILE_ICON = "file.svg";
const FILE_ICONS = {
  doc: "doc.svg",
  docx: "doc.svg",
  xls: "xls.svg",
  xlsx: "xls.svg",
  ppt: "ppt.svg",
  pptx: "ppt.svg",
  pdf: "pdf.svg",
  csv: "csv.svg",
  txt: "txt.svg",
  zip: "zip.svg",
  mp3: "mp3.svg",
  mp4: "mp4.svg",
};

import type { Member, Message } from "~/composables/peer/types";

const props = defineProps<{
  message: Message;
  isMe: boolean;
  meId: string;
  parentContainer: HTMLElement;
  members: Record<string, Member>;
}>();

const emit = defineEmits<{
  (e: "reply", message: Message): void;
  (e: "read", id: string): void;
  (e: "scroll-to-message", id: string): void;
  (e: "edit", message: Message): void;
  (e: "delete", id: string): void;
  (e: "transcribe", message: Message): void;
}>();

const { openDialog, setImages } = useDialogImages();
const { openDialog: openVideoDialog, setVideo } = useDialogVideo();
const elRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
const menuOpened = ref(false);
const isTranscribing = ref(false);

const senderName = computed(() => {
  if (props.isMe) return "Вы";
  const member = Object.values(props.members).find(
    (m) => m.deviceId === props.message.sender,
  );
  return member?.name || "Собеседник";
});

const replyAuthorName = computed(() => {
  if (!props.message.replyMessage) return "";
  if (props.message.replyMessage.sender === props.meId) return "Вы";
  const member = Object.values(props.members).find(
    (m) => m.deviceId === props.message.replyMessage?.sender,
  );
  return member?.name || "Собеседник";
});

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
});

watch(
  () => props.message.transcription,
  (newTranscription, oldTranscription) => {
    if (newTranscription && !oldTranscription && isTranscribing.value) {
      isTranscribing.value = false;
    }
  },
);

function onClickReplyPreview() {
  if (props.message.replyMessage) {
    emit("scroll-to-message", props.message.replyMessage.id);
  }
}

const getIconByType = (type?: string) => {
  return `/icons/file_formats/${
    type && type in FILE_ICONS
      ? FILE_ICONS[type as keyof typeof FILE_ICONS]
      : DEFAULT_FILE_ICON
  }`;
};

function handleImgClick(messageFiles: MessageFile[], clickedUrl: string) {
  const imageUrls = messageFiles
    .filter((messageFile) => messageFile.file.type?.startsWith("image/"))
    .map((messageFile) => messageFile.file.fileUrl);
  setImages([
    imageUrls.find((url) => url === clickedUrl)!,
    ...imageUrls.filter((url) => url !== clickedUrl),
  ]);
  openDialog();
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

function handleVideoClick(videoUrl: string) {
  setVideo(videoUrl);
  openVideoDialog();
}

function replyToMessage(message: Message) {
  emit("reply", message);
  menuOpened.value = false;
}

function editMessage(message: Message) {
  menuOpened.value = false;
  emit("edit", message);
}

function deleteMessage(message: Message) {
  menuOpened.value = false;
  emit("delete", message.id);
}

function transcribeVoiceMessage(message: Message) {
  menuOpened.value = false;
  isTranscribing.value = true;
  emit("transcribe", message);
}

function isMessageHasOnlyImage(message: Message) {
  return (
    message.type === "message" &&
    message.files?.length === 1 &&
    message.files[0].file.type &&
    message.files[0].file.type.startsWith("image/")
  );
}

onMounted(() => {
  nextTick(() => {
    if (!props.isMe && !props.message.read && elRef.value) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            console.log("Message is in view");
            emit("read", props.message.id);
            observer?.disconnect();
          }
        },
        { root: props.parentContainer, threshold: 0.5 },
      );
      observer.observe(elRef.value);
    }
  });
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style lang="scss" scoped>
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;

.chat-message {
  max-width: 50%;
  width: fit-content;
  padding: 12px;
  margin-right: auto;
  overflow: visible;
  &:has(.file-attachment--audio) {
    width: 100%;
  }
  @media screen and (max-width: $app-mobile) {
    max-width: 100%;
  }
  &__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 48px;
    font-size: 14px;
    color: var(--color-neutral-on-text);
    margin-bottom: 8px;
    position: relative;
    .chat-message__time-read-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      .chat-message__read-status {
        bottom: 6px;
        right: 6px;
        width: 20px;
        height: 20px;
        img {
          filter: var(--filter-primary-on-text);
        }
      }
      .chat-message__menu-btn {
        cursor: pointer;
        img {
          filter: var(--filter-neutral-on-outline);
        }
      }
      .chat-message__menu {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border-radius: var(--radius-md);
        background-color: var(--color-neutral-on-fill);
        box-shadow: var(--liquid-glass-shadow);
        .chat-message__menu-item {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          color: var(--color-neutral-on-text);
          transition: background 0.3s ease;
          font-size: 14px;
          white-space: nowrap;
          img {
            filter: var(--filter-neutral-on-text);
            flex-shrink: 0;
          }
          &:hover {
            background: var(--color-neutral-on-hover);
          }
          &:active {
            background: var(--color-neutral-on-active);
          }
        }
      }
    }
  }
  .chat-message__reply-preview {
    margin: 12px 0px 12px 0px;
  }

  .message-form__reply {
    display: flex;
    align-items: center;
    border-left: 4px solid var(--color-primary-on-outline);
    padding: 8px 16px;
    cursor: pointer;
    transition: background 0.3s ease;
    border-radius: var(--radius-sm);
    color: var(--color-neutral-on-text);
    &:hover {
      background: var(--app-blue-100);
    }
    &:active {
      background: var(--app-blue-200);
    }

    &-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    &-author {
      font-weight: 500;
      font-size: 14px;
      color: var(--app-text-secondary);
    }

    &-text {
      font-size: 14px;
      color: var(--app-text-primary);
      max-height: 40px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  &__bubble {
    background: var(--color-bg-on-secondary-light);
    color: var(--color-neutral-on-text);
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    border-bottom-left-radius: 4px;
    overflow-wrap: anywhere;
    width: 100%;
    .image-preview {
      width: 100%;
      position: relative;
      .download-icon {
        top: 4px;
        right: -4px;
      }
    }
  }

  &__transcription {
    background: var(--color-neutral-on-fill);
    border-radius: var(--radius-md);
    padding: 12px;
    margin: 4px 8px;
    &-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-neutral-on-muted);
      margin-bottom: 8px;
      line-height: 16px;
      img {
        filter: var(--filter-neutral-on-outline);
      }
    }
    &-text {
      font-size: 14px;
      color: var(--color-neutral-on-text);
      word-wrap: break-word;
      hyphens: auto;
    }
    &-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      &-text {
        font-size: 14px;
        color: var(--color-neutral-on-muted);
      }
      &-dots {
        display: flex;
        gap: 4px;
        span {
          width: 4px;
          height: 4px;
          background: var(--color-neutral-on-outline);
          border-radius: 50%;
          animation: chat-message-loading 1.4s ease-in-out infinite both;
          &:nth-child(1) {
            animation-delay: -0.32s;
          }
          &:nth-child(2) {
            animation-delay: -0.16s;
          }
          &:nth-child(3) {
            animation-delay: 0s;
          }
        }
      }
    }
  }

  &__group-text {
    margin-top: 8px;
    color: var(--app-text-primary);
    font-size: 15px;
  }
  &.chat-message--me {
    margin-left: auto;
    margin-right: 0;
    .chat-message__bubble {
      color: var(--color-neutral-on-text);
      position: relative;
      border-bottom-left-radius: var(--radius-lg);
      border-bottom-right-radius: 4px;
    }
    .chat-message__group-text {
      color: var(--color-neutral-on-text);
    }
  }
}
.chat-message__hint-read-status-list {
  padding: 8px;
  list-style: none;
  font-size: 12px;
  color: var(--color-neutral-on-text);
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    img {
      filter: var(--filter-primary-on-text);
    }
  }
}
.chat-message__image {
  max-width: 300px;
  width: 100%;
  border-radius: var(--radius-md);
  margin: 8px 0;
  display: block;
}
.file-attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 8px 8px 4px 8px;
  margin-top: 8px;
  margin-bottom: 4px;
  .file-attachment {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 72px;
    flex: 1 1 calc(50% - 8px);
    position: relative;
    background: var(--color-neutral-on-fill);
    border-radius: var(--radius-md);
    padding: 6px 36px 6px 8px;
    margin: 2px 0;
    &--audio {
      padding: 6px 8px;
      width: 50%;
      height: auto;
      flex: 1 1 100%;
    }
    &__img-wrapper {
      display: inline-block;
      width: 100%;
      .file-attachment__img {
        height: calc(72px - 6px * 2);
        display: block;
        object-fit: cover;
        width: calc(100% - 8px);
        border-radius: var(--radius-sm);
      }
    }
    &__file-type-icon {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
    &__link {
      color: var(--app-text-primary);
      font-size: 14px;
      margin-right: 8px;
      text-overflow: ellipsis;
      overflow: hidden;
      line-clamp: 2;
      -webkit-line-clamp: 2;
      display: -webkit-box;
      -webkit-box-orient: vertical;
    }
  }
}
.download-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  z-index: 2;
  transition: background 0.3s;
  border-radius: 50%;
  img {
    filter: var(--filter-primary-on-text);
  }
}
.download-icon:hover {
  background: var(--app-pink-600);
}

@keyframes chat-message-loading {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.file-attachment {
    /* ... existing styles ... */
    
    &.file-attachment--loading {
        background: var(--color-bg-on-secondary);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    &__loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        gap: 8px;
        z-index: 10;
        color: white;
        
        .loader {
            width: 24px;
            height: 24px;
            border: 3px solid #FFF;
            border-bottom-color: transparent;
            border-radius: 50%;
            display: inline-block;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
        }

        .percent {
            font-size: 12px;
            font-weight: 600;
        }
    }
}

@keyframes rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
</style>
