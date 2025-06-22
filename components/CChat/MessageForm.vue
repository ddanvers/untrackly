<template>
  <form class="form" @submit.prevent="onSubmit">
    <!-- <button type="button" class="form__attach" @click="attach()">📎</button> -->
    <input
      v-model="text"
      class="form__input"
      type="text"
      placeholder="Ваше сообщение"
    />
    <button type="submit" class="form__send"><NuxtImg src="/icons/chat/send.svg"></NuxtImg></button>
  </form>
</template>

<script setup lang="ts">

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const text = ref('')

function onSubmit() {
  if (text.value.trim()) {
    emit('send', text.value.trim())
    text.value = ''
  }
}

function attach() {
  // сюда можно добавить логику выбора файла
  alert('Функция отправки файла пока не реализована')
}
</script>

<style lang="scss" scoped>
.form {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #0f0f2f;

  &__attach,
  &__send {
    background: none;
    border: none;
    color: #f5f5dc;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 .5rem;
  }

  &__input {
    flex: 1;
    padding: .75rem 1rem;
    border-radius: 1rem;
    border: none;
    margin: 0 .5rem;
    background: #f5eed9;
    color: #111;
    font-size: 1rem;
  }
}
</style>
