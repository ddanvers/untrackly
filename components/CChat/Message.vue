<template>
  <div
    class="chat-message"
    :class="{
      'chat-message--me': isMe,
    }"
    :data-id="message.id"
  >
    <div class="chat-message__meta">
      <span class="chat-message__sender">{{ isMe ? "Вы" : "Собеседник" }}</span>
      <time class="chat-message__time">{{ formattedTime }}</time>
    </div>
    <div class="chat-message__bubble">
      <template v-if="isMessageHasOnlyImage(message) && message.files?.length">
        <div v-if="message.text" class="chat-message__group-text">{{ message.text }}</div>
        <div class="image-preview">
          <a :href="message.files[0].fileUrl" target="_blank">
            <img
              :src="message.files[0].fileUrl"
              :alt="message.files[0].name"
              class="chat-message__image"
            />
          </a>
          <a
            :href="message.files[0].fileUrl"
            :download="message.files[0].name"
            class="download-icon"
            title="Скачать"
          >
            <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
          ></a>
        </div>
      </template>
      <template v-else-if="message.type === 'file-group' && message.files?.length">
        <div v-if="message.text" class="chat-message__group-text">{{ message.text }}</div>
        <ul class="file-attachments-list">
          <li
            v-for="(file, idx) in message.files"
            :key="file.name"
            class="file-attachment"
            :class="{
              'file-attachment__item--img': file.type && file.type.startsWith('image/'),
            }"
          >
            <template v-if="file.type && file.type.startsWith('image/')">
              <div class="file-attachment__img-wrapper">
                <a :href="file.fileUrl" target="_blank">
                  <img :src="file.fileUrl" class="file-attachment__img" />
                </a>
                <a :href="file.fileUrl" :download="file.name" class="download-icon" title="Скачать">
                  <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
                ></a>
              </div>
            </template>
            <template v-else>
              <img
                :src="getIconByType(file.name.split('.').pop())"
                class="file-attachment__type-icon"
                width="32px"
              />
              <a :href="file.fileUrl" target="_blank" class="file-attachment__link">{{
                file.name
              }}</a>
              <a :href="file.fileUrl" :download="file.name" class="download-icon" title="Скачать">
                <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg
              ></a>
            </template>
          </li>
        </ul>
      </template>
      <template v-else>
        {{ message.text }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FileAttachment {
  name: string;
  type: string;
  fileUrl: string;
}
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  read?: boolean;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  files?: FileAttachment[];
}
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

const props = defineProps<{
  message: Message;
  isMe: boolean;
}>();
const emit = defineEmits<(e: "read", id: string) => void>();

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
});

const getIconByType = (type?: string) => {
  return `/icons/file_formats/${
    type && type in FILE_ICONS
      ? FILE_ICONS[type as keyof typeof FILE_ICONS]
      : DEFAULT_FILE_ICON
  }`;
};
function isMessageHasOnlyImage(message: Message) {
  return (
    message.type === "file-group" &&
    message.files?.length === 1 &&
    message.files[0].type &&
    message.files[0].type.startsWith("image/")
  );
}
</script>

<style lang="scss" scoped>
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat-message {
  max-width: 50%;
  width: max-content;
  margin-right: auto;
  @media screen and (max-width: $app-mobile) {
    max-width: 100%;
  }
  &__meta {
    display: flex;
    justify-content: space-between;
    gap: 48px;
    font-size: 14px;
    color: var(--app-text-secondary);
    margin-bottom: 8px;
  }
  &__bubble {
    background: var(--app-blue-100);
    color: var(--app-text-primary);
    padding: 16px;
    border-radius: 8px;
    overflow-wrap: anywhere;
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
      background: var(--app-blue-500);
      color: var(--app-text-primary-white);
    }
    .chat-message__group-text {
      color: var(--app-text-primary-white);
    }
  }
}
.chat-message__image {
  max-width: 320px;
  max-height: 320px;
  border-radius: 8px;
  margin: 8px 0;
  display: block;
}
.file-attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  border-radius: 8px;
  padding: 8px 8px 4px 8px;
  margin-top: 8px;
  margin-bottom: 4px;
  .file-attachment {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    height: 72px;
    flex: 1 1 calc(50% - 8px);
    position: relative;
    background: var(--app-blue-200);
    padding: 6px 36px 6px 8px;
    margin: 2px 0;
    &__img-wrapper {
      display: inline-block;
      width: 100%;
      .file-attachment__img {
        height: calc(72px - 6px * 2);
        border-radius: 4px;
        display: block;
        object-fit: cover;
        width: calc(100% - 8px);
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
  background: var(--app-pink-500);
  border-radius: 6px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  z-index: 2;
  transition: background 0.3s;
  img {
    filter: var(--app-filter-grey-50);
  }
}
.download-icon:hover {
  background: var(--app-pink-600);
}
</style>
