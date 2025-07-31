<template>
  <header class="layout-header">
    <div class="layout-header__logo-container">
      <NuxtImg src="/icons/logo.svg" width="56px"></NuxtImg>
      <div class="logo-container">
        <div class="logo-container__text">
          <h1 class="logo-container__brand-name">untrackly</h1>
          <p class="logo-container__slogan">Your words are only yours</p>
        </div>
      </div>
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
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
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
    @media screen and (max-width: $app-mobile) {
      display: none;
    }
  }
  &__logo-container {
    display: flex;
    width: 100%;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    .logo-container {
      display: none;
    }
    @media screen and (max-width: $app-mobile) {
      .logo-container {
        display: block;
        &__text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 6px;
          padding: 12px;
        }
        &__brand-name {
          font-weight: 400;
          font-size: 22px;
          color: var(--color-primary-on-text);
        }
        &__slogan {
          font-weight: 400;
          font-size: 14px;
          color: var(--color-white);
        }
      }
    }
  }
  .nav-menu {
    display: flex;
    min-width: max-content;
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
      width: 120px;
      align-items: center;
      justify-content: center;
    }
    &__link {
      color: var(--color-white);
      font-size: 18px;
      font-weight: 400;
      text-decoration: none;
      transition: color 0.2s ease;
      &:hover {
        color: var(--color-primary-on-hover);
      }
      &:active {
        color: var(--color-primary-on-active);
      }
      &--active {
        color: var(--color-primary-on-text);
      }
    }
  }
}
</style>
