<template>
  <header class="layout-header">
    <div class="layout-header__logo-container">
      <NuxtImg src="/icons/logo.svg" width="56px" alt="Web eye logo" />
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
              :to="item.disabled ? '' : item.link"
              class="nav-menu__link"
              :class="getMenuLinkClasses(item, 'nav-menu__link')"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
    <button
      v-if="isMobile"
      class="burger-button"
      :class="burgerButtonClasses"
      :aria-label="burgerAriaLabel"
      :aria-expanded="isMenuOpen"
      tabindex="0"
      @click="toggleMobileMenu"
    >
      <span class="burger-button__line burger-button__line--top" />
      <span class="burger-button__line burger-button__line--middle" />
      <span class="burger-button__line burger-button__line--bottom" />
    </button>
    <div
      v-if="isMobile"
      class="mobile-overlay"
      :class="{ 'mobile-overlay--active': isMenuOpen }"
      @click="closeMobileMenu"
    />
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
              :to="item.disabled ? '' : item.link"
              class="mobile-menu__link"
              :class="getMenuLinkClasses(item, 'mobile-menu__link')"
              @click="handleMobileMenuItemClick(item)"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </aside>
  </header>
</template>

<script setup lang="ts">
interface MenuItem {
  label: string;
  link: string;
  disabled?: boolean;
}

interface Props {
  menuItems: MenuItem[];
}

const MOBILE_BREAKPOINT = 600;
const RESIZE_DEBOUNCE_MS = 100;

const props = defineProps<Props>();
const router = useRouter();

const isMenuOpen = ref(false);
const isMobile = ref(false);

let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;

function isActiveRoute(link: string): boolean {
  return router.currentRoute.value.path === link;
}

function getMenuLinkClasses(
  item: MenuItem,
  prefix: string,
): Record<string, boolean> {
  return {
    [`${prefix}--active`]: isActiveRoute(item.link),
    [`${prefix}--disabled`]: Boolean(item.disabled),
  };
}

function handleMobileMenuItemClick(item: MenuItem): void {
  if (!item.disabled) {
    closeMobileMenu();
  }
}

const burgerButtonClasses = computed(() => ({
  "burger-button--active": isMenuOpen.value,
  "burger-button--fixed": isMenuOpen.value,
}));

const burgerAriaLabel = computed(() =>
  isMenuOpen.value ? "Закрыть меню" : "Открыть меню",
);

function setBodyScrollLock(locked: boolean): void {
  const { style } = document.body;
  if (locked) {
    style.overflow = "hidden";
    style.position = "fixed";
    style.width = "100%";
  } else {
    style.overflow = "";
    style.position = "";
    style.width = "";
  }
}

function toggleMobileMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
  setBodyScrollLock(isMenuOpen.value);
}

function closeMobileMenu(): void {
  if (!isMenuOpen.value) return;
  isMenuOpen.value = false;
  setBodyScrollLock(false);
}

function checkMobileViewport(): void {
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId);
  }

  resizeTimeoutId = setTimeout(() => {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT;

    if (wasMobile && !isMobile.value && isMenuOpen.value) {
      closeMobileMenu();
    }
  }, RESIZE_DEBOUNCE_MS);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && isMenuOpen.value) {
    closeMobileMenu();
  }
}

onMounted(() => {
  checkMobileViewport();
  window.addEventListener("resize", checkMobileViewport);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobileViewport);
  document.removeEventListener("keydown", handleKeydown);
  setBodyScrollLock(false);
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId);
  }
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
// Breakpoints
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;

// Animation
$animation-duration: 0.3s;
$animation-easing: cubic-bezier(0.4, 0, 0.2, 1);

// Burger button
$burger-line-height: 2px;
$burger-size: 40px;

// Colors (semi-transparent)
$overlay-bg: rgba(0, 0, 0, 0.5);
$border-light: rgba(255, 255, 255, 0.1);
$hover-bg-light: rgba(255, 255, 255, 0.05);
$active-bg-light: rgba(255, 255, 255, 0.1);
$active-item-bg: rgba(255, 255, 255, 0.08);
$shadow-menu: rgba(0, 0, 0, 0.1);

// Mixins
@mixin menu-link-base {
  font-size: 18px;
  font-weight: 400;
  color: var(--color-black);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-primary-on-hover);
  }

  &:active {
    color: var(--color-primary-on-active);
  }

  &--active {
    color: var(--color-primary-on-text);
  }

  &--disabled {
    opacity: 0.3;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-on-text);
  }
}

.layout-header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 72px;
  padding: 0 24px;
  background: var(--liquid-glass-bg);
  backdrop-filter: var(--liquid-glass-backdrop);
  box-shadow: var(--liquid-glass-shadow);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &__menu-container {
    display: flex;
    gap: 48px;
    align-items: center;
    justify-content: flex-end;
    width: 100%;

    @media screen and (max-width: $app-mobile) {
      display: none;
    }
  }

  &__logo-container {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-start;
    width: 100%;

    .logo-container {
      display: none;

      @media screen and (max-width: $app-mobile) {
        display: block;

        &__text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
          justify-content: center;
          padding: 12px;
        }

        &__brand-name {
          margin: 0;
          font-size: 22px;
          font-weight: 400;
          color: var(--color-primary-on-text);
        }

        &__slogan {
          margin: 0;
          font-size: 14px;
          font-weight: 400;
          color: var(--color-black);
        }
      }

      @media screen and (max-width: $app-narrow-mobile) {
        display: none;
      }
    }
  }
}

.nav-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: max-content;
  height: 100%;

  &__list {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 140px;
    height: 100%;
  }

  &__link {
    @include menu-link-base;

    padding: 8px 16px;
    border-radius: 4px;

    &--disabled {
      color: var(--color-black);
      cursor: not-allowed;

      &:hover,
      &:active {
        color: var(--color-black);
      }
    }

    &:focus-visible {
      outline-offset: 2px;
    }
  }
}

.burger-button {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 2003;
  display: none;
  width: $burger-size;
  height: $burger-size;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  transition: none;

  @media screen and (max-width: $app-mobile) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &:hover,
  &:focus-visible {
    background: transparent;
    outline: none;
  }

  &__line {
    position: absolute;
    left: 15%;
    display: block;
    width: 70%;
    height: $burger-line-height;
    margin: 0;
    background-color: var(--color-primary-on-text);
    border-radius: 0;
    transition: all $animation-duration $animation-easing;
    transform-origin: center;

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
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  width: 100%;
  height: 100vh;
  visibility: hidden;
  background-color: $overlay-bg;
  opacity: 0;
  backdrop-filter: blur(4px);
  transition: all $animation-duration $animation-easing;

  @media screen and (max-width: $app-mobile) {
    &--active {
      visibility: visible;
      opacity: 1;
    }
  }
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100vh;
  background: var(--liquid-glass-bg);
  backdrop-filter: var(--liquid-glass-backdrop);
  box-shadow: -4px 0 20px $shadow-menu;
  transition: transform $animation-duration $animation-easing;
  transform: translateX(100%);

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
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  &__item {
    border-bottom: 1px solid $border-light;

    &:last-child {
      border-bottom: none;
    }
  }

  &__link {
    @include menu-link-base;

    position: relative;
    display: block;
    padding: 20px 24px;

    &:hover {
      background-color: $hover-bg-light;
    }

    &:active {
      background-color: $active-bg-light;
    }

    &--active {
      background-color: $active-item-bg;

      &::before {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 4px;
        content: "";
        background-color: var(--color-primary-on-text);
      }
    }

    &--disabled {
      pointer-events: none;
    }

    &:focus-visible {
      outline-offset: -2px;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 24px;
    border-top: 1px solid $border-light;
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
