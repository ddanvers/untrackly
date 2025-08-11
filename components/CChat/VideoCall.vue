<template>
  <section
    class="video-call"
    v-if="visible"
    :class="{
      'video-call--minimized': isMinimized,
    }"
    :style="movedWindowPosition"
    ref="videoCallEl"
  >
    <div class="video-call__content">
      <header class="video-call__header">
        <CButton
          class="video-call__drag-btn"
          @dragstart.prevent
          @mousedown.prevent="startDrag"
          @touchstart.prevent="startDrag"
          :class="{
            'video-call__drag-btn--hidden': !isMinimized,
          }"
          variant="icon-default"
          iconSize="i-large"
        >
          <NuxtImg src="/icons/cursor_move.svg" width="32px"></NuxtImg>
        </CButton>
        <h2 class="video-call__title" v-show="!isMinimized">{{ callStatusText }}</h2>
        <CButton
          variant="icon-default"
          iconSize="i-large"
          class="video-call__minimize-btn"
          @click="toggleWindowMinimize"
        >
          <NuxtImg
            :src="isMinimized ? '/icons/maximize_window.svg' : '/icons/minimize_window.svg'"
            width="32px"
          ></NuxtImg>
        </CButton>
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
interface MovedWindowPosition {
  top?: string;
  left?: string;
  bottom?: string;
  right?: string;
  savedPosition?: MovedWindowPosition;
}

const WINDOW_GAP = 24;

const props = defineProps<Props>();
const emit = defineEmits([
  "accept",
  "decline",
  "end",
  "toggleMic",
  "toggleCam",
  "minimize",
]);

const isMinimized = ref(false);
const movedWindowPosition = ref<MovedWindowPosition>({});
const myVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const camState = ref(props.camEnabled);
const micState = ref(props.micEnabled);
const videoCallEl = ref<HTMLElement | null>(null);
let windowStartXPosition = 0;
let windowStartYPosition = 0;
let windowOrigXPosition = 0;
let windowOrigYPosition = 0;

function toggleWindowMinimize() {
  isMinimized.value = !isMinimized.value;
  if (!isMinimized.value) {
    movedWindowPosition.value = {
      savedPosition: {
        left: movedWindowPosition.value.left,
        top: movedWindowPosition.value.top,
      },
    };
  } else {
    movedWindowPosition.value = {
      left: movedWindowPosition.value.savedPosition?.left,
      top: movedWindowPosition.value.savedPosition?.top,
    };
  }
  emit("minimize", isMinimized.value);
}

function getEventCoords(e: MouseEvent | TouchEvent) {
  if ("touches" in e && e.touches.length) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}

function startDrag(e: MouseEvent | TouchEvent) {
  e.preventDefault();
  const { x, y } = getEventCoords(e);
  const el = videoCallEl.value!;
  const rect = el.getBoundingClientRect();

  windowStartXPosition = x;
  windowStartYPosition = y;
  windowOrigXPosition = movedWindowPosition.value.left
    ? Number.parseInt(movedWindowPosition.value.left, 10)
    : rect.left;
  windowOrigYPosition = movedWindowPosition.value.top
    ? Number.parseInt(movedWindowPosition.value.top, 10)
    : rect.top;

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", onDrag, { passive: false });
  document.addEventListener("touchend", stopDrag);
}

function onDrag(e: MouseEvent | TouchEvent) {
  e.preventDefault();
  const { x, y } = getEventCoords(e);
  const dx = x - windowStartXPosition;
  const dy = y - windowStartYPosition;

  movedWindowPosition.value = {
    left: `${windowOrigXPosition + dx}px`,
    top: `${windowOrigYPosition + dy}px`,
    bottom: "",
    right: "",
  };
}

function stopDrag() {
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.removeEventListener("touchmove", onDrag);
  document.removeEventListener("touchend", stopDrag);
}

function onAcceptCall() {
  emit("accept", { mic: micState.value, cam: camState.value });
}
function onDeclineCall() {
  emit("decline");
}
function onEndCall() {
  emit("end");
  isMinimized.value = false;
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

function adjustOnResize() {
  if (!isMinimized.value || !videoCallEl.value || window.innerWidth < 960)
    return;

  const el = videoCallEl.value;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let newLeft = rect.left;
  let newTop = rect.top;

  if (rect.right > vw - WINDOW_GAP) {
    newLeft = rect.left - (rect.right - (vw - WINDOW_GAP));
  }
  if (rect.left < WINDOW_GAP) {
    newLeft = WINDOW_GAP;
  }
  if (rect.bottom > vh - WINDOW_GAP) {
    newTop = rect.top - (rect.bottom - (vh - WINDOW_GAP));
  }
  if (rect.top < WINDOW_GAP) {
    newTop = WINDOW_GAP;
  }

  newLeft = clamp(newLeft, WINDOW_GAP, vw - WINDOW_GAP - rect.width);
  newTop = clamp(newTop, WINDOW_GAP, vh - WINDOW_GAP - rect.height);

  movedWindowPosition.value = {
    left: `${newLeft}px`,
    top: `${newTop}px`,
    bottom: "",
    right: "",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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
  window.addEventListener("resize", adjustOnResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", adjustOnResize);
});
</script>

<style scoped lang="scss">
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.video-call {
  width: 200%;
  max-height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  @media screen and (max-width: $app-laptop) {
    height: 100vh;
    width: 100vw;
    border-radius: 0;
    top: 0;
    bottom: 0;
  }
  &__content {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--app-blue-50);
    box-shadow: 0 8px 32px #0008;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    .video-call__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      color: var(--app-text-primary);
      font-size: 22px;
      margin: 12px 0px 24px 0px;
      .video-call__title {
        font-size: 24px;
        font-weight: 400;
      }
      .video-call__drag-btn {
        img {
          filter: var(--app-filter-black);
          user-select: none;
        }
        cursor: grab;
        &:active {
          cursor: grabbing;
        }
        &--hidden {
          opacity: 0;
          transition: none;
          pointer-events: none;
        }
      }
    }
    .video-call__minimize-btn {
      img {
        filter: var(--app-filter-black);
      }
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
      top: 32px;
      width: 212px;
      transition:
        width 0.2s ease,
        height 0.2s ease;
      background: var(--app-text-secondary);
      object-fit: contain;
      z-index: 2;
    }
    .video-call__remote-video {
      width: 100%;
      height: 100%;
      transition:
        width 0.2s ease,
        height 0.2s ease;
      background: var(--app-text-secondary);
      object-fit: contain;
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
  &--minimized {
    top: unset;
    left: unset;
    transform: none;
    bottom: 24px;
    right: 24px;
    width: fit-content;
    height: fit-content;
    background: transparent;
    .video-call__content {
      height: fit-content;
      width: fit-content;
      .video-call__videos {
        flex-direction: column-reverse;
        align-items: center;
        justify-content: flex-start;
        gap: 16px;
        .video-call__remote-video,
        .video-call__my-video {
          width: 300px;
          height: 200px;
          border-radius: 12px;
          box-shadow: none;
          position: static;
        }
      }
    }
    @media screen and (max-width: $app-laptop) {
      top: 80px !important;
      left: 0px !important;
      .video-call__drag-btn {
        opacity: 0;
        transition: none;
        pointer-events: none;
      }
      .video-call__header {
        margin: 12px 0px;
        @media screen and (max-width: $app-mobile) {
          margin: 0px 0px 12px 0px;
        }
      }
      .video-call__content {
        width: 100vw;
        max-width: 100vw;
        height: calc((100vh - 80px - 104px) / 2);
        border-radius: 0;
        box-shadow: none;
        border-bottom: 1px solid var(--app-dirty-blue-300);
        @media screen and (max-width: $app-mobile) {
          padding: 8px;
        }
        .video-call__videos {
          flex-direction: row-reverse;
          height: calc(100% - 44px - 44px - 12px - 24px);
          .video-call__remote-video,
          .video-call__my-video {
            height: 100%;
            width: calc(50% - 16px);
            flex: 1 1 auto;
          }
        }
        .video-call__controls {
          margin: 12px 0 0 0;
          @media screen and (max-width: $app-narrow-mobile) {
            display: none;
          }
          @media screen and (max-height: 650px) {
            display: none;
          }
        }
      }
    }
  }
}
</style>
