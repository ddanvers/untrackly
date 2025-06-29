<template>
  <section class="message-form__container">
    <div v-if="attachedFiles.length" class="form__attachments">
      <div
        v-for="(item, idx) in attachedFiles"
        :key="item.file.name + idx"
        class="form__attachment"
      >
        <template v-if="item.file.type.startsWith('image/')">
          <img :src="item.preview" class="form__attachment-img" />
        </template>
        <template v-else>
          <NuxtImg
            :src="getIconByType(item.file.name.split('.').pop())"
            class="form__attachment-icon"
            width="32px"
          ></NuxtImg>
          <span class="form__attachment-file">{{ item.file.name }}</span>
        </template>
        <button type="button" class="form__detach" @click="detach(idx)">
          <NuxtImg src="/icons/close.svg" width="24px"></NuxtImg>
        </button>
      </div>
    </div>
    <form class="form" @submit.prevent="onSubmit">
      <CButton
        @click="onAttachClick"
        button-type="button"
        bgColor="transparent"
        type="icon-default"
        class="form__attach"
        size="large"
        icon-size="i-large"
        ><NuxtImg src="/icons/chat/attach_file.svg" width="32px"></NuxtImg
      ></CButton>
      <input ref="fileInput" type="file" multiple style="display: none" @change="onFileChange" />
      <textarea
        v-model="text"
        class="form__input"
        type="text"
        placeholder="Напишите ваше сообщение"
        @keyup.enter="onSubmit"
        rows="3"
      />
      <CButton
        bgColor="transparent"
        type="icon-default"
        class="form__send"
        size="large"
        icon-size="i-large"
        ><NuxtImg src="/icons/chat/send.svg" width="32px"></NuxtImg
      ></CButton>
    </form>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits([
  "send",
  "attach",
  "detach",
  "sendAllFiles",
  "sendFile",
]);

const text = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const attachedFiles = ref<{ file: File; preview?: string }[]>([]);

const fileIcons = {
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
const getIconByType = (type?: string) => {
  return `/icons/file_formats/${
    type && type in fileIcons
      ? fileIcons[type as keyof typeof fileIcons]
      : "file.svg"
  }`;
};
function onSubmit() {
  const trimmedText = text.value.trim();
  if (!trimmedText && !attachedFiles.value.length) return;

  // Только текст
  if (trimmedText && !attachedFiles.value.length) {
    emit("send", trimmedText);
    text.value = "";
    return;
  }
  // Любые файлы (в том числе одно изображение), с текстом или без
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

function onAttachClick() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let preview: string | undefined;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }
      attachedFiles.value.push({ file, preview });
    }
    (e.target as HTMLInputElement).value = "";
  }
}

function detach(idx: number) {
  attachedFiles.value.splice(idx, 1);
}
</script>

<style lang="scss" scoped>
.message-form__container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  background-color: var(--app-dirty-blue-100);
}
.form {
  display: flex;
  align-items: center;
  padding: 0px 16px 16px;
  gap: 16px;
  flex-wrap: wrap;
  &__attach,
  &__send {
    img {
      filter: var(--app-filter-pink-500);
    }
  }
  &__input {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: none;
    outline: none;
    resize: none;
    background: var(--app-blue-50);
    color: var(--app-text-primary);
    font-size: 14px;
    &::placeholder {
      color: var(--app-text-secondary);
    }
  }
  &__attachments {
    position: relative;
    display: flex;
    gap: 12px;
    width: 100%;
    left: 76px;
    padding: 12px;
    padding-top: 0;
    max-width: calc(100% - 72px * 2);
    overflow: auto;
  }
  &__attachment {
    display: flex;
    align-items: center;
    background: var(--app-blue-200);
    border-radius: 8px;
    padding: 4px 8px;
    gap: 8px;
    position: relative;
  }
  &__attachment-img {
    max-width: 48px;
    max-height: 48px;
    border-radius: 4px;
  }
  &__attachment-file {
    color: var(--app-text-primary);
    font-size: 14px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__detach {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    margin-left: 4px;
    width: 24px;
    height: 24px;
    img {
      filter: var(--app-filter-pink-500);
    }
    &:hover {
      color: var(--app-pink-600);
    }
    &:active {
      color: var(--app-pink-700);
    }
  }
}
</style>
