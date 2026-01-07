<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modelValue" class="c-dialog-backdrop" @mousedown="closeDialog">
          <div class="c-dialog">
            <div class="dialog-title">
              <slot name="title">
                <div class="text">
                  {{ mainTitle }}
                </div>
                <div v-if="showClose" class="close" @click="closeDialog">
                  <NuxtImg src="/icons/close.svg"></NuxtImg>
                </div>
              </slot>
            </div>
            <div class="line-divider" v-if="showHeaderDivider"></div>
            <div class="container-text">
              <slot name="content"> </slot>
            </div>
            <div class="line-divider" v-if="showFooterDivider"></div>
            <div class="dialog-footer">
              <slot name="footer">
                <div class="buttons">
                  <slot name="buttons">
                    <CButton v-if="secondaryButtonText" type="secondary" @click="secondaryAction">{{
                      secondaryButtonText
                    }}</CButton>
                    <CButton v-if="primaryButtonText" @click="primaryAction">{{
                      primaryButtonText
                    }}</CButton>
                  </slot>
                </div>
              </slot>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
<script setup lang="ts">
type Props = {
  modelValue: boolean;
  mainTitle?: string;
  secondaryButtonText?: string;
  primaryButtonText?: string;
  dividers?: string[];
  showClose?: boolean;
  noBackground?: boolean;
};
const props = withDefaults(defineProps<Props>(), {
  mainTitle: "",
  secondaryButtonText: "",
  primaryButtonText: "",
  showClose: false,
  noBackground: true,
  dividers: () => ["none"],
});

const showHeaderDivider = computed(() => {
  return props.dividers?.includes("top");
});
const showFooterDivider = computed(() => {
  return props.dividers?.includes("bottom");
});

const emits = defineEmits<{
  "update:modelValue": [boolean];
  primaryButtonAction: [() => void];
  secondaryButtonAction: [() => void];
}>();
function secondaryAction() {
  emits("secondaryButtonAction", closeDialog);
}
function primaryAction() {
  emits("primaryButtonAction", closeDialog);
}
function closeDialog(_event?: Event) {
  emits("update:modelValue", false);
}
</script>
<style></style>
<style lang="scss" scoped>
$dialog-padding: 16px;
.c-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  background: #000000ad;
  backdrop-filter: blur(4px);
  z-index: 10001;
  user-select: none;

  .c-dialog {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    position: relative;
    padding: $dialog-padding;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: fit-content;
    height: fit-content;
    max-width: calc(100vw - 32px); // Mobile constraint

    @media (min-width: 768px) {
      max-width: 600px; // Desktop constraint
    }

    .dialog-title {
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding-bottom: 8px;
      .text {
        font-weight: 600;
        color: var(--color-neutral-on-text);
      }
      .close {
        cursor: pointer;
        width: 24px;
        height: 24px;
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: var(--filter-neutral-on-text);
        }
      }
    }
    .line-divider {
      margin: 8px 0;
      width: calc(100% + $dialog-padding * 2);
      height: 0.1em;
      background: var(--color-neutral-on-outline);
    }
    .container-text {
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding: 8px 0;
      .text-info {
        color: var(--color-neutral-on-text);
        font-weight: 400;
        font-size: 14px;
        line-height: 120%;
      }
    }
    .dialog-footer {
      padding-top: 8px;
      display: flex;
      justify-content: flex-end;
      width: 100%;
      .buttons {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
