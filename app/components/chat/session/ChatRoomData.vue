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
          <div class="room-data__icon-wrapper">
            <NuxtImg src="/icons/chat/room/door.svg" width="32px" height="32px" />
          </div>
          <h3 class="room-data__block-title">О комнате</h3>
        </div>
        <div class="room-data__block-content">
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

      <!-- Members Block -->
      <div class="room-data__block">
        <div class="room-data__block-header">
          <div class="room-data__icon-wrapper">
            <NuxtImg src="/icons/chat/room/people.svg" width="32px" height="32px" />
          </div>
          <h3 class="room-data__block-title">Участники</h3>
        </div>
        <div class="room-data__block-content">
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

      <!-- Network Block -->
      <div class="room-data__block">
        <div class="room-data__block-header">
          <div class="room-data__icon-wrapper">
            <NuxtImg src="/icons/chat/room/network.svg" width="32px" height="32px" />
          </div>
          <h3 class="room-data__block-title">Сеть</h3>
        </div>
        <div class="room-data__block-content">
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
      <div class="room-data__footer-action" @click="$emit('endSession')">
        <div class="room-data__icon-wrapper">
          <NuxtImg
            class="room-data__footer-end-session"
            src="/icons/chat/room/power_off.svg"
            width="32px"
            height="32px"
          />
        </div>
        <!-- Use a span instead of CButton for smoother transition control or wrap CButton -->
        <div class="room-data__footer-text">
          <span>Завершить сеанс</span>
        </div>
      </div>

      <div class="room-data__footer-expand-wrapper" @click="$emit('toggleExpand')">
        <NuxtImg
          class="room-data__footer-expand"
          src="/icons/chat/room/arrow_expand_right.svg"
          width="32px"
          height="32px"
        />
      </div>
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

  /* Liquid Glass Container */

  backdrop-filter: var(--liquid-glass-backdrop);
  border: var(--liquid-glass-border);
  box-shadow: var(--liquid-glass-shadow);
  border-radius: var(--radius-lg);

  will-change: width;
  transition: width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding-bottom: 24px;

  /* Calculation for perfect centering in compact mode (92px width) */
  /* (92px - 32px icon) / 2 = 30px padding */
  --content-padding-left: 30px;

  /* Icon Wrapper - Stable width for smoothness */
  &__icon-wrapper {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    img {
      display: block;
      background: transparent;
    }
  }

  @media screen and (max-width: $app-desktop) {
    order: 3;
    width: 100%;
    height: 100vh;
    border-radius: 0;
    border: none;
    &__footer-expand-wrapper {
      display: none;
    }
  }

  /* Compact State Styles */
  &--compact {
    width: 92px;

    .room-data__title-wrapper,
    .room-data__block-title,
    .room-data__block-content,
    .room-data__footer-text {
      opacity: 0;
      pointer-events: none;
    }

    /* In compact, we let the container width clip the content.
       Icons stay fixed because padding-left is constant. */

    .room-data__footer-action {
      width: 48px; /* Circle shape */
      padding: 8px; /* Adjust padding to center icon in 48px box */
      background: transparent;
      border: 1px solid transparent; /* Maintain definition if needed */

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    /* Center the expand arrow by margin in compact if needed,
       but if we align everything left with padding 30px,
       the arrow needs to align with icons too. */
    .room-data__footer-expand-wrapper {
      padding-left: var(--content-padding-left);
      justify-content: flex-start; /* keep aligned with other icons */
    }

    .room-data__footer-expand {
      transform: rotate(-180deg);
    }
  }

  /* Transition properties */
  &__title-wrapper,
  &__block-title,
  &__block-content,
  &__footer-text {
    transition: opacity 0.2s ease; /* Faster fade out so it doesn't bleed */
    opacity: 1;
  }

  &__header {
    background-color: transparent;
    /* Use fixed padding-left for alignment stability */
    padding: 24px var(--content-padding-left) 16px var(--content-padding-left);
    display: flex;
    align-items: center;
    gap: 16px;
    height: 80px;

    .room-data__title {
      color: var(--color-primary-on-text);
      font-size: 32px;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  &__body {
    display: flex;
    gap: 32px;
    flex-direction: column;
    /* Padding right can be standard, left must be fixed */
    padding: 0 24px 0 0;
    overflow-y: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    /* Blocks */
    .room-data__block {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .room-data__block-header {
        display: flex;
        align-items: center;
        gap: 16px;
        height: 32px;
        padding-left: var(--content-padding-left);
        transition: all 0.3s ease;
      }

      .room-data__block-title {
        color: var(--color-primary-on-text);
        font-size: 18px;
        font-weight: 500;
        opacity: 0.9;
        white-space: nowrap;
      }

      .room-data__block-content {
        /* This wrapper allows us to fade out the list while keeping structure */
      }

      .room-data__block-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        /* Add left padding to list to indent it or keep it aligned?
           User wants icons on one level. The data rows (cards) are below headers.
           Let's align data rows with the logical content start (left of icons? or indented?)
           Standard UI: Data is indented.
           Let's use the same padding-left for consistency of container. */
        padding-left: var(--content-padding-left);
        padding-right: 24px; /* Right padding for the cards */
        margin-left: 48px;
        .room-data__block-item {
          display: flex;
          justify-content: space-between;
          align-items: center;

          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          transition: background 0.3s ease;

          /* Ensure fixed height or min-width so they don't squash immediately? */
          min-width: 300px; /* Keep content wide enough so it just gets clipped by parent */

          &:hover {
            background: rgba(255, 255, 255, 0.06);
          }

          .room-data__block-label {
            font-size: 16px;
            color: var(--color-neutral-on-text);
            opacity: 0.8;
          }
          .room-data__block-value {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 14px;
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
    justify-content: space-between;
    /* Remove centering, use padding for alignment */
    align-items: flex-start;
    margin-top: 24px;
    padding: 24px 0 24px var(--content-padding-left);
    gap: 24px;
  }

  .room-data__footer-action {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    margin: 0 auto;
    /* Fixed height for smoother pill-to-circle transition */
    /* Make it occupy width in expanded, shrink in compact */
    width: 100%;
    max-width: 240px; /* Limit max pill width */

    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-pill);
    cursor: pointer;
    overflow: hidden;
    transition:
      width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
      background 0.3s ease,
      padding 0.4s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .room-data__footer-text {
      color: var(--color-negative-on-text);
      font-weight: 500;
      white-space: nowrap;
    }
  }

  /* Icon wrapper inside footer button needs to be stable */
  .room-data__footer-action .room-data__icon-wrapper {
    margin-left: -4px; /* Adjust for padding difference in pill vs circle */
  }

  .room-data__footer-expand-wrapper {
    width: 100%;
    display: flex;
    /* Aligned left to match icons */
    justify-content: flex-start;
    /* No extra padding needed here as parent has padding-left */
    padding: 12px 0;
    cursor: pointer;
  }

  /* Compact override for footer alignment checks */
  &--compact {
    .room-data__footer-action {
      width: 48px;
      padding: 0; /* Clear padding to let flex center the icon */
      justify-content: center;

      .room-data__icon-wrapper {
        margin-left: 0;
      }
    }

    /* Make sure the arrow stays centered in the 92px container */
    .room-data__footer-expand-wrapper {
      /* Parent padding-left is 30px.
         If we want arrow centered in 92px, that's 30px from left.
         Since the icon is 32px, it sits exactly where other icons sit.
         So justify-start is correct. */
    }
  }

  .room-data__footer-expand {
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    opacity: 0.6;
    &:hover {
      opacity: 1;
    }
  }
}

.circle-state {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  &--active {
    background-color: var(--color-positive-on-fill);
    box-shadow: 0 0 8px var(--color-positive-on-fill);
  }
  &--error {
    background-color: var(--color-negative-on-fill);
  }
}
</style>
