<template>
  <CContentDropdown
    :width="width"
    :topOffset="topOffset"
    :leftOffset="leftOffset"
    :contentStyles="contentStyles"
    :targetStyles="targetStyles"
    :isOpened="isOpened"
    @close="isOpened = false"
    :variant="variant"
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
import { ref } from "vue";

interface Offset {
  up: number;
  down: number;
}

const props = defineProps<{
  /** Ширина выпадающего блока */
  width?: string;
  /** Отступ сверху (up) и снизу (down) */
  topOffset?: Offset;
  variant?: "fixed" | "absolute";
  /** Отступ слева */
  leftOffset?: number;
  /** Дополнительные стили для блока с контентом */
  contentStyles?: Record<string, string>;
  /** Дополнительные стили для целевого элемента */
  targetStyles?: Record<string, string>;
  /** Текст кнопки, если слот button не передан */
  buttonText?: string;
  /** Управление состоянием извне (необязательно) */
  modelValue?: boolean;
}>();

const emit = defineEmits<(e: "update:modelValue", v: boolean) => void>();

// локальное состояние, если не используется v-model
const isOpened = ref(props.modelValue ?? false);

watch(
  () => props.modelValue,
  (v) => {
    if (typeof v === "boolean") isOpened.value = v;
  },
);

function toggle() {
  isOpened.value = !isOpened.value;
  emit("update:modelValue", isOpened.value);
}

const {
  width = "fit-content",
  topOffset = { up: 0, down: 0 },
  leftOffset = 0,
  contentStyles = {},
  targetStyles = {},
  buttonText = "Toggle",
} = props;
</script>

<style scoped lang="scss">
.c-button-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background 0.3s ease;
  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }
  &:active {
    background: rgba(0, 0, 0, 0.3);
  }
}
</style>
