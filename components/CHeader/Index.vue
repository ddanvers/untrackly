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
    <button
      class="burger-btn"
      @click="openMenu = true"
      aria-label="Открыть меню"
      v-show="isMobile"
      :aria-expanded="openMenu"
      :class="{ 'burger-btn--open': openMenu }"
    >
      <span></span><span></span><span></span>
    </button>
    <transition name="sidebar-fade">
      <aside v-if="openMenu && isMobile" class="sidebar-menu" @click.self="openMenu = false">
        <div class="sidebar-menu__content">
          <div class="sidebar-menu__theme">
            <CThemeToggle />
          </div>
          <button class="sidebar-menu__close" @click="openMenu = false" aria-label="Закрыть меню">
            &times;
          </button>
          <nav class="sidebar-menu__nav">
            <ul>
              <li v-for="item in menuItems" :key="item.link">
                <NuxtLink
                  :to="item.link"
                  class="sidebar-menu__link"
                  :class="{
                    'sidebar-menu__link--active': router.currentRoute.value.path === item.link,
                  }"
                  @click="openMenu = false"
                >
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </div>
        <div
          class="sidebar-menu__overlay"
          :class="{ 'sidebar-menu__overlay--visible': openMenu }"
          @click="openMenu = false"
        ></div>
      </aside>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
const router = useRouter();
interface Props {
  menuItems: { label: string; link: string }[];
}
const props = defineProps<Props>();
const openMenu = ref(false);
const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth <= 600;
}
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
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
  .burger-btn {
    display: none;
    @media screen and (max-width: $app-mobile) {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 44px;
      height: 44px;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 1201;
      padding: 0;
      margin-left: 8px;
      span {
        display: block;
        width: 28px;
        height: 3px;
        margin: 3px 0;
        background: var(--color-primary-on-text);
        border-radius: 2px;
        transition: all 0.3s cubic-bezier(0.4, 1, 0.6, 1);
      }
      &.burger-btn--open {
        span:nth-child(1) {
          transform: translateY(6px) rotate(45deg);
        }
        span:nth-child(2) {
          opacity: 0;
        }
        span:nth-child(3) {
          transform: translateY(-6px) rotate(-45deg);
        }
      }
    }
  }
}
// Sidebar styles
.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.32s cubic-bezier(0.4, 1, 0.6, 1);
}
.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}
.sidebar-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 84vw;
  max-width: 340px;
  height: 100vh;
  background: var(--color-bg-on-primary);
  box-shadow: -8px 0 32px 0 rgba(0, 0, 0, 0.18);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  animation: sidebar-slide-in 0.32s cubic-bezier(0.4, 1, 0.6, 1);
  @media screen and (min-width: $app-mobile + 1) {
    display: none;
  }
  &__content {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px 20px 20px 20px;
    gap: 32px;
    overflow-y: auto;
  }
  &__theme {
    margin-bottom: 32px;
    margin-top: 0;
    display: flex;
    justify-content: flex-end;
    z-index: 1;
  }
  &__close {
    position: fixed;
    top: 18px;
    right: 18px;
    background: none;
    border: none;
    font-size: 2.2rem;
    color: var(--color-primary-on-text);
    cursor: pointer;
    z-index: 2002;
    transition: color 0.2s;
    &:hover {
      color: var(--color-primary-on-hover);
    }
  }
  &__nav {
    margin-top: 24px;
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    li {
      width: 100%;
    }
  }
  &__link {
    color: var(--color-primary-on-text);
    font-size: 20px;
    font-weight: 500;
    text-decoration: none;
    padding: 8px 0;
    display: block;
    border-radius: 6px;
    transition:
      background 0.2s,
      color 0.2s;
    opacity: 0.85;
    &:hover {
      background: var(--color-primary-on-hover);
      color: var(--color-white);
      opacity: 1;
    }
    &--active {
      color: var(--color-primary);
      font-weight: 700;
      background: var(--color-primary-on-hover);
      opacity: 1;
    }
  }
  &__overlay {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.18);
    z-index: 2000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.32s cubic-bezier(0.4, 1, 0.6, 1);
    &.sidebar-menu__overlay--visible {
      opacity: 1;
      pointer-events: auto;
    }
  }
}
@keyframes sidebar-slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>
