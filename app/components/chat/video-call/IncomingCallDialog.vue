<template>
  <section v-if="visible" class="video-call__incoming">
    <h3 class="video-call__incoming-title">Входящий звонок...</h3>
    <nav class="video-call__incoming-actions">
      <CButton variant="primary" @click="$emit('accept')">Принять</CButton>
      <CButton
        variant="quaternary"
        @click="$emit('decline')"
        textColor="var(--color-negative-on-text)"
        >Отклонить</CButton
      >
    </nav>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
}>();

defineEmits<{
  accept: [];
  decline: [];
}>();
</script>

<style scoped lang="scss">
.video-call__incoming {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 32px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  z-index: 1000;
}

.video-call__incoming-title {
  font-size: 24px;
  font-weight: 400;
  color: var(--color-primary-on-text);
  margin: 0;
}

.video-call__incoming-actions {
  display: flex;
  gap: 16px;
}
</style>
