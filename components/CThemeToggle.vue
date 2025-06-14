<template>
  <Button :icon="themeIcon" @click="toggleTheme" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const theme = ref<'light'|'dark'>('light')
const themeIcon = computed(() => theme.value === 'light' ? 'pi pi-moon' : 'pi pi-sun')

function apply() {
  document.documentElement.classList.toggle('theme-dark', theme.value === 'dark')
}
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.theme = theme.value
  apply()
}

onMounted(() => {
  const saved = localStorage.theme as 'light'|'dark'|undefined
  theme.value = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  apply()
})
</script>
