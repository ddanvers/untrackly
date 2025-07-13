<template>
  <div
    class="dropdown-container"
    :style="{
      width: props.width,
    }"
  >
    <div ref="target" class="container-target">
      <slot name="target"></slot>
    </div>
    <Transition name="fade">
      <div
        v-click-outside="closeContent"
        v-show="isOpened"
        ref="content"
        :class="['container-content', { absolute: props.variant === 'absolute' }]"
      >
        <slot name="content"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const target = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const props = defineProps({
  topOffset: {
    type: Object,
    default: () => ({
      up: 0,
      down: 0,
    }),
  },
  leftOffset: {
    type: Number,
    default: 0,
  },
  variant: {
    type: String as () => "fixed" | "absolute",
    default: "fixed",
  },
  contentStyles: {
    type: Object,
    default: null,
  },
  targetStyles: {
    type: Object,
    default: null,
  },
  width: {
    type: String,
    defaul: "fit-content",
  },
  isOpened: {
    type: Boolean,
    default: false,
  },
});
const emits = defineEmits(["close"]);

const resizeObserver = ref(null);

function closeContent() {
  emits("close");
}

const positionContent = () =>
  nextTick(() => {
    if (!target.value || !content.value || props.variant === "absolute") return;
    const targetRect = target.value.getBoundingClientRect();
    console.log("[positionContent] targetRect", targetRect);
    const contentRect = content.value.getBoundingClientRect();
    let top = targetRect.bottom;
    let left = targetRect.left;
    if (
      top + content.value.clientHeight >
      document.documentElement.clientHeight - 16
    ) {
      top =
        top -
        targetRect.height -
        content.value.clientHeight -
        props.topOffset.down;
    } else {
      top = top + props.topOffset.up;
    }
    if (
      top + content.value.clientHeight >
      document.documentElement.clientHeight - 16
    ) {
      top =
        document.documentElement.clientHeight - content.value.clientHeight - 16;
    }
    if (top < 0) {
      top = 0;
    }

    if (
      left + props.leftOffset + contentRect.width >
      document.documentElement.clientWidth - 16
    ) {
      left = targetRect.right - contentRect.width - props.leftOffset;
      if (left < 0) {
        left = 0;
      }
    }

    content.value.style.top = `${top}px`;
    content.value.style.left = `${left + props.leftOffset}px`;
  });

const applyStylesToElement = (styleOptions, element) => {
  if (element && styleOptions) {
    Object.entries(styleOptions).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  }
};

function addListeners() {
  if (props.variant === "absolute") return;
  document.documentElement.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);
  if (content.value) {
    resizeObserver.value = new ResizeObserver(positionContent);
    resizeObserver.value.observe(content.value);
  }
}

function removeListeners() {
  if (props.variant === "absolute") return;
  document.documentElement.addEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onResize);
  resizeObserver.value?.disconnect();
}

const onResize = () => {
  positionContent();
};

const onScroll = () => {
  positionContent();
};

onMounted(() => {
  positionContent();
  applyStylesToElement(props.contentStyles, content.value);
  applyStylesToElement(props.targetStyles, target.value);
  addListeners();
});

onBeforeUnmount(() => {
  removeListeners();
});

watch(
  () => props.isOpened,
  (newVal) => {
    if (newVal) positionContent();
  },
);
</script>

<style scoped lang="scss">
.dropdown-container {
  position: relative;
  width: fit-content;
  display: flex;
  .container-target {
    position: relative;
    width: fit-content;
    display: flex;
  }
  .container-content {
    z-index: 1000;
  }
  .container-content.absolute {
    position: absolute;
  }
  .container-content:not(.absolute) {
    position: fixed;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
  opacity: 1;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
