<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
<script setup lang="ts">
const { initE2EE } = useE2EE();
const { user } = useAuth();

onMounted(() => {
  if (user.value) {
    initE2EE();
  }
});

watch(user, (u) => {
  if (u) {
    initE2EE();
  }
});
</script>