<template>
  <div class="c-audio-player">
    <div class="c-audio-player__header mb-3">
      <span class="c-audio-player__filename">{{ filename }}</span>
      <a :href="src" :download="filename" class="plain-button-icon" title="Скачать">
        <NuxtImg src="/icons/download.svg" />
      </a>
    </div>
    <div class="c-audio-player__player-wrapper mb-3">
      <button
        @click="togglePlay"
        :disabled="!canPlay"
        class="plain-button-icon"
        :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести'"
      >
        <NuxtImg :src="isPlaying ? '/icons/pause.svg' : '/icons/play.svg'" />
      </button>
      <div class="c-audio-player__waveform-container">
        <div
          ref="waveformRef"
          class="c-audio-player__waveform"
          :class="{ 'c-audio-player__waveform--loading': isLoading }"
        />
        <div v-if="isLoading" class="c-audio-player__loading">
          <div class="c-audio-player__spinner" />
        </div>
      </div>
    </div>

    <div class="c-audio-player__info">{{ formattedDuration }}, {{ fileSize }}</div>
  </div>
</template>

<script setup lang="ts">
interface AudioPlayerProps {
  src: string;
  filename?: string;
  fileSize?: string;
}

const props = withDefaults(defineProps<AudioPlayerProps>(), {
  filename: "audio.mp3",
  fileSize: "",
});

const nuxtApp = useNuxtApp();
const wavesurferFactory = nuxtApp.$wavesurfer as any;

const waveformRef = ref<HTMLElement>();

const wavesurfer = ref<any>(null);
const isLoading = ref(false);
const isPlaying = ref(false);
const duration = ref(0);
const canPlay = ref(false);

let themeObserver: MutationObserver | null = null;

const formattedDuration = computed(() => {
  if (!duration.value) return "00:00";

  const minutes = Math.floor(duration.value / 60);
  const seconds = Math.floor(duration.value % 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});

function readThemeVars() {
  const themeElement =
    document.querySelector<HTMLElement>(".dark") ||
    document.body ||
    document.documentElement ||
    waveformRef.value ||
    document.documentElement;

  const cs = getComputedStyle(themeElement);

  let primaryFill = cs.getPropertyValue("--color-primary-on-fill")?.trim();
  let neutralFill = cs.getPropertyValue("--color-neutral-on-text")?.trim();
  let cursorColor = cs.getPropertyValue("--color-primary-on-text")?.trim();

  const rootCs = getComputedStyle(document.documentElement);
  if (!primaryFill)
    primaryFill = rootCs.getPropertyValue("--color-primary-on-fill")?.trim();
  if (!neutralFill)
    neutralFill = rootCs.getPropertyValue("--color-neutral-on-text")?.trim();
  if (!cursorColor)
    cursorColor = rootCs.getPropertyValue("--color-primary-on-text")?.trim();

  primaryFill = primaryFill || "#0d6efd";
  neutralFill = neutralFill || "#e9ecef";
  cursorColor = cursorColor || primaryFill;

  return { primaryFill, neutralFill, cursorColor };
}

async function createWaveSurferInstance(colors: {
  waveColor: string;
  progressColor: string;
  cursorColor: string;
}) {
  if (wavesurfer.value) {
    try {
      wavesurfer.value.destroy();
    } catch (e) {}
    wavesurfer.value = null;
  }

  wavesurfer.value = wavesurferFactory.create({
    container: waveformRef.value,
    waveColor: colors.waveColor,
    progressColor: colors.progressColor,
    cursorColor: colors.cursorColor,
    barWidth: 2,
    barRadius: 1,
    barGap: 4,
    height: 52,
    responsive: true,
    normalize: true,
    backend: "WebAudio",
  });

  wavesurfer.value.on("ready", () => {
    duration.value = wavesurfer.value.getDuration();
    canPlay.value = true;
    isLoading.value = false;
  });

  wavesurfer.value.on("play", () => {
    isPlaying.value = true;
  });

  wavesurfer.value.on("pause", () => {
    isPlaying.value = false;
  });

  wavesurfer.value.on("finish", () => {
    isPlaying.value = false;
  });

  try {
    await wavesurfer.value.load(props.src);
  } catch (err) {
    console.error("WaveSurfer load error:", err);
    isLoading.value = false;
  }
}

async function applyColorsToWaveSurfer(
  primary: string,
  neutral: string,
  cursor: string,
) {
  if (!wavesurfer.value) return;

  const hasSetWave = typeof wavesurfer.value.setWaveColor === "function";
  const hasSetProgress =
    typeof wavesurfer.value.setProgressColor === "function";
  const hasSetCursor = typeof wavesurfer.value.setCursorColor === "function";

  try {
    if (hasSetWave || hasSetProgress || hasSetCursor) {
      if (hasSetWave) wavesurfer.value.setWaveColor(neutral);
      if (hasSetProgress) wavesurfer.value.setProgressColor(primary);
      if (hasSetCursor) wavesurfer.value.setCursorColor(cursor);
    } else {
      const wasPlaying = isPlaying.value;
      const currentTime = wavesurfer.value.getCurrentTime
        ? wavesurfer.value.getCurrentTime()
        : 0;

      await createWaveSurferInstance({
        waveColor: neutral,
        progressColor: primary,
        cursorColor: cursor,
      });

      if (wavesurfer.value && typeof wavesurfer.value.seekTo === "function") {
        const dur = wavesurfer.value.getDuration() || duration.value || 1;
        wavesurfer.value.seekTo(Math.min(1, currentTime / dur));
        if (wasPlaying) wavesurfer.value.play();
      }
    }
  } catch (e) {
    console.warn("Failed to set colors dynamically, recreating wavesurfer", e);
    await createWaveSurferInstance({
      waveColor: neutral,
      progressColor: primary,
      cursorColor: cursor,
    });
  }
}

const initWaveSurfer = async (): Promise<void> => {
  if (!waveformRef.value || !wavesurferFactory) return;

  try {
    isLoading.value = true;

    const { primaryFill, neutralFill, cursorColor } = readThemeVars();

    await createWaveSurferInstance({
      waveColor: neutralFill,
      progressColor: primaryFill,
      cursorColor,
    });

    const observerCallback: MutationCallback = (mutations) => {
      for (const m of mutations) {
        if (
          m.type === "attributes" &&
          (m.attributeName === "class" || m.attributeName === "style")
        ) {
          const {
            primaryFill: p,
            neutralFill: n,
            cursorColor: c,
          } = readThemeVars();
          applyColorsToWaveSurfer(p, n, c);
          break;
        }
      }
    };

    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    themeObserver = new MutationObserver(observerCallback);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }
  } catch (error) {
    console.error("AudioPlayer initialization failed:", error);
    isLoading.value = false;
  }
};

const togglePlay = (): void => {
  if (!wavesurfer.value || !canPlay.value) return;

  if (isPlaying.value) {
    wavesurfer.value.pause();
  } else {
    wavesurfer.value.play();
  }
};

onMounted(() => {
  initWaveSurfer();
});

onBeforeUnmount(() => {
  if (wavesurfer.value) {
    try {
      wavesurfer.value.destroy();
    } catch (e) {
      /* ignore */
    }
    wavesurfer.value = null;
  }
  if (themeObserver) {
    try {
      themeObserver.disconnect();
    } catch (e) {
      /* ignore */
    }
    themeObserver = null;
  }
});
</script>

<style lang="scss" scoped>
.c-audio-player {
  background: var(--color-neutral-on-fill);
  border-radius: 8px;
  padding: 12px;
  width: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  &__player-wrapper {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  &__filename {
    font-size: 14px;
    color: var(--color-neutral-on-text);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    flex: 1;
    margin-right: 8px;
  }

  &__waveform-container {
    position: relative;
    height: 52px;
    width: 100%;
    overflow: hidden;
  }

  &__waveform {
    height: 100%;
    cursor: pointer;

    canvas {
      background: transparent;
      display: block;
      width: 100%;
      height: 100%;
    }

    &--loading {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  &__spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-neutral-on-outline);
    border-top-color: var(--color-primary-on-text);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-neutral-on-text);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.plain-button-icon {
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  border: 1px solid var(--color-neutral-on-outline);
  z-index: 2;
  cursor: pointer;
  transition: background 0.3s;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  img {
    filter: var(--filter-primary-on-text);
    width: 100%;
    height: 100%;
  }
}
</style>
