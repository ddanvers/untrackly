<template>
  <div
    class="relative inline-block"
    ref="trigger"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focusin="onTriggerFocus"
    @focusout="onTriggerBlur"
    tabindex="0"
  >
    <slot />
    <Transition name="fade">
      <Teleport v-if="isVisible" to="body">
        <div
          ref="tooltip"
          class="tooltip"
          :class="[
            `size_${size}`,
            { interactive: props.interactive },
            { customContent: props.customContent },
          ]"
          :style="[tooltipStyle, { backgroundColor: backColor }]"
          role="tooltip"
          @mouseenter="onTooltipEnter"
          @mouseleave="onTooltipLeave"
        >
          <slot name="content">{{ text }}</slot>
        </div>
      </Teleport>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
type Props = {
  text?: string;
  position?: "top" | "bottom" | "left" | "right";
  secondaryVerticalPlacement?: "default" | "top" | "bottom";
  secondaryHorizontalPlacement?: "default" | "left" | "right";
  size?: "36" | "32" | "28";
  distance?: number;
  horizontalOffset?: number;
  delay?: number;
  isShow?: boolean;
  backColor?: string;
  interactive?: boolean;
  customContent?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  position: "top",
  secondaryVerticalPlacement: "default",
  secondaryHorizontalPlacement: "default",
  horizontalOffset: 0,
  isShow: true,
  size: "32",
  distance: 8,
  delay: 0,
  backColor: "var(--color-bg-on-secondary-light)",
  interactive: false,
});

const isVisible = ref(false);
const trigger = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null);

let showTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

const overTrigger = ref(false);
const overTooltip = ref(false);

const tooltipStyle = computed(() => {
  if (!trigger.value || !tooltip.value || !isVisible.value) return {};

  const triggerRect = trigger.value.getBoundingClientRect();
  const tooltipRect = tooltip.value.getBoundingClientRect();
  const { scrollY, scrollX } = window;

  const adjustForViewport = (
    pos: number,
    size: number,
    isHorizontal = false,
  ) => {
    const viewportSize = isHorizontal ? window.innerWidth : window.innerHeight;
    if (pos < 0) return 0;
    if (pos + size > viewportSize) return viewportSize - size;
    return pos;
  };

  const baseStyles = {
    top: {
      top: `${triggerRect.top + scrollY - tooltipRect.height - props.distance}px`,
      left: `${adjustForViewport(
        triggerRect.left +
          scrollX +
          (props.secondaryHorizontalPlacement === "default"
            ? triggerRect.height / 2 - tooltipRect.height / 2
            : props.secondaryHorizontalPlacement === "left"
              ? 0
              : triggerRect.width - tooltipRect.width) +
          props.horizontalOffset,
        tooltipRect.width,
        true,
      )}px`,
    },
    bottom: {
      top: `${triggerRect.bottom + scrollY + props.distance}px`,
      left: `${adjustForViewport(
        triggerRect.left +
          scrollX +
          (props.secondaryHorizontalPlacement === "default"
            ? triggerRect.height / 2 - tooltipRect.height / 2
            : props.secondaryHorizontalPlacement === "left"
              ? 0
              : triggerRect.width - tooltipRect.width) +
          props.horizontalOffset,
        tooltipRect.width,
        true,
      )}px`,
    },
    left: {
      top: `${adjustForViewport(
        triggerRect.top +
          scrollY +
          (props.secondaryVerticalPlacement === "default"
            ? triggerRect.height / 2 - tooltipRect.height / 2
            : props.secondaryVerticalPlacement === "top"
              ? 0
              : triggerRect.height - tooltipRect.height),
        tooltipRect.height,
      )}px`,
      left: `${triggerRect.left + scrollX - tooltipRect.width - props.distance}px`,
    },
    right: {
      top: `${adjustForViewport(
        triggerRect.top +
          scrollY +
          (props.secondaryVerticalPlacement === "default"
            ? triggerRect.height / 2 - tooltipRect.height / 2
            : props.secondaryVerticalPlacement === "top"
              ? 0
              : triggerRect.height - tooltipRect.height),
        tooltipRect.height,
      )}px`,
      left: `${triggerRect.right + scrollX + props.distance}px`,
    },
  };

  return baseStyles[props.position];
});
function doShowTooltip() {
  if (!props.isShow) return;

  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  if (showTimeoutId) clearTimeout(showTimeoutId);

  showTimeoutId = setTimeout(() => {
    isVisible.value = true;
    showTimeoutId = null;
  }, props.delay);
}

function doHideTooltipImmediate() {
  if (showTimeoutId) {
    clearTimeout(showTimeoutId);
    showTimeoutId = null;
  }
  isVisible.value = false;
}

function scheduleHideTooltip() {
  if (!props.interactive) {
    doHideTooltipImmediate();
    return;
  }

  if (hideTimeoutId) clearTimeout(hideTimeoutId);
  hideTimeoutId = setTimeout(() => {
    if (!overTrigger.value && !overTooltip.value) {
      isVisible.value = false;
    }
    hideTimeoutId = null;
  }, 200);
}

function onTriggerEnter() {
  overTrigger.value = true;
  doShowTooltip();
}

function onTriggerLeave() {
  overTrigger.value = false;
  scheduleHideTooltip();
}

function onTooltipEnter() {
  overTooltip.value = true;
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
  if (!isVisible.value) {
    isVisible.value = true;
  }
}

function onTooltipLeave() {
  overTooltip.value = false;
  scheduleHideTooltip();
}

function onTriggerFocus() {
  doShowTooltip();
}
function onTriggerBlur(event: FocusEvent) {
  if (props.interactive && tooltip.value) {
    const related = event.relatedTarget as Node | null;
    if (related && tooltip.value.contains(related)) {
      return;
    }
  }
  doHideTooltipImmediate();
}

function handleScroll() {
  if (isVisible.value) {
    doHideTooltipImmediate();
  }
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  doHideTooltipImmediate();
});
</script>

<style scoped lang="scss">
.tooltip {
  position: absolute;
  z-index: 1000;
  color: var(--color-black);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  pointer-events: none;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 200px;
  word-wrap: break-word;
  &.customContent {
    height: max-content;
    max-width: unset;
    padding: 0;
  }
}

.tooltip.interactive {
  pointer-events: auto;
}

.size_36 {
  min-height: 36px;
}
.size_32 {
  min-height: 32px;
}
.size_28 {
  min-height: 28px;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
