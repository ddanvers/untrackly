<template>
  <div class="chat-window">
    <h2>Simple Peer Chat</h2>

    <div class="controls">
      <label>
        <input type="checkbox" v-model="isInitiator" />
        Я инициатор
      </label>
      <button @click="createPeer">Создать peer</button>
      <button @click="applyRemoteSignal">Применить сигнал</button>
      <button @click="disconnect">Отключиться</button>
    </div>

    <div class="signal-blocks">
      <div>
        <label>Локальный сигнал</label>
        <textarea
          readonly
          :value="localSignal"
          @click="copyToClipboard(localSignal)"
        ></textarea>
      </div>
      <div>
        <label>Удалённый сигнал</label>
        <textarea v-model="remoteSignal" placeholder="Вставьте сюда JSON"></textarea>
      </div>
    </div>

    <div class="chat">
      <div v-for="(msg, idx) in messages" :key="idx" class="message">
        {{ msg }}
      </div>
    </div>

    <form @submit.prevent="onSend">
      <input v-model="message" placeholder="Сообщение..." />
      <button type="submit">Отправить</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePeer } from '~/composables/usePeer'

const message = ref('')
const {
  isInitiator,
  messages,
  localSignal,
  remoteSignal,
  createPeer,
  applyRemoteSignal,
  sendMessage,
  disconnect
} = usePeer()

function onSend() {
  if (message.value.trim()) {
    sendMessage(message.value.trim())
    message.value = ''
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
    .then(() => alert('Скопировано!'))
    .catch(() => alert('Не удалось скопировать'))
}
</script>

<style scoped>
.chat-window {
  max-width: 600px;
  margin: auto;
  font-family: sans-serif;
}
.controls {
  margin-bottom: 1em;
  display: flex;
  gap: 1em;
  align-items: center;
}
.signal-blocks {
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
}
.signal-blocks textarea {
  width: 100%;
  height: 100px;
  font-family: monospace;
}
.chat {
  background: #f3f3f3;
  border: 1px solid #ccc;
  height: 200px;
  overflow-y: auto;
  padding: 0.5em;
  margin-bottom: 1em;
}
.message {
  margin-bottom: 0.3em;
}
form {
  display: flex;
  gap: 0.5em;
}
form input {
  flex-grow: 1;
}
</style>
