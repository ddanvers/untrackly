<template>
  <div
    ref="hintElement"
    class="hint"
    :style="{ opacity: isParentHovered ? 1 : 0 }"
    :class="{
      'hint--force-center-left': props.forceCenter === 'left',
      'hint--force-center-right': props.forceCenter === 'right',
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  topOffset?: string;
  leftOffset?: string;
  forceCenter?: "left" | "right";
}

const props = withDefaults(defineProps<Props>(), {
  topOffset: "0px",
  leftOffset: "0px",
});

const hintElement = ref<HTMLElement | null>(null);
const isParentHovered = ref(false);

onMounted(() => {
  hintElement.value?.parentElement?.addEventListener("mouseover", () => {
    isParentHovered.value = true;
  });
  hintElement.value?.parentElement?.addEventListener("mouseout", () => {
    isParentHovered.value = false;
  });
});
</script>

<style scoped lang="scss">
.hint {
  position: absolute;
  display: flex;
  padding: 4px 8px;
  justify-content: center;
  align-items: center;
  gap: 10px;
  left: calc(50% + v-bind("props.leftOffset"));
  top: calc(100% + 16px + v-bind("props.topOffset"));
  transform: translateX(-50%);
  background: var(--color-neutral-on-fill);
  box-shadow: 0px 3px 8px 0px rgba(0, 0, 0, 0.2);
  color: var(--color-neutral-on-text);
  width: max-content;
  z-index: 10;
  transition: opacity 0.3s ease;
  pointer-events: none;

  font-weight: 400;
  font-size: 13px;
  line-height: 100%;
  text-align: center;
  &--force-center-left {
    left: 0;
    transform: translateX(0);
  }
  &--force-center-right {
    left: auto;
    right: 0;
    transform: translateX(0);
  }
}
</style>
