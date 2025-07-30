<template>
  <header class="layout-header">
    <div class="layout-header__logo-container">
      <NuxtImg src="/icons/logo.svg" width="56px"></NuxtImg>
    </div>
    <div class="layout-header__menu-container">
      <nav class="nav-menu">
        <ul class="nav-menu__list">
          <li v-for="item in menuItems" class="nav-menu__item">
            <NuxtLink
              :to="item.link"
              class="nav-menu__link"
              :class="{ 'nav-menu__link--active': router.currentRoute.value.path === item.link }"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <CThemeToggle></CThemeToggle>
    </div>
  </header>
</template>

<script setup lang="ts">
const router = useRouter();
interface Props {
  menuItems: { label: string; link: string }[];
}
const props = defineProps<Props>();
</script>

<style scoped lang="scss">
.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: max-content;
  padding: 0px 24px;
  width: 100%;
  height: 72px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  background-color: var(--color-bg-on-primary);
  &__menu-container {
    display: flex;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
    gap: 48px;
  }
  .nav-menu {
    display: flex;
    width: 20%;
    height: 100%;
    justify-content: space-between;
    align-items: center;
    &__list {
      display: flex;
      height: 100%;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      list-style: none;
    }
    &__item {
      display: flex;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
    }
    &__link {
      color: #fff;
      font-size: 18px;
      font-weight: 400;
      text-decoration: none;
      transition: color 0.2s ease;
      &:hover {
        color: var(--color-primary-on-text-hover);
      }
      &:active {
        color: var(--color-primary-on-text-active);
      }
      &--active {
        color: var(--color-primary-on-text);
      }
    }
  }
}
</style>
