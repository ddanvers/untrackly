<template>
  <section class="chat">
    <header class="chat__header">
      <span class="chat__title">{{ title }}</span>
      <!-- <button class="chat__call" @click="$emit('call')">Позвонить</button> -->
    </header>

    <div 
      class="chat__body" 
      ref="bodyRef" 
      @scroll="onScroll"
    >
      <CChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :isMe="msg.sender === meId"
        @read="onRead(msg.id)"
      />
    </div>

    <CChatMessageForm @send="sendMessage" />
  </section>
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
  title: string
  meId: string
  messages: Message[]
}>()

const emit = defineEmits<{
  (e: 'sendMessage', payload: string): void
  (e: 'readMessage', id: string): void
}>()

const bodyRef = ref<HTMLElement>()

function scrollToBottom() {
  const el = bodyRef.value
  if (el) el.scrollTop = el.scrollHeight
}

// при монтировании скроллим вниз
onMounted(scrollToBottom)

// отправка
function sendMessage(text: string) {
  emit('sendMessage', text)
  // после нового сообщения: автоскролл
  setTimeout(scrollToBottom, 0)
}

// чтение при скролле: помечаем прочитанные, когда они попадают в зону видимости
function onScroll() {
  const el = bodyRef.value
  if (!el) return
  // находим все сообщения в DOM
  const items = el.querySelectorAll<HTMLElement>('.chat__message')
  items.forEach(item => {
    const rect = item.getBoundingClientRect()
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
      const id = item.dataset.id!
      emit('readMessage', id)
    }
  })
}

// ручной вызов от ChatMessage
function onRead(id: string) {
  emit('readMessage', id)
}
</script>

<style lang="scss" scoped>
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.chat {
    background-color: #0E0D22;
    height: 100%;
    width: 100%;
  &__header {
    display: flex;
    justify-content: space-between;

    padding: 16px;
  }
  &__title { font-size: 32px;     color: #F8EAD1;
  @media screen and (max-width: $app-mobile) {
    font-size: 24px;
  }
  }
  &__body {
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: #0f0f2f;
    height: calc(100vh - 180px);
    overflow-y: auto;
    padding: 16px;
  }
}
</style>
