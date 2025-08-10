<template>
  <section
    class="message-form"
    :class="{ 'drag-active': dragActive }"
    @dragenter.prevent="onSectionDragEnter"
    @dragover.prevent
  >
    <section v-if="props.replyingTo" class="message-form__reply" @click="goToReply">
      <div class="message-form__reply-content">
        <span class="message-form__reply-author"> В ответ на </span>
        <p class="message-form__reply-text">
          {{ props.replyingTo.text || "Файл" }}
        </p>
      </div>
      <button type="button" class="close-btn" @dragstart.prevent @click.stop="cancelReply">
        <NuxtImg src="/icons/close.svg" width="24px"></NuxtImg>
      </button>
    </section>
    <div
      class="message-form__drop-zone"
      @dragenter.prevent
      @dragover.prevent
      @dragleave.prevent="onOverlayDragLeave"
      @drop.prevent="onOverlayDrop"
    >
      Перетащите файлы сюда
    </div>
    <ul v-if="attachedFiles.length" class="message-form__attachments-list">
      <li v-for="(item, idx) in attachedFiles" :key="item.file.name" class="form-file-attachment">
        <template v-if="item.file.type.startsWith('image/')">
          <img :src="item.preview" class="form-file-attachment__img" />
        </template>
        <template v-else>
          <NuxtImg
            :src="getIconByType(item.file.name.split('.').pop())"
            class="mform-file-attachment__type-icon"
            width="32px"
          ></NuxtImg>
          <span class="form-file-attachment__file">{{ item.file.name }}</span>
        </template>
        <button type="button" class="close-btn" @click="detachFile(idx)" @dragstart.prevent>
          <NuxtImg src="/icons/close.svg" width="24px"></NuxtImg>
        </button>
      </li>
    </ul>
    <form class="message-form__actions" @submit.prevent="sendMessage">
      <CButton
        @click="onAttachClick"
        button-type="button"
        bgColor="transparent"
        variant="icon-default"
        class="message-form__attach"
        size="large"
        icon-size="i-large"
        ><NuxtImg src="/icons/chat/attach_file.svg" width="32px"></NuxtImg
      ></CButton>
      <input ref="fileInput" type="file" multiple style="display: none" @change="onFileChange" />
      <div class="message-form__input-wrapper">
        <CInput
          v-model="text"
          class="message-form__input"
          placeholder="Напишите ваше сообщение"
          @keyup.enter="sendMessage"
          @paste="onPaste"
          type="textarea"
          :rows="2"
        />
      </div>

      <CButton
        bgColor="transparent"
        variant="icon-default"
        class="message-form__send"
        size="large"
        icon-size="i-large"
        ><NuxtImg src="/icons/chat/send.svg" width="32px"></NuxtImg
      ></CButton>
    </form>
  </section>
</template>
<script setup lang="ts">
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
interface FileAttachment {
  name: string;
  type: string;
  fileUrl: string;
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
  replyingTo?: Message;
}>();
const emit = defineEmits([
  "send",
  "attach",
  "detach",
  "sendAllFiles",
  "cancelReply",
  "goToReply",
]);

const text = ref("");
const dragActive = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const attachedFiles = ref<{ file: File; preview?: string }[]>([]);

const getIconByType = (type?: string) => {
  return `/icons/file_formats/${
    type && type in FILE_ICONS
      ? FILE_ICONS[type as keyof typeof FILE_ICONS]
      : DEFAULT_FILE_ICON
  }`;
};
function cancelReply() {
  emit("cancelReply");
}
function goToReply() {
  emit("goToReply");
}
function sendMessage(event?: KeyboardEvent) {
  if (event?.shiftKey) return;
  const trimmedText = text.value.trim();
  if (!trimmedText && !attachedFiles.value.length) return;
  if (trimmedText && !attachedFiles.value.length) {
    emit("send", trimmedText);
    text.value = "";
    return;
  }
  if (attachedFiles.value.length) {
    const files = attachedFiles.value.map((f) => ({
      name: f.file.name,
      type: f.file.type,
      size: f.file.size,
      file: f.file,
      preview: f.preview,
    }));
    emit("sendAllFiles", { text: trimmedText, files });
    text.value = "";
    attachedFiles.value = [];
  }
}
function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file?.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        attachedFiles.value.push({ file, preview });
      }
    }
  }
}
function onSectionDragEnter() {
  dragActive.value = true;
}

function onOverlayDragLeave(event: DragEvent) {
  const to = event.relatedTarget as HTMLElement | null;
  if (!event.currentTarget?.contains(to!)) {
    dragActive.value = false;
  }
}

function onOverlayDrop(e: DragEvent) {
  dragActive.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) addFiles(files);
}
function addFiles(files: FileList) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }
    attachedFiles.value.push({ file, preview });
  }
}

function onAttachClick() {
  fileInput.value?.click();
}
function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) {
    addFiles(files);
    (e.target as HTMLInputElement).value = "";
  }
}
function detachFile(idx: number) {
  attachedFiles.value.splice(idx, 1);
}
</script>
<style lang="scss" scoped>
.message-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-neutral-on-outline);
  &__reply {
    display: flex;
    align-items: center;
    background: var(--app-blue-50);
    border-left: 4px solid var(--app-pink-500);
    padding: 8px 16px;
    border-radius: 8px;
    margin: 0px 16px 12px;
    position: relative;
    transition: background 0.3s ease;
    cursor: pointer;
    &:hover {
      background: var(--app-blue-100);
    }
    &:active {
      background: var(--app-blue-200);
    }
    &-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &-author {
      font-weight: 600;
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

    &-cancel {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      img {
        filter: var(--app-filter-pink-500);
      }
      &:hover img {
        filter: var(--app-pink-600);
      }
      &:active img {
        filter: var(--app-pink-700);
      }
    }
  }

  &__attachments-list {
    position: relative;
    display: flex;
    gap: 12px;
    width: 100%;
    left: 92px;
    padding: 12px;
    padding-top: 0;
    max-width: calc(100% - 72px * 2);
    overflow: auto;
  }
  .form-file-attachment {
    padding: 8px;
    background-color: var(--color-neutral-on-fill);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 92px;
    gap: 8px;
    &__img {
      width: 72px;
    }
    &__file {
      color: var(--color-neutral-on-text);
      font-size: 12px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  &__actions {
    display: flex;
    align-items: center;
    padding: 0px 16px 16px;
    gap: 16px;
    flex-wrap: wrap;
    .message-form__attach,
    .message-form__send {
      img {
        filter: var(--app-filter-pink-500);
      }
    }
  }
  &__input-wrapper {
    display: flex;
    flex: 1;
  }
  position: relative;

  &__drop-zone {
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
    opacity: 0;
    transform: scale(0.9);

    position: absolute;
    inset: 0;
    background: var(--app-blue-100);
    border: 2px dashed var(--app-blue-500);
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: var(--app-text-primary);
    z-index: -1;
    pointer-events: all;
  }

  &.drag-active &__drop-zone {
    opacity: 1;
    transform: scale(1);
    z-index: 10;
  }
}
.close-btn {
  position: absolute;
  right: 0;
  top: 0;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  margin-left: 4px;
  background-color: var(--color-neutral-on-fill);
  width: 24px;
  height: 24px;
  user-select: none;
  img {
    filter: var(--filter-neutral-on-text);
  }
  &:hover {
    color: var(--app-pink-600);
  }
  &:active {
    color: var(--app-pink-700);
  }
}
</style>
