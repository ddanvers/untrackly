<template>
  <video :src="src" controls :loop="true" :volume="0.6" />
</template>

<script setup lang="ts">
interface Props {
  src: string;
}

const props = defineProps<Props>();
</script>
