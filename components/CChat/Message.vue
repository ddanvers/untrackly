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
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">

interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  read?: boolean
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
</style>
