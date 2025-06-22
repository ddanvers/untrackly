<template>
  <div
    :class="{
      'chat__message': true,
      'chat__message--me': isMe
    }"
    :data-id="message.id"
    @mouseenter="markRead"
  >
    <div class="chat__message-meta">
      <span class="chat__sender">{{ isMe ? 'Вы' : 'Собеседник' }}</span>
      <span class="chat__time">{{ formattedTime }}</span>
    </div>
    <div class="chat__message-bubble">
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
  const d = new Date(props.message.timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function markRead() {
  if (!props.message.read) {
    emit('read', props.message.id)
  }
}
</script>

<style lang="scss" scoped>
.chat__message {
  margin-bottom: 1rem;
  max-width: 60%;
   margin-right: auto;
       background: #999;
    color: #111;
  &.chat__message--me {
    margin-left: auto;
  }
  &-meta {
    display: flex;
    justify-content: space-between;
    font-size: 20px;
    color: #ccc;
  }

  &-bubble {
    background: #580057;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    word-wrap: break-word;
  }
}
</style>
