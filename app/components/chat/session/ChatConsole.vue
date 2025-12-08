<template>
  <section class="chat-waiting" aria-label="Ожидание подключения собеседника">
    <div class="waiting-shell">
      <div class="console-window-wrapper">
        <div class="console-window liquid-glass">
          <p class="console-line" v-for="(msg, i) in logs" :key="i">&gt; {{ msg }}</p>
          <div v-if="!finished" class="console-line blink">|</div>
          <div v-if="finished && !isConnectionEstablished" class="console-line">
            &gt; STATUS: Waiting{{ ".".repeat(waitingDots) }}{{ " ".repeat(3 - waitingDots) }}
          </div>
        </div>
      </div>
      <div class="snake-wrapper">
        <Snake v-show="finished" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  logs: string[];
  finished: boolean;
  isConnectionEstablished: boolean;
  waitingDots: number;
}>();
</script>

<style scoped lang="scss">
$app-mobile: 600px;

.chat-waiting {
  color: var(--app-text-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 24px;
  @media screen and (max-width: $app-mobile) {
    position: static;
    transform: translate(0, 0);
  }
  .waiting-shell {
    display: flex;
    flex-wrap: wrap;
    gap: 72px;
    width: max-content;
    max-width: 100%;
    align-items: center;
    justify-content: center;
    @media screen and (max-width: $app-mobile) {
      flex-direction: column;
    }
    .console-window-wrapper {
      display: flex;
      align-items: center;
      max-width: 100%;
      height: calc(100vh - 48px);
    }
    .console-window {
      width: 400px;
      max-width: 100%;
      overflow-wrap: anywhere;
      padding: 16px;
      height: 400px;
      overflow-y: auto;
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
      align-items: center;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
