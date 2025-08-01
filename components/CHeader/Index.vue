<template>
  <header class="layout-header">
    <div class="layout-header__logo-container">
      <NuxtImg src="/icons/logo.svg" width="56px" alt="Untrackly Logo"></NuxtImg>
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
          <li v-for="item in menuItems" :key="item.link" class="nav-menu__item">
            <NuxtLink
              :to="item.link"
              class="nav-menu__link"
              :class="{ 'nav-menu__link--active': isActiveRoute(item.link) }"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <CThemeToggle></CThemeToggle>
    </div>
    <button
      v-if="isMobile"
      class="burger-button"
      :class="{ 'burger-button--active': isMenuOpen, 'burger-button--fixed': isMenuOpen }"
      @click="toggleMobileMenu"
      :aria-label="isMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
      :aria-expanded="isMenuOpen"
      tabindex="0"
    >
      <span class="burger-button__line burger-button__line--top"></span>
      <span class="burger-button__line burger-button__line--middle"></span>
      <span class="burger-button__line burger-button__line--bottom"></span>
    </button>
    <div
      v-if="isMobile"
      class="mobile-overlay"
      :class="{ 'mobile-overlay--active': isMenuOpen }"
      @click="closeMobileMenu"
    ></div>
    <aside
      v-if="isMobile"
      class="mobile-menu"
      :class="{ 'mobile-menu--active': isMenuOpen }"
      role="navigation"
      :aria-hidden="!isMenuOpen"
    >
      <nav class="mobile-menu__nav">
        <ul class="mobile-menu__list">
          <li v-for="item in menuItems" :key="item.link" class="mobile-menu__item">
            <NuxtLink
              :to="item.link"
              class="mobile-menu__link"
              :class="{ 'mobile-menu__link--active': isActiveRoute(item.link) }"
              @click="closeMobileMenu"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <div class="mobile-menu__footer">
        <CThemeToggle class="mobile-menu__theme-toggle"></CThemeToggle>
      </div>
    </aside>
  </header>
</template>

<script setup lang="ts">
const router = useRouter();
interface MenuItemProps {
  label: string;
  link: string;
}
interface Props {
  menuItems: MenuItemProps[];
}
const props = defineProps<Props>();

const isMenuOpen = ref<boolean>(false);
const isMobile = ref<boolean>(false);

const isActiveRoute = computed(() => {
  return (link: string): boolean => {
    return router.currentRoute.value.path === link;
  };
});

let resizeTimeout: NodeJS.Timeout;

const checkMobileViewport = (): void => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth <= 600;

    if (wasMobile && !isMobile.value && isMenuOpen.value) {
      closeMobileMenu();
    }
  }, 100);
};

const toggleMobileMenu = (): void => {
  isMenuOpen.value = !isMenuOpen.value;
  toggleBodyScroll();
};

const closeMobileMenu = (): void => {
  if (isMenuOpen.value) {
    isMenuOpen.value = false;
    enableBodyScroll();
  }
};

const openMobileMenu = (): void => {
  if (!isMenuOpen.value) {
    isMenuOpen.value = true;
    disableBodyScroll();
  }
};

const toggleBodyScroll = (): void => {
  if (isMenuOpen.value) {
    disableBodyScroll();
  } else {
    enableBodyScroll();
  }
};

const disableBodyScroll = (): void => {
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
};

const enableBodyScroll = (): void => {
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isMenuOpen.value) {
    closeMobileMenu();
  }
};

onMounted(() => {
  checkMobileViewport();
  window.addEventListener("resize", checkMobileViewport);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobileViewport);
  document.removeEventListener("keydown", handleKeydown);
  enableBodyScroll();
  clearTimeout(resizeTimeout);
});

watch(
  () => router.currentRoute.value.path,
  () => {
    if (isMenuOpen.value) {
      closeMobileMenu();
    }
  },
);
</script>

<style scoped lang="scss">
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;

$animation-duration: 0.3s;
$animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
$burger-line-height: 2px;
$burger-size: 40px;

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72px;
  padding: 0 24px;
  width: 100%;
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

      @media screen and (max-width: $app-mobile) {
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
          margin: 0;
        }

        &__slogan {
          font-weight: 400;
          font-size: 14px;
          color: var(--color-white);
          margin: 0;
        }
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
    margin: 0;
    padding: 0;
  }

  &__item {
    display: flex;
    height: 100%;
    width: 140px;
    align-items: center;
    justify-content: center;
  }

  &__link {
    color: var(--color-white);
    font-size: 18px;
    font-weight: 400;
    text-decoration: none;
    transition: color 0.2s ease;
    padding: 8px 16px;
    border-radius: 4px;

    &:hover {
      color: var(--color-primary-on-hover);
    }

    &:active {
      color: var(--color-primary-on-active);
    }

    &--active {
      color: var(--color-primary-on-text);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-on-text);
      outline-offset: 2px;
    }
  }
}

.burger-button {
  display: none;
  position: fixed;
  top: 18px;
  right: 18px;
  width: $burger-size;
  height: $burger-size;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 2003;
  border-radius: 0;
  box-shadow: none;
  transition: none;

  @media screen and (max-width: $app-mobile) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  &:hover,
  &:focus-visible {
    background: transparent;
    outline: none;
  }

  &__line {
    display: block;
    width: 70%;
    height: $burger-line-height;
    background-color: var(--color-primary-on-text);
    border-radius: 0;
    transition: all $animation-duration $animation-easing;
    transform-origin: center;
    position: absolute;
    left: 15%;
    margin: 0;

    &--top {
      top: 10px;
    }

    &--middle {
      top: 50%;
      transform: translateY(-50%);
    }

    &--bottom {
      bottom: 10px;
    }
  }

  &--active {
    .burger-button__line {
      &--top {
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
      }

      &--middle {
        opacity: 0;
        transform: translateY(-50%) scaleX(0);
      }

      &--bottom {
        bottom: 50%;
        transform: translateY(50%) rotate(-45deg);
      }
    }
  }

  &--fixed {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 2003;
  }
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  transition: all $animation-duration $animation-easing;
  z-index: 999;

  @media screen and (max-width: $app-mobile) {
    &--active {
      opacity: 1;
      visibility: visible;
    }
  }
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background-color: var(--color-bg-on-primary);
  transform: translateX(100%);
  transition: transform $animation-duration $animation-easing;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);

  @media screen and (max-width: $app-mobile) {
    &--active {
      transform: translateX(0);
    }
  }

  &__nav {
    flex: 1;
    padding-top: 96px;
    overflow-y: auto;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  &__item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
    }
  }

  &__link {
    display: block;
    padding: 20px 24px;
    color: var(--color-white);
    font-size: 18px;
    font-weight: 400;
    text-decoration: none;
    transition: all 0.2s ease;
    position: relative;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--color-primary-on-hover);
    }

    &:active {
      background-color: rgba(255, 255, 255, 0.1);
      color: var(--color-primary-on-active);
    }

    &--active {
      color: var(--color-primary-on-text);
      background-color: rgba(255, 255, 255, 0.08);

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background-color: var(--color-primary-on-text);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-on-text);
      outline-offset: -2px;
    }
  }

  &__footer {
    padding: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  &__theme-toggle {
  }
}

@media screen and (max-width: $app-narrow-mobile) {
  .mobile-menu {
    width: 100%;
    max-width: 320px;
  }

  .layout-header {
    padding: 0 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .burger-button__line,
  .mobile-overlay,
  .mobile-menu,
  .nav-menu__link,
  .mobile-menu__link {
    transition: none;
  }
}
</style>
