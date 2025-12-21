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
    <CChatHeader class="video-call__header" title="Групповой звонок">
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
          <!-- Remote Members (Loop) -->
          <div
            v-for="[peerId, stream] in Object.entries(props.remoteStreams)"
            :key="peerId"
            class="video-call__member video-call__member--cam-enabled"
            v-show="!props.incoming || props.accepted"
          >
            <div class="video-call__video-wrapper">
                <VideoPlayer :stream="stream" class="video-call__remote-video" />
            </div>
             <div class="video-call__member-info">
                 {{ getMemberName(peerId) }}
             </div>
             <!-- Mic Status Indicator could go here if we tracked audio level or mute state per peer separately -->
             <!-- For now, we rely on the stream presence or member metadata -->
             <div class="video-call__member-controls-state">
              <NuxtImg
                :src="
                  getMemberMicStatus(peerId)
                    ? '/icons/chat/microphone.svg'
                    : '/icons/chat/microphone-off.svg'
                "
                width="24px"
              ></NuxtImg>
            </div>
          </div>

          <!-- Waiting placeholder if no remote streams -->
            <div v-if="Object.keys(props.remoteStreams).length === 0 && (!props.incoming || props.accepted)" class="video-call__placeholder">
                <p>Ожидание участников...</p>
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
import { h, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Member } from "~/composables/peer/types";

// Simple sub-component for video to handle srcObject binding easily
const VideoPlayer = {
  props: ["stream"],
  setup(props: { stream: MediaStream | null }) {
    const el = ref<HTMLVideoElement | null>(null);
    watch(
      () => props.stream,
      (val) => {
        if (el.value) {
          el.value.srcObject = val;
          if (val) {
            el.value
              .play()
              .catch((e) =>
                console.warn("[VideoPlayer] Autoplay blocked or failed", e),
              );
          }
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      if (el.value && props.stream) {
        el.value.srcObject = props.stream;
        el.value
          .play()
          .catch((e) =>
            console.warn("[VideoPlayer] Autoplay blocked (onMounted)", e),
          );
      }
    });

    return () =>
      h("video", {
        ref: el,
        autoplay: true,
        playsinline: true,
        muted: false,
        class: "video-call__remote-video",
        style: { width: "100%", height: "100%", objectFit: "cover" },
      });
  },
};

interface Props {
  visible: boolean;
  incoming: boolean;
  accepted: boolean;
  callStatusText: string;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  camEnabled: boolean;
  micEnabled: boolean;
  members: Record<string, Member>;
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
const screenShareVideo = ref<HTMLVideoElement | null>(null);
const screenShareWrapper = ref<HTMLElement | null>(null);
const camState = ref(props.camEnabled);
const micState = ref(props.micEnabled);
const videoCallEl = ref<HTMLElement | null>(null);
const isScreenShareFullscreen = ref(false);
const volume = ref(0.5);
const lastVolume = ref(0.5);
const showControls = ref(false);

const audioContext = ref<AudioContext | null>(null);
const gainNode = ref<GainNode | null>(null);
const sourceNode = ref<MediaStreamAudioSourceNode | null>(null);

let windowStartXPosition = 0;
let windowStartYPosition = 0;
let windowOrigXPosition = 0;
let windowOrigYPosition = 0;

function getMemberName(id: string) {
  return props.members[id]?.name || "Участник";
}

function getMemberMicStatus(id: string) {
  // Falls back to true if unknown, strictly checking false
  return props.members[id]?.micEnabled !== false;
}

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
    return { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
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
    gainNode.value.gain.value = volume.value * 4;
  }
}

function setupAudioContext(stream: MediaStream) {
  cleanupAudioContext();

  if (props.isMeScreenSharing) return;

  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    audioContext.value = new AudioContext();
    gainNode.value = audioContext.value.createGain();

    if (stream.getAudioTracks().length > 0) {
      sourceNode.value = audioContext.value.createMediaStreamSource(stream);
      sourceNode.value.connect(gainNode.value);
      gainNode.value.connect(audioContext.value.destination);
      updateVolume();
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

  // Not implementing clamp helper here but it was simple Math.max/min
  newLeft = Math.min(
    Math.max(newLeft, WINDOW_GAP),
    vw - WINDOW_GAP - rect.width,
  );
  newTop = Math.min(
    Math.max(newTop, WINDOW_GAP),
    vh - WINDOW_GAP - rect.height,
  );

  movedWindowPosition.value = {
    left: `${newLeft}px`,
    top: `${newTop}px`,
    bottom: "",
    right: "",
  };
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
  () => props.screenShareStream,
  (stream) => {
    if (screenShareVideo.value) {
      screenShareVideo.value.srcObject = stream || null;

      if (stream) {
        setupAudioContext(stream);
      } else {
        cleanupAudioContext();
      }
    }
  },
);
onMounted(() => {
  if (myVideo.value) myVideo.value.srcObject = props.localStream || null;
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
    border-radius: 24px; /* Rounded corners */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); /* Soft shadow */
    border: none; /* No border */
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden; /* Clip content to radius */
    @media screen and (max-width: $app-desktop) {
      border: 0;
      border-radius: 0;
      box-shadow: none;
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
            padding-bottom: 0; 
            scrollbar-width: none;
            &::-webkit-scrollbar {
              display: none;
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
      flex-wrap: wrap; /* Allow wrapping for grid */
    }

    .video-call__member {
        position: relative;
        width: 320px;
        aspect-ratio: 16/9;
        background: #222;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        
        .video-call__video-wrapper {
            width: 100%;
            height: 100%;
            video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        .video-call__member-info {
            position: absolute;
            top: 8px;
            left: 8px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
         .video-call__member-controls-state {
                position: absolute;
                bottom: 8px;
                right: 8px;
                z-index: 10;
        }
    }

    .video-call__placeholder {
        color: var(--color-neutral-on-muted);
        font-size: 16px;
    }

    .video-call__my-video {
        position: absolute;
        bottom: 16px;
        right: 16px;
        width: 200px;
        aspect-ratio: 16/9;
        border-radius: 12px;
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 20;

        @media screen and (max-width: $app-mobile) {
            width: 140px;
        }
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
  }

    .video-call__controls {
      display: flex;
        gap: 20px;
        padding-bottom: 24px;
        background: var(--color-bg-on-secondary);
        width: 100%;
        justify-content: center;
        z-index: 50;
    }
    
    .video-call__incoming {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        gap: 24px;
        
        &-title {
            font-size: 24px;
        }
        &-actions {
            display: flex;
            gap: 16px;
        }
    }

}
</style>
