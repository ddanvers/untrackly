<template>
  <div class="page-container">
    <div class="page-content">
      <section class="page-content__header">
        <CHeader :menuItems="menuItems"></CHeader>
      </section>
      <NuxtPage />
    </div>
  </div>
</template>
<script setup lang="ts">
const router = useRouter();
const menuItems = [
  {
    label: "Главная",
    link: "/",
  },
  {
    label: "О проекте",
    link: "/about",
  },
];
function goBack() {
  navigateTo("/");
}
</script>
<style scoped lang="scss">
$app-desktop: 1294px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: var(--color-bg-on-secondary);
}
</style>
