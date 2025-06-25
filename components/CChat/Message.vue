<template>
  <div
    :class="{
      'chat__message': true,
      'chat__message--me': isMe
    }"
    :data-id="message.id"
    @mouseenter="markRead"
  >
    <div class="chat__message__meta">
      <span class="chat__sender">{{ isMe ? 'Вы' : 'Собеседник' }}</span>
      <span class="chat__time">{{ formattedTime }}</span>
    </div>
    <div class="chat__message__bubble">
      <template v-if="message.type === 'file-group' && message.files && message.files.length === 1 && message.files[0].type && message.files[0].type.startsWith('image/')">
        <div v-if="message.text" class="chat__group-text">{{ message.text }}</div>
        <div class="file-preview-wrapper">
          <a :href="message.files[0].fileUrl" target="_blank">
            <img :src="message.files[0].fileUrl" :alt="message.files[0].name" class="chat__image" />
          </a>
          <a :href="message.files[0].fileUrl" :download="message.files[0].name" class="download-icon" title="Скачать">
                      <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg></a>
        </div>
      </template>
      <template v-else-if="message.type === 'file-group' && message.files && message.files.length">
        <div v-if="message.text" class="chat__group-text">{{ message.text }}</div>
        <div class="chat__attachments-group form__attachments file-group-block">
          <div v-for="(file, idx) in message.files" :key="file.name + idx" class="form__attachment file-attachment" :class="{
            'file-attachment--img': file.type && file.type.startsWith('image/')
          }">
            <template v-if="file.type && file.type.startsWith('image/')">
              <div class="file-img-wrapper">
                <a :href="file.fileUrl" target="_blank">
                  <img :src="file.fileUrl" class="form__attachment-img" />
                </a>
                <a :href="file.fileUrl" :download="file.name" class="download-icon download-icon-img" title="Скачать">
                            <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg></a>
              </div>
            </template>
            <template v-else>
              <img :src="getIconByType(file.name.split('.').pop())" class="form__attachment-icon" width="32px" />
              <a :href="file.fileUrl" target="_blank" class="form__attachment-file file-link">{{ file.name }}</a>
              <a :href="file.fileUrl" :download="file.name" class="download-icon" title="Скачать">
                          <NuxtImg src="/icons/download.svg" width="24px" height="24px"></NuxtImg></a>
            </template>
          </div>
        </div>
      </template>
      <template v-else>
        {{ message.text }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FileAttachment {
  name: string
  type: string
  fileUrl: string
}
interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  read?: boolean
  type?: string
  fileUrl?: string
  fileName?: string
  fileMime?: string
  files?: FileAttachment[]
}
const props = defineProps<{
  message: Message
  isMe: boolean
}>()

const emit = defineEmits<{
  (e: 'read', id: string): void
}>()

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
})
function markRead() {
  if (!props.message.read) {
    emit('read', props.message.id)
  }
}
const isSingleImageGroup = computed(() => {
  const files = props.message.files
  return (
    props.message.type === 'file-group' &&
    Array.isArray(files) &&
    files.length === 1 &&
    files[0].type && files[0].type.startsWith('image/')
  )
})
function getIconByType(ext?: string) {
  // Можно заменить на NuxtImg или использовать свои svg-иконки
  if (!ext) return '/icons/file_formats/file.svg'
  const map: Record<string, string> = {
    pdf: '/icons/file_formats/pdf.svg',
    doc: '/icons/file_formats/doc.svg',
    docx: '/icons/file_formats/doc.svg',
    xls: '/icons/file_formats/xls.svg',
    xlsx: '/icons/file_formats/xls.svg',
    ppt: '/icons/file_formats/ppt.svg',
    pptx: '/icons/file_formats/ppt.svg',
    txt: '/icons/file_formats/txt.svg',
    zip: '/icons/file_formats/zip.svg',
    jpg: '/icons/file_formats/jpg.svg',
    jpeg: '/icons/file_formats/jpg.svg',
    png: '/icons/file_formats/jpg.svg',
    mp3: '/icons/file_formats/mp3.svg',
    mp4: '/icons/file_formats/mp4.svg',
    csv: '/icons/file_formats/csv.svg',
  }
  return map[ext.toLowerCase()] || '/icons/file_formats/file.svg'
}
</script>

<style lang="scss" scoped>
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat__message {
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
    color: #dfdfdf;
    margin-bottom: 8px;
  }
  &__bubble {
    background: #070707;
    color: white;
    padding: 16px;
    border-radius: 8px;
    overflow-wrap: anywhere;
  }
    &.chat__message--me {
    margin-left: auto;
    margin-right: 0;
    .chat__message__bubble {
      background: #580057;
    }
  }
}
.chat__image {
  max-width: 320px;
  max-height: 320px;
  border-radius: 8px;
  margin: 8px 0;
  display: block;
}
.chat__attachments-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}
.chat__group-text {
  margin-top: 8px;
  color: #fff;
  font-size: 15px;
}
.form__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.form__attachment {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #181818;
  border-radius: 6px;
  padding: 4px 8px;
}
.form__attachment-img {
  max-width: 80px;
  max-height: 80px;
  border-radius: 4px;
  display: block;
}
.form__attachment-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.form__attachment-file {
  color: #fff;
  font-size: 14px;
}
.file-group-block {
  background: #181828;
  border-radius: 8px;
  padding: 8px 8px 4px 8px;
  margin-top: 8px;
  margin-bottom: 4px;
  box-shadow: 0 2px 8px #0002;
}
.file-attachment {
  position: relative;
  background: #23233a;
  border-radius: 6px;
  padding: 6px 36px 6px 8px;
  margin: 2px 0;
  &--img {
    padding: 12px;
  }
}
.file-link {
  color: #fff;
  font-size: 14px;
  margin-right: 8px;
}
.download-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #b809b5;
  border-radius: 6px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  transition: opacity 0.2s;
  z-index: 2;
}
.download-icon:hover {
  opacity: 1;
  background: #7a008a;
}
.file-img-wrapper {
  position: relative;
  display: inline-block;
}
.download-icon-img {
  top: 0px;
  right: 0px;
  transform: translate(50%, -50%);
  left: auto;
  position: absolute;
  background: #b809b5;
  opacity: 0.85;
  padding: 2px;
}
.file-preview-wrapper {
  position: relative;
  display: inline-block;
  margin-top: 8px;
}
</style>
