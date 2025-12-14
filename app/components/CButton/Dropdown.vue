<template>
  <CContentDropdown
    :width="width"
    :top-offset="topOffset"
    :left-offset="leftOffset"
    :content-styles="contentStyles"
    :target-styles="targetStyles"
    :is-opened="isOpened"
    :variant="variant"
    @close="handleClose"
  >
    <template #target>
      <button type="button" class="c-button-dropdown__trigger" @click="toggle">
        <slot name="button">
          {{ buttonText }}
        </slot>
      </button>
    </template>
    <template #content>
      <slot />
    </template>
  </CContentDropdown>
</template>

<script setup lang="ts">
import CContentDropdown from "@/components/CContentDropdown.vue";
import { ref, watch } from "vue";

interface Props {
  width?: string;
  topOffset?: DropdownOffset;
  variant?: "fixed" | "absolute";
  leftOffset?: number;
  contentStyles?: Record<string, string>;
  targetStyles?: Record<string, string>;
  buttonText?: string;
  modelValue?: boolean;
}

interface DropdownOffset {
  up: number;
  down: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: "fit-content",
  topOffset: () => ({ up: 0, down: 0 }),
  variant: "fixed",
  leftOffset: 0,
  contentStyles: () => ({}),
  targetStyles: () => ({}),
  buttonText: "Toggle",
  modelValue: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const isOpened = ref(props.modelValue ?? false);

function toggle(): void {
  isOpened.value = !isOpened.value;
  emit("update:modelValue", isOpened.value);
}

function handleClose(): void {
  isOpened.value = false;
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (typeof newValue === "boolean") {
      isOpened.value = newValue;
    }
  },
);
</script>

<style scoped lang="scss">
.c-button-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  transition: background 0.3s ease;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  &:active {
    background: rgba(0, 0, 0, 0.1);
  }
}
</style>
