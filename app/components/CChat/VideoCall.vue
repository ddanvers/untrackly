<template>
  <section
    class="video-call"
    v-show="visible"
    :class="{
      'video-call--minimized': isMinimized,
    }"
    :style="movedWindowPosition"
    ref="videoCallEl"
  >
    <CChatHeader class="video-call__header" title="Собеседник">
      <template #buttons>
        <slot name="headerButtons"> </slot>
      </template>
    </CChatHeader>
    <div class="video-call__content">
      <header class="video-call__header">
        <h2 class="video-call__title" v-show="!isMinimized">{{ callStatusText }}</h2>
      </header>
      <div class="video-call__videos">
        <div class="video-call__minimized-members" v-if="props.screenShareEnabled">
          <div
            class="video-call__member--minimized video-call__member"
            :class="{
              'video-call__member--cam-enabled': props.members.companionCameraEnabled,
            }"
          >
            <video
              v-show="props.members.companionCameraEnabled && props.screenShareEnabled"
              ref="remoteVideo"
              class="video-call__remote-video"
              autoplay
              playsinline
            ></video>
            <NuxtImg
              v-show="!props.members.companionCameraEnabled"
              src="/icons/chat/member_robot.svg"
              width="320px"
            />
          </div>
        </div>
        <video
          v-show="props.camEnabled"
          ref="myVideo"
          class="video-call__my-video"
          autoplay
          playsinline
          muted
        ></video>
        <div
          v-show="callStatusText !== 'Входящий звонок'"
          class="video-call__member"
          :class="{
            'video-call__member--cam-enabled': props.members.companionCameraEnabled,
          }"
          v-if="!props.screenShareEnabled"
        >
          <div>
            <video
              v-show="props.members.companionCameraEnabled"
              ref="remoteVideo"
              class="video-call__remote-video"
              autoplay
              playsinline
            ></video>
          </div>
          <NuxtImg
            v-show="!props.members.companionCameraEnabled"
            src="/icons/chat/member_robot.svg"
            width="320px"
          />
          <div class="video-call__member-controls-state">
            <NuxtImg
              :src="
                props.members.companionMicEnabled
                  ? '/icons/chat/microphone.svg'
                  : '/icons/chat/microphone-off.svg'
              "
              width="32px"
            ></NuxtImg>
            <NuxtImg
              :src="
                props.members.companionCameraEnabled
                  ? '/icons/chat/camera.svg'
                  : '/icons/chat/camera-off.svg'
              "
              width="32px"
            ></NuxtImg>
          </div>
        </div>
        <video
          v-show="props.screenShareEnabled"
          ref="screenShareVideo"
          class="video-call__remote-video"
          autoplay
          playsinline
        ></video>
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
          variant="icon-default"
          iconSize="i-large"
          @click="toggleScreenShare"
          :class="{ active: screenShareState }"
        >
          <NuxtImg
            :src="
              screenShareState
                ? '/icons/chat/screen_share_off.svg'
                : '/icons/chat/screen_share_on.svg'
            "
            width="32px"
          ></NuxtImg>
        </CButton>
        <CButton
          class="video-call__end-btn"
          variant="icon-default"
          iconSize="i-large"
          iconColor="var(--filter-negative-on-fill)"
          @click="onEndCall"
          ><NuxtImg src="/icons/chat/call_end.svg" width="32px"></NuxtImg
        ></CButton>
      </nav>
    </div>
    <section v-if="incoming && !accepted" class="video-call__incoming">
      <h3 class="video-call__incoming-title">Входящий звонок...</h3>
      <nav class="video-call__incoming-actions">
        <CButton variant="primary" @click="onAcceptCall">Принять</CButton>
        <CButton
          variant="quaternary"
          @click="onDeclineCall"
          textColor="var(--color-negative-on-text)"
          >Отклонить</CButton
        >
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
  members: MemberStatus;
  screenShareEnabled: boolean;
  isMeScreenSharing: boolean;
  screenShareStream: MediaStream | null;
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
  "toggleScreenShare",
]);

const isMinimized = ref(false);
const movedWindowPosition = ref<MovedWindowPosition>({});
const myVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const screenShareVideo = ref<HTMLVideoElement | null>(null);
const camState = ref(props.camEnabled);
const micState = ref(props.micEnabled);
const screenShareState = ref(props.screenShareEnabled);
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
function toggleScreenShare() {
  const newState = !screenShareState.value;
  screenShareState.value = newState;
  emit("toggleScreenShare", newState);
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
watch(
  () => props.screenShareStream,
  (stream) => {
    if (screenShareVideo.value) {
      screenShareVideo.value.srcObject = stream || null;
      nextTick(() => {
        if (remoteVideo.value) {
          remoteVideo.value.srcObject = props.remoteStream || null;
        }
      });
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
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.video-call {
  width: 100%;
  height: 100%;
  max-height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  @media screen and (max-width: $app-laptop) {
    height: 100vh;
    width: 100vw;
    border-radius: 0;
    top: 0;
    bottom: 0;
  }
  &__header {
    display: none;
    @media screen and (max-width: $app-desktop) {
      display: flex;
    }
  }
  &__content {
    position: relative;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    background: var(--color-bg-on-secondary);
    border: 1px solid var(--color-neutral-on-outline);
    border-bottom: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    @media screen and (max-width: $app-desktop) {
      border: 0;
    }
    .video-call__header {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      color: var(--color-neutral-on-text);
      font-size: 22px;
      margin: 24px 0px;
      @media screen and (max-width: $app-narrow-mobile) {
        margin: 12px 0px;
      }
      .video-call__title {
        font-size: 24px;
        font-weight: 400;
        @media screen and (max-width: $app-mobile) {
          font-size: 20px;
        }
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
      align-items: center;
      justify-content: flex-start;
      flex-direction: column;
      gap: 32px;
    }
    .video-call__minimized-members {
      display: flex;
      gap: 24px;
    }
    .video-call__member {
      border-radius: 1000px;
      background-color: var(--color-bg-on-secondary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      width: 400px;
      height: 400px;
      padding: 16px;
      .video-call__member-controls-state {
        display: flex;
        gap: 24px;
        img {
          filter: var(--filter-neutral-on-text);
        }
      }
      @media screen and (max-width: $app-mobile) {
        width: 320px;
        height: max-content;
        & > img {
          width: 256px;
          height: 256px;
        }
      }
      @media screen and (max-width: $app-narrow-mobile) {
        width: 256px;
        height: max-content;
        & > img {
          width: 156px;
          height: 156px;
        }
      }
      &--cam-enabled {
        background-color: transparent;
        padding: 8px;
        border-radius: 0;
        z-index: 100;
        width: 100%;
        gap: 8px;
        height: 100%;
        video {
          height: 100%;
        }
      }
    }
    .video-call__member--minimized {
      padding: 16px;
      width: 256px;
      height: 120px;
      background: var(--color-bg-on-secondary-light);
      object-fit: contain;
      border-radius: 4px;
      img {
        width: 144px;
      }
      @media screen and (max-width: $app-mobile) {
        display: none;
      }
    }
    .video-call__my-video {
      position: absolute;
      bottom: 0px;
      right: 0px;
      padding: 16px;
      width: 256px;
      transition:
        width 0.2s ease,
        height 0.2s ease;
      background: var(--color-bg-on-secondary-light);
      object-fit: contain;
      z-index: 1000;
      @media screen and (max-width: $app-mobile) {
        display: none;
      }
    }
    .video-call__remote-video {
      max-width: 100%;
      transition:
        width 0.2s ease,
        height 0.2s ease;
      background: var(--color-bg-on-secondary-light);
      padding: 16px;
      object-fit: contain;
      z-index: 1;
    }
    .video-call__controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 32px;
      padding: 32px;
      width: 100%;
      border-top: 1px solid var(--color-neutral-on-outline);
    }
  }
  &__incoming {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-bg-on-secondary-light);
    padding: 32px 48px;
    color: var(--color-neutral-on-text);
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
