<template>
  <div class="video-call__overlay" v-if="visible">
    <div class="video-call__container">
      <div class="video-call__header">
        <span>{{ callStatusText }}</span>
        <button class="video-call__close" @click="onEndCall">×</button>
      </div>
      <div class="video-call__videos">
        <video ref="myVideo" class="video-call__my-video" autoplay playsinline muted></video>
        <video ref="remoteVideo" class="video-call__remote-video" autoplay playsinline></video>
      </div>
      <div class="video-call__controls">
        <button @click="toggleMic" :class="{ active: micState }">
          <span v-if="micState">🎤</span><span v-else>🎤<span style='text-decoration:line-through;color:#c115c9'>/</span></span>
        </button>
        <button @click="toggleCam" :class="{ active: camState }">
          <span v-if="camState">📷</span><span v-else>📷<span style='text-decoration:line-through;color:#c115c9'>/</span></span>
        </button>
        <button class="end" @click="onEndCall">Завершить</button>
      </div>
    </div>
    <div v-if="incoming && !accepted" class="video-call__incoming">
      <span>Входящий звонок...</span>
      <button @click="onAcceptCall">Принять</button>
      <button @click="onDeclineCall">Отклонить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  incoming: Boolean,
  accepted: Boolean,
  callStatusText: String,
  localStream: { type: Object as () => MediaStream | null, default: null },
  remoteStream: { type: Object as () => MediaStream | null, default: null },
  camEnabled: Boolean,
  micEnabled: Boolean,
})
const emit = defineEmits(['accept', 'decline', 'end', 'toggleMic', 'toggleCam'])

const myVideo = ref<HTMLVideoElement | null>(null)
const remoteVideo = ref<HTMLVideoElement | null>(null)

// Локальные состояния для мгновенного UI-отклика
const camState = ref(props.camEnabled)
const micState = ref(props.micEnabled)

watch(() => props.camEnabled, (val) => {
  camState.value = val
})
watch(() => props.micEnabled, (val) => {
  micState.value = val
})

watch(() => props.localStream, (stream) => {
  if (myVideo.value) {
    myVideo.value.srcObject = stream || null
  }
})

watch(() => props.remoteStream, (stream) => {
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = stream || null
  }
})

onMounted(() => {
  if (myVideo.value) myVideo.value.srcObject = props.localStream || null
  if (remoteVideo.value) remoteVideo.value.srcObject = props.remoteStream || null
})

function onAcceptCall() {
  emit('accept', { mic: micState.value, cam: camState.value })
}
function onDeclineCall() {
  emit('decline')
}
function onEndCall() {
  emit('end')
}
function toggleMic() {
  const newState = !micState.value
  micState.value = newState
  emit('toggleMic', newState)
}
function toggleCam() {
  const newState = !camState.value
  camState.value = newState
  emit('toggleCam', newState)
}
// Потоки и состояние управляются через props и локальный fallback
</script>

<style scoped lang="scss">
.video-call__overlay {
  position: fixed;
  z-index: 10000;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(20,0,40,0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-call__container {
  position: relative;
  width: 90vw;
  max-width: 900px;
  height: 80vh;
  background: #1a0030;
  border-radius: 24px;
  box-shadow: 0 8px 32px #0008;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0 0 0;
}
.video-call__header {
  width: 100%;
  text-align: center;
  color: #fff;
  font-size: 22px;
  margin-bottom: 8px;
  position: relative;
}
.video-call__close {
  position: absolute;
  right: 24px;
  top: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 32px;
  cursor: pointer;
}
.video-call__videos {
  flex: 1;
  width: 100%;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.video-call__my-video {
  position: absolute;
  right: 32px;
  bottom: 32px;
  width: 180px;
  height: 120px;
  border-radius: 12px;
  box-shadow: 0 2px 12px #000a;
  background: #222;
  object-fit: cover;
  z-index: 2;
}
.video-call__remote-video {
  width: 70vw;
  max-width: 700px;
  height: 60vh;
  border-radius: 18px;
  background: #000;
  object-fit: cover;
  z-index: 1;
}
.video-call__controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  margin: 24px 0 16px 0;
  button {
    background: #2a0040;
    border: none;
    color: #fff;
    font-size: 28px;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    cursor: pointer;
    &.end {
      background: #c115c9;
      color: #fff;
      font-size: 18px;
      width: 120px;
      border-radius: 32px;
    }
    &.active {
      background: #7d066d;
    }
  }
}
.video-call__incoming {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
  background: #fff2;
  border-radius: 16px;
  padding: 32px 48px;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  z-index: 10001;
}
</style>
