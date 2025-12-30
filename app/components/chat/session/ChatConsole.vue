<template>
  <section class="chat-waiting" aria-label="Ожидание подключения собеседника">
    <div class="waiting-shell">
      <div v-show="!isSnakeVisibleOnMobile" class="console-window-wrapper">
        <div class="console-window liquid-glass">
          <p class="console-line" v-for="(msg, i) in logs" :key="i">&gt; {{ msg }}</p>
          <div v-if="!finished" class="console-line blink">|</div>
          <div v-if="finished && !isConnectionEstablished" class="console-line">
            &gt; STATUS: Waiting{{ ".".repeat(waitingDots) }}{{ " ".repeat(3 - waitingDots) }}
          </div>
        </div>
        <CButton v-if="finished" class="mobile-toggle-btn" @click="isSnakeVisibleOnMobile = true">
          Открыть "Змейку"
        </CButton>
      </div>
      <div v-show="isSnakeVisibleOnMobile || isDesktop" class="snake-wrapper">
        <Snake v-show="finished" />
        <CButton v-if="isSnakeVisibleOnMobile" class="mobile-toggle-btn" variant="secondary" @click="isSnakeVisibleOnMobile = false">
          В консоль ожидания
        </CButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

defineProps<{
  logs: string[];
  finished: boolean;
  isConnectionEstablished: boolean;
  waitingDots: number;
}>();

const isSnakeVisibleOnMobile = ref(false);
const isDesktop = ref(true);

const LAPTOP_WIDTH = 960;

const updateDeviceState = () => {
  isDesktop.value = window.innerWidth > LAPTOP_WIDTH;
  if (isDesktop.value) {
    isSnakeVisibleOnMobile.value = false;
  }
};

onMounted(() => {
  updateDeviceState();
  window.addEventListener("resize", updateDeviceState);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateDeviceState);
});
</script>

<style scoped lang="scss">
$app-laptop: 960px;
$app-mobile: 600px;

.chat-waiting {
  color: var(--app-text-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 24px;
  @media screen and (max-width: $app-laptop) {
    position: static;
    transform: translate(0, 0);
  }
  .waiting-shell {
    display: flex;
    gap: 72px;
    width: max-content;
    max-width: 100%;
    align-items: center;
    justify-content: center;
    @media screen and (max-width: $app-laptop) {
      flex-direction: column;
      gap: 24px;
      width: 100%;
    }
    .console-window-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      max-width: 100%;
      height: calc(100vh - 48px);
      justify-content: center;
      @media screen and (max-width: $app-laptop) {
        height: auto;
      }
    }
    .console-window {
      width: 400px;
      max-width: 100%;
      overflow-wrap: anywhere;
      padding: 16px;
      height: 400px;
      overflow-y: auto;
      border-radius: 16px;
    }
    .console-line {
      font-family: "Courier New", monospace;
      color: var(--color-primary-on-text);
      margin: 0;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .blink {
      animation: blink 1s steps(1) infinite;
    }

    .snake-wrapper {
      position: relative;
      max-width: 100%;
      height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      @media screen and (max-width: $app-laptop) {
        height: auto;
        padding-bottom: 24px;
      }
    }

    .mobile-toggle-btn {
      display: none;
      @media screen and (max-width: $app-laptop) {
        display: flex;
      }
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
