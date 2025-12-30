<template>
  <div
    class="page-container"
    :class="{
      'page-container--no-header': !route.meta.header,
    }"
  >
    <div class="page-content">
      <CDialogImages />
      <CDialogVideo />
      <CAlert />
      <section class="page-content__header">
        <CHeader v-if="route.meta.header" :menuItems="menuItems"></CHeader>
      </section>
      <NuxtPage />
    </div>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const menuItems = [
  {
    label: "Главная",
    link: "/",
  },
  {
    label: "О проекте",
    link: "/about",
    disabled: true,
  },
];
function goBack() {
  navigateTo("/");
}
</script>
<style scoped lang="scss">
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: var(--color-bg-on-secondary);
  padding-top: 72px;
  &--no-header {
    padding-top: 0;
  }
  .page-content {
    height: 100%;
    width: 100%;
  }
}
</style>
