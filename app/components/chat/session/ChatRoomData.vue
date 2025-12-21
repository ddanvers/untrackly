<template>
  <div class="room-data" :class="{ 'room-data--compact': !expanded }">
    <header class="room-data__header">
      <div class="room-data__icon-wrapper">
        <NuxtImg src="/icons/chat/room/info.svg" width="32px" height="32px" />
      </div>
      <div class="room-data__title-wrapper">
        <h2 class="room-data__title">Данные комнаты</h2>
      </div>
    </header>

    <section class="room-data__body">
      <!-- Room Info Block -->
      <div class="room-data__block">
        <div class="room-data__block-header">
          <CHint :isShow="!expanded" position="right" text="О комнате"
            ><NuxtImg src="/icons/chat/room/door.svg" width="32px" height="32px"
          /></CHint>
          <h3 class="room-data__block-title">О комнате</h3>
        </div>
        <div class="room-data__block-content">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">ID</div>
              <div class="room-data__block-value room-data__block-value--mono">
                {{ roomData.room?.id }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Дата создания</div>
              <div class="room-data__block-value">
                {{ formatUTCDateIntl(roomData.room?.dateCreated) }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Дата изменения</div>
              <div class="room-data__block-value">
                {{ formatUTCDateIntl(roomData.room?.dateUpdated) }}
              </div>
            </li>
          </ul>
        </div>
      </div>
      <!-- Members Block -->
      <div class="room-data__block">
        <div class="room-data__block-header">
          <CHint :isShow="!expanded" position="right" text="Участники"
            ><NuxtImg src="/icons/chat/room/people.svg" width="32px" height="32px"
          /></CHint>
          <h3 class="room-data__block-title">Участники</h3>
        </div>
        <div class="room-data__block-content">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">Вы</div>
              <div class="room-data__block-value">
                <div
                  class="status-indicator"
                  :class="{
                    'status-indicator--online': true,
                    'status-indicator--offline': false,
                  }"
                />
                {{ roomData.members?.yourStatus }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Собеседник</div>
              <div class="room-data__block-value">
                <div
                  class="status-indicator"
                  :class="{
                    'status-indicator--online': roomData.members?.companionStatus === 'online',
                    'status-indicator--offline': roomData.members?.companionStatus === 'offline',
                  }"
                />
                {{ roomData.members?.companionStatus }}
              </div>
            </li>
          </ul>
        </div>
      </div>
      <!-- Network Block -->
      <div class="room-data__block">
        <div class="room-data__block-header">
          <CHint :isShow="!expanded" position="right" text="Сеть"
            ><NuxtImg src="/icons/chat/room/network.svg" width="32px" height="32px"
          /></CHint>
          <h3 class="room-data__block-title">Сеть</h3>
        </div>
        <div class="room-data__block-content">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">Подключение</div>
              <div class="room-data__block-value">
                <div
                  class="status-indicator"
                  :class="{
                    'status-indicator--online': roomData.network?.connectionStatus === 'connected',
                    'status-indicator--offline':
                      roomData.network?.connectionStatus === 'failed' ||
                      roomData.network?.connectionStatus === 'disconnected',
                  }"
                />
                {{ roomData.network?.connectionStatus }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Отправлено</div>
              <div class="room-data__block-value room-data__block-value--data">
                {{ formatBytesToMB(roomData.network?.sentBytes) }} MB
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Получено</div>
              <div class="room-data__block-value room-data__block-value--data">
                {{ formatBytesToMB(roomData.network?.receivedBytes) }} MB
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <footer class="room-data__footer">
      <div v-show="expanded" class="room-data__end-session-wrapper">
        <CButton
          variant="quaternary"
          button-type="button"
          textColor="var(--color-negative-on-text)"
          @click="$emit('endSession')"
        >
          Завершить сеанс
        </CButton>
      </div>
      <div v-show="!expanded" class="room-data__end-session-wrapper">
        <CHint :isShow="!expanded" position="right" text="Завершить сеанс">
          <CButton
            variant="icon-default"
            button-type="button"
            iconColor="var(--color-negative-on-text)"
            @click="$emit('endSession')"
            icon-size="i-large"
          >
            <NuxtImg src="/icons/chat/room/power_off.svg" width="32px" height="32px" /> </CButton
        ></CHint>
      </div>
      <CButton
        class="room-data__footer-expand"
        variant="icon-default"
        icon-size="i-large"
        @click="$emit('toggleExpand')"
      >
        <NuxtImg src="/icons/chat/room/arrow_expand_right.svg" width="32px" height="32px" />
      </CButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { RoomData } from "~/composables/peer/types";

defineProps<{
  roomData: RoomData;
  expanded: boolean;
}>();

defineEmits<{
  (e: "endSession"): void;
  (e: "toggleExpand"): void;
}>();

const formatUTCDateIntl = (date?: string) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date(date));
};

const formatBytesToMB = (bytes?: number) => {
  if (bytes === undefined) return "0.00";
  return (bytes / 1024 / 1024).toFixed(2);
};
</script>

<style scoped lang="scss">
$app-desktop: 1384px;
$transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
$transition-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

.room-data {
  display: flex;
  flex-direction: column;
  width: 582px;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;

  /* Liquid Glass Container */
  backdrop-filter: var(--liquid-glass-backdrop);
  box-shadow: var(--liquid-glass-shadow);

  will-change: width;
  transition: width 0.5s $transition-smooth;
  padding-bottom: 24px;

  --content-padding-left: 20px;

  @media screen and (max-width: $app-desktop) {
    order: 3;
    width: 100%;
    height: 100vh;
    border-radius: 0;
    border: none;
  }

  /* Compact State Styles */
  &--compact {
    width: 74px;

    .room-data__title-wrapper,
    .room-data__block-title,
    .room-data__block-content {
      opacity: 0;
      transform: translateX(-10px);
      pointer-events: none;
    }

    .room-data__footer-expand-wrapper {
      padding-left: var(--content-padding-left);
      justify-content: flex-start;
    }

    .room-data__footer-expand {
      transform: rotate(-180deg);
    }
  }

  /* Transition properties */
  &__title-wrapper,
  &__block-title,
  &__block-content,
  &__divider {
    transition:
      opacity 0.3s $transition-smooth,
      transform 0.3s $transition-smooth;
    opacity: 1;
    transform: translateX(0);
  }

  &__header {
    background-color: transparent;
    padding: 24px var(--content-padding-left) 16px var(--content-padding-left);
    display: flex;
    align-items: center;
    gap: 16px;
    height: 80px;
    margin-bottom: 12px;
    .room-data__title {
      color: var(--color-primary-on-text);
      font-size: 28px;
      font-weight: 600;
      white-space: nowrap;
      letter-spacing: -0.02em;
    }
  }

  /* Section Divider */
  &__divider {
    height: 1px;
    margin: 0 var(--content-padding-left) 0 calc(var(--content-padding-left) + 48px);
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  &__body {
    display: flex;
    gap: 24px;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    /* Blocks */
    .room-data__block {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .room-data__block-header {
        display: flex;
        align-items: center;
        gap: 16px;
        height: 32px;
        padding-left: var(--content-padding-left);
        transition: all 0.3s $transition-smooth;
      }

      .room-data__block-title {
        color: var(--color-primary-on-text);
        font-size: 16px;
        font-weight: 500;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .room-data__block-content {
        /* Wrapper for list */
      }

      .room-data__block-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-left: var(--content-padding-left);
        padding-right: 24px;
        margin-left: 48px;
        @media screen and (max-width: $app-desktop) {
          margin-left: 0;
        }
        .room-data__block-item {
          display: flex;
          justify-content: space-between;
          align-items: center;

          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          transition:
            background 0.25s $transition-smooth,
            border-color 0.25s $transition-smooth,
            transform 0.2s $transition-smooth;

          min-width: 300px;

          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.08);
            transform: translateX(4px);
          }

          .room-data__block-label {
            font-size: 15px;
            color: var(--color-neutral-on-text);
            font-weight: 400;
          }

          .room-data__block-value {
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 14px;
            color: var(--color-neutral-on-muted);

            &--mono {
              font-family: "JetBrains Mono", "Fira Code", monospace;
              font-size: 12px;
              letter-spacing: -0.02em;
            }

            &--data {
              font-variant-numeric: tabular-nums;
              font-weight: 500;
            }
          }
        }
      }
    }
  }

  &__footer {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    gap: 24px;
  }

  &__end-session-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
  }
  &__footer-expand-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    cursor: pointer;
    transition: opacity 0.2s $transition-smooth;
    margin-bottom: 12px;
  }

  &__footer-expand {
    transition: transform 0.4s $transition-smooth;
    margin-right: auto;
  }
}

/* Status Indicator */
.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;

  &--online {
    background-color: var(--color-positive-on-fill);
    box-shadow: 0 0 10px var(--color-positive-on-fill);

    /* Pulse animation */
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--color-positive-on-fill);
      animation: pulse 2s ease-in-out infinite;
    }
  }

  &--offline {
    background-color: var(--color-negative-on-fill);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0;
    transform: scale(2);
  }
}
</style>
