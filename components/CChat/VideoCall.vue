<template>
  <section class="video-call" v-if="visible">
    <div class="video-call__content">
      <header class="video-call__header">
        <h2 class="video-call__title">{{ callStatusText }}</h2>
        <button class="video-call__close-btn" @click="onEndCall">
          <NuxtImg src="/icons/close.svg" width="24px"></NuxtImg>
        </button>
      </header>
      <div class="video-call__videos">
        <video ref="myVideo" class="video-call__my-video" autoplay playsinline muted></video>
        <video ref="remoteVideo" class="video-call__remote-video" autoplay playsinline></video>
      </div>
      <nav class="video-call__controls">
        <CButton
          variant="icon-default"
          iconSize="i-large"
          @click="toggleMic"
          :class="{ active: micState }"
        >
          <NuxtImg
            :src="micState ? '/icons/chat/microphone.svg' : '/icons/chat/microphone-off.svg'"
            width="32px"
          ></NuxtImg>
        </CButton>
        <CButton
          variant="icon-default"
          iconSize="i-large"
          @click="toggleCam"
          :class="{ active: camState }"
        >
          <NuxtImg
            :src="camState ? '/icons/chat/camera.svg' : '/icons/chat/camera-off.svg'"
            width="32px"
          ></NuxtImg>
        </CButton>
        <CButton
          class="video-call__end-btn"
          bgColor="var(--app-color-negavite)"
          variant="icon-default"
          iconSize="i-large"
          @click="onEndCall"
          ><NuxtImg src="/icons/chat/call_end.svg" width="32px"></NuxtImg
        ></CButton>
      </nav>
    </div>
    <section v-if="incoming && !accepted" class="video-call__incoming">
      <h3 class="video-call__incoming-title">Входящий звонок...</h3>
      <nav class="video-call__incoming-actions">
        <CButton variant="primary" @click="onAcceptCall">Принять</CButton>
        <CButton variant="quaternary" @click="onDeclineCall">Отклонить</CButton>
      </nav>
    </section>
  </section>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  incoming: boolean;
  accepted: boolean;
  callStatusText: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  camEnabled: boolean;
  micEnabled: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits([
  "accept",
  "decline",
  "end",
  "toggleMic",
  "toggleCam",
]);

const myVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const camState = ref(props.camEnabled);
const micState = ref(props.micEnabled);

watch(
  () => props.camEnabled,
  (val) => {
    camState.value = val;
  },
);
watch(
  () => props.micEnabled,
  (val) => {
    micState.value = val;
  },
);

watch(
  () => props.localStream,
  (stream) => {
    if (myVideo.value) {
      myVideo.value.srcObject = stream || null;
    }
  },
);

watch(
  () => props.remoteStream,
  (stream) => {
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = stream || null;
    }
  },
);

onMounted(() => {
  if (myVideo.value) myVideo.value.srcObject = props.localStream || null;
  if (remoteVideo.value)
    remoteVideo.value.srcObject = props.remoteStream || null;
});

function onAcceptCall() {
  emit("accept", { mic: micState.value, cam: camState.value });
}
function onDeclineCall() {
  emit("decline");
}
function onEndCall() {
  emit("end");
}
function toggleMic() {
  const newState = !micState.value;
  micState.value = newState;
  emit("toggleMic", newState);
}
function toggleCam() {
  const newState = !camState.value;
  camState.value = newState;
  emit("toggleCam", newState);
}
</script>

<style scoped lang="scss">
.video-call {
  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  &__content {
    position: relative;
    width: 90vw;
    max-width: 900px;
    height: 80vh;
    background: var(--app-blue-50);
    border-radius: 24px;
    box-shadow: 0 8px 32px #0008;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    .video-call__header {
      width: 100%;
      text-align: center;
      color: var(--app-text-primary);
      font-size: 22px;
      margin: 12px 0px 24px 0px;
      position: relative;
      .video-call__title {
        font-size: 24px;
        font-weight: 400;
      }
    }
    .video-call__close-btn {
      position: absolute;
      right: 24px;
      top: 0;
      background: none;
      border: none;
      img {
        filter: var(--app-filter-text-light-permanent);
      }
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
      background: var(--app-text-secondary);
      object-fit: cover;
      z-index: 2;
    }
    .video-call__remote-video {
      width: 70vw;
      max-width: 700px;
      height: 60vh;
      border-radius: 18px;
      background: var(--app-text-secondary);
      object-fit: cover;
      z-index: 1;
    }
    .video-call__controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 32px;
      margin: 24px 0 16px 0;
      img {
        filter: var(--app-filter-black);
      }
      .video-call__end-btn {
        img {
          filter: var(--app-filter-text-light-permanent);
        }
      }
    }
  }
  &__incoming {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: var(--app-blue-200);
    border-radius: 16px;
    padding: 32px 48px;
    color: var(--app-text-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    z-index: 10001;
    .video-call__incoming-actions {
      display: flex;
      gap: 16px;
    }
    .video-call__incoming-title {
      font-size: 16px;
      font-weight: 400;
    }
  }
}
</style>
