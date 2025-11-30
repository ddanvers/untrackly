<template>
  <div class="room-data" :class="{ 'room-data--compact': !expanded }">
    <header class="room-data__header">
      <NuxtImg
        class="room-data__compact-img"
        src="/icons/chat/room/info.svg"
        width="32px"
      ></NuxtImg>
      <h2 class="room-data__title">Данные комнаты</h2>
    </header>
    <section class="room-data__body">
      <div class="room-data__block">
        <NuxtImg
          class="room-data__compact-img"
          src="/icons/chat/room/door.svg"
          width="32px"
        ></NuxtImg>
        <h3 class="room-data__block-title">О комнате</h3>
        <div class="room-data__block-info">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">ID</div>
              <div class="room-data__block-value">{{ roomData.room?.id }}</div>
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
      <div class="room-data__block">
        <NuxtImg
          class="room-data__compact-img"
          src="/icons/chat/room/people.svg"
          width="32px"
        ></NuxtImg>
        <h3 class="room-data__block-title">Участники</h3>
        <div class="room-data__block-info">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">Вы</div>
              <div class="room-data__block-value">
                <div
                  class="circle-state"
                  :class="{
                    'circle-state--active': true,
                    'circle-state--error': false,
                  }"
                ></div>
                {{ roomData.members?.yourStatus }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Собеседник</div>
              <div class="room-data__block-value">
                <div
                  class="circle-state"
                  :class="{
                    'circle-state--active': roomData.members?.companionStatus === 'online',
                    'circle-state--error': roomData.members?.companionStatus === 'offline',
                  }"
                ></div>
                {{ roomData.members?.companionStatus }}
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div class="room-data__block">
        <NuxtImg
          class="room-data__compact-img"
          src="/icons/chat/room/network.svg"
          width="32px"
        ></NuxtImg>
        <h3 class="room-data__block-title">Сеть</h3>
        <div class="room-data__block-info">
          <ul class="room-data__block-list">
            <li class="room-data__block-item">
              <div class="room-data__block-label">Подключение</div>
              <div class="room-data__block-value">
                <div
                  class="circle-state"
                  :class="{
                    'circle-state--active': roomData.network?.connectionStatus === 'connected',
                    'circle-state--error':
                      roomData.network?.connectionStatus === 'failed' ||
                      roomData.network?.connectionStatus === 'disconnected',
                  }"
                ></div>
                {{ roomData.network?.connectionStatus }}
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Отправлено</div>
              <div class="room-data__block-value">
                {{ formatBytesToMB(roomData.network?.sentBytes) }} MB
              </div>
            </li>
            <li class="room-data__block-item">
              <div class="room-data__block-label">Получено</div>
              <div class="room-data__block-value">
                {{ formatBytesToMB(roomData.network?.receivedBytes) }} MB
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
    <footer class="room-data__footer">
      <div @click="$emit('endSession')">
        <NuxtImg
          class="room-data__footer-end-session room-data__compact-img"
          src="/icons/chat/room/power_off.svg"
          width="32px"
        ></NuxtImg>
        <CButton
          class="room-data__footer-button"
          variant="quaternary"
          textColor="var(--color-negative-on-text)"
          >Завершить сеанс</CButton
        >
      </div>
      <NuxtImg
        @click="$emit('toggleExpand')"
        class="room-data__footer-expand"
        src="/icons/chat/room/arrow_expand_right.svg"
        width="32px"
      ></NuxtImg>
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

.room-data {
  display: flex;
  flex-direction: column;
  width: 582px;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  border-right: 1px solid var(--color-neutral-on-outline);
  will-change: width;
  transition: width 0.3s ease;
  padding-bottom: 24px;
  @media screen and (max-width: $app-desktop) {
    order: 3;
    width: 100%;
    height: 100vh;
    &__footer-expand {
      display: none;
    }
  }
  .room-data__compact-img {
    display: none;
  }
  @media screen and (min-width: $app-desktop) {
    &--compact {
      width: 92px;
      .room-data__block-info,
      .room-data__block-title,
      .room-data__footer-button,
      .room-data__title {
        display: none;
      }
      .room-data__compact-img {
        display: block;
      }
      .room-data__body,
      .room-data__header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
      }
      .room-data__footer-expand {
        transform: rotate(-180deg);
      }
      .room-data__footer-end-session,
      .room-data__footer-expand {
        cursor: pointer;
      }
    }
  }
  &__header {
    background-color: var(--color-bg-on-primary);
    padding: 24px;
    .room-data__title {
      color: var(--color-primary-on-text);
      font-size: 32px;
    }
  }
  &__body {
    display: flex;
    gap: 8px;
    flex-direction: column;
    .room-data__block {
      display: flex;
      gap: 12px;
      flex-direction: column;
      .room-data__block-title {
        padding: 12px;
        color: var(--color-primary-on-text);
        font-size: 18px;
        border-bottom: 1px solid var(--color-neutral-on-outline);
      }
      .room-data__block-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        .room-data__block-item {
          display: flex;
          gap: 24px;
          .room-data__block-label {
            font-size: 16px;
            width: 160px;
            padding: 12px;
            color: var(--color-neutral-on-text);
          }
          .room-data__block-value {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 14px;
            padding: 12px;
            color: var(--color-neutral-on-muted);
          }
        }
      }
    }
  }
  .room-data__footer {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    justify-content: center;
    align-items: center;
    margin-top: 48px;
  }
  &__footer-expand {
    margin-top: auto;
    margin-left: 24px;
    margin-right: auto;
    cursor: pointer;
    transition: transform 0.3s ease;
  }
}

.circle-state {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  &--active {
    background-color: var(--color-positive-on-fill);
  }
  &--error {
    background-color: var(--color-negative-on-fill);
  }
}
</style>
