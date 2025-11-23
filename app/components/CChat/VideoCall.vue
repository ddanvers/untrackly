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
      <div
        class="video-call__videos"
        :class="{ 'video-call__videos--screen-share': props.screenShareEnabled }"
      >
        <div class="video-call__cameras">
          <!-- Remote Member (Camera) -->
          <div
            class="video-call__member"
            :class="{
              'video-call__member--cam-enabled': props.members.companionCameraEnabled,
            }"
            v-show="!props.incoming || props.accepted"
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

          <!-- My Video -->
          <video
            v-show="props.camEnabled"
            ref="myVideo"
            class="video-call__my-video"
            autoplay
            playsinline
            muted
          ></video>
        </div>

        <!-- Screen Share Video -->
        <div
          v-show="props.screenShareEnabled"
          class="video-call__screen-share-wrapper"
          ref="screenShareWrapper"
          @mousemove="showControls = true"
          @mouseleave="showControls = false"
        >
          <video
            ref="screenShareVideo"
            class="video-call__screen-share-video"
            autoplay
            playsinline
            :muted="true"
          ></video>

          <div
            class="video-call__screen-controls"
            :class="{ 'video-call__screen-controls--visible': showControls }"
          >
            <div class="video-call__volume-control" v-if="!props.isMeScreenSharing">
              <div class="video-call__volume-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  v-model.number="volume"
                  class="video-call__volume-slider"
                  @input="updateVolume"
                />
              </div>
              <button class="video-call__control-btn" @click="toggleMute">
                <NuxtImg
                  :src="volume === 0 ? '/icons/chat/volume_off.svg' : '/icons/chat/volume_up.svg'"
                  width="24px"
                />
              </button>
            </div>

            <button class="video-call__control-btn" @click="toggleFullScreen">
              <NuxtImg
                :src="
                  isScreenShareFullscreen
                    ? '/icons/chat/fullscreen_exit.svg'
                    : '/icons/chat/fullscreen.svg'
                "
                width="24px"
              />
            </button>
          </div>
        </div>
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
          :class="{ active: props.isMeScreenSharing }"
          :disabled="props.screenShareEnabled && !props.isMeScreenSharing"
        >
          <NuxtImg
            :src="
              props.isMeScreenSharing
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
const screenShareWrapper = ref<HTMLElement | null>(null);
const camState = ref(props.camEnabled);
const micState = ref(props.micEnabled);
const videoCallEl = ref<HTMLElement | null>(null);
const isScreenShareFullscreen = ref(false);
const volume = ref(0.5); // Default to 50% (which will be 2x gain if max is 4x)
const lastVolume = ref(0.5);
const showControls = ref(false);

// Web Audio API refs
const audioContext = ref<AudioContext | null>(null);
const gainNode = ref<GainNode | null>(null);
const sourceNode = ref<MediaStreamAudioSourceNode | null>(null);

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
  // Just emit, let parent handle state
  emit("toggleScreenShare", !props.isMeScreenSharing);
}

function toggleFullScreen() {
  if (!screenShareWrapper.value) return;

  if (!document.fullscreenElement) {
    screenShareWrapper.value?.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

function onFullScreenChange() {
  isScreenShareFullscreen.value = !!document.fullscreenElement;
}

function toggleMute() {
  if (volume.value > 0) {
    lastVolume.value = volume.value;
    volume.value = 0;
  } else {
    volume.value = lastVolume.value || 0.5;
  }
  updateVolume();
}

function updateVolume() {
  if (gainNode.value) {
    // Boost volume: slider 0-1 maps to gain 0-4
    gainNode.value.gain.value = volume.value * 4;
  }
}

function setupAudioContext(stream: MediaStream) {
  cleanupAudioContext();

  if (props.isMeScreenSharing) return; // Don't play own audio

  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    audioContext.value = new AudioContext();
    gainNode.value = audioContext.value.createGain();

    // Connect source -> gain -> destination
    if (stream.getAudioTracks().length > 0) {
      sourceNode.value = audioContext.value.createMediaStreamSource(stream);
      sourceNode.value.connect(gainNode.value);
      gainNode.value.connect(audioContext.value.destination);

      // Apply initial volume
      updateVolume();

      // Ensure context is running
      if (audioContext.value.state === "suspended") {
        audioContext.value.resume();
      }
    }
  } catch (e) {
    console.error("Error setting up Web Audio API:", e);
  }
}

function cleanupAudioContext() {
  if (sourceNode.value) {
    sourceNode.value.disconnect();
    sourceNode.value = null;
  }
  if (gainNode.value) {
    gainNode.value.disconnect();
    gainNode.value = null;
  }
  if (audioContext.value) {
    audioContext.value.close();
    audioContext.value = null;
  }
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

      if (stream) {
        setupAudioContext(stream);
      } else {
        cleanupAudioContext();
      }

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
  if (props.screenShareStream) {
    setupAudioContext(props.screenShareStream);
  }
  window.addEventListener("resize", adjustOnResize);
  document.addEventListener("fullscreenchange", onFullScreenChange);
});

onBeforeUnmount(() => {
  cleanupAudioContext();
  window.removeEventListener("resize", adjustOnResize);
  document.removeEventListener("fullscreenchange", onFullScreenChange);
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
      justify-content: center;
      flex-direction: column;
      gap: 32px;
      padding: 16px;
      overflow: hidden;

      &--screen-share {
        justify-content: flex-start;
        gap: 16px;
        .video-call__cameras {
          flex-direction: row;
          height: 180px;
          width: 100%;
          gap: 16px;
          justify-content: center;
          flex: 0 0 auto;

          @media screen and (max-width: $app-mobile) {
            justify-content: flex-start;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 0; /* Ensure no extra space */

            /* Hide scrollbar */
            scrollbar-width: none;
            &::-webkit-scrollbar {
              display: none;
            }
          }

          .video-call__member {
            width: auto;
            height: 100%;
            aspect-ratio: 4/3;
            border-radius: 12px;
            position: relative;
            padding: 0; /* Reset padding */
            overflow: hidden; /* Ensure content doesn't spill out */

            @media screen and (max-width: $app-mobile) {
              min-width: 100%;
              scroll-snap-align: center;
              aspect-ratio: 16/9; /* Optional: adjust aspect ratio for mobile if needed */
            }

            & > img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              padding: 0;
              transform: translateY(
                -12px
              ); /* Shift up slightly to make room for icons if needed, or just center */
            }

            .video-call__member-controls-state {
              position: absolute;
              bottom: 4px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.6);
              padding: 4px 8px;
              border-radius: 8px;
              gap: 8px;
              z-index: 10;

              img {
                width: 24px;
                height: 24px;
              }
            }

            &--cam-enabled {
              width: auto;
              height: 100%;
              aspect-ratio: 16/9;
              padding: 0;

              @media screen and (max-width: $app-mobile) {
                min-width: 100%;
                scroll-snap-align: center;
              }

              video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 12px;
              }
            }
          }

          .video-call__my-video {
            position: static;
            width: auto;
            height: 100%;
            aspect-ratio: 16/9;
            border-radius: 12px;
            padding: 0;
            display: block !important; /* Force show even on mobile if needed */

            @media screen and (max-width: $app-mobile) {
              min-width: 100%;
              scroll-snap-align: center;
            }
          }
        }
      }
    }

    .video-call__cameras {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 32px;
      position: relative;
    }

    .video-call__screen-share-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #000;
      border-radius: 12px;
      position: relative;
    }

    .video-call__screen-share-video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .video-call__screen-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s ease;

      &--visible {
        opacity: 1;
      }
    }

    .video-call__control-btn {
      background: rgba(0, 0, 0, 0.6);
      border: none;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.8);
      }

      img {
        /* filter: invert(1); Removed because icon is already light */
      }
    }

    .video-call__volume-control {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;

      &:hover .video-call__volume-slider-wrapper {
        display: flex;
      }
    }

    .video-call__volume-slider-wrapper {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.6);
      padding: 12px 8px;
      border-radius: 8px;
      margin-bottom: 8px;
      height: 100px;
      align-items: center;
      justify-content: center;

      /* Invisible bridge to prevent mouseleave when moving from button to slider */
      &::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        height: 8px; /* Matches margin-bottom */
        background: transparent;
      }
    }

    .video-call__volume-slider {
      writing-mode: bt-lr; /* IE */
      -webkit-appearance: slider-vertical; /* WebKit */
      width: 4px;
      height: 80px;
      cursor: pointer;
      accent-color: white;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
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
      transition: all 0.3s ease;

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
          width: 100%;
          object-fit: contain;
          border-radius: 12px;
        }
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
      border-radius: 12px;

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

    .video-call__cameras {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 32px;
      position: relative;
    }

    .video-call__screen-share-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #000;
      border-radius: 12px;
    }

    .video-call__screen-share-video {
      width: 100%;
      height: 100%;
      object-fit: contain;
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
      transition: all 0.3s ease;

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
          width: 100%;
          object-fit: contain;
          border-radius: 12px;
        }
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
      border-radius: 12px;

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
