<template>
  <div class="page-container">
    <div class="page-content">
      <section class="page-content__header">
        <CThemeToggle class="page-content__theme-toggle" />
      </section>
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
const router = useRouter();
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
  min-height: 100vh;
  width: 100vw;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(0deg, rgba(249, 249, 241, 0.1), rgba(249, 249, 241, 0.1)),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.2) 24.38%,
      rgba(255, 255, 255, 0.4) 79.95%
    ),
    url("/images/login_bg.jpg") center / cover no-repeat;
  z-index: 1;
  box-shadow: 0px 0px 30px 0px #ffffff08;
  &::before {
    position: absolute;
    content: "";
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background:
      linear-gradient(0deg, rgba(8, 8, 8, 0.4), rgba(18, 18, 18, 0.4)),
      linear-gradient(
        180deg,
        rgba(8, 8, 8, 0.1) 0%,
        rgba(8, 8, 8, 0.2) 44.64%,
        rgba(8, 8, 8, 0.4) 74.65%
      ),
      url("/images/login_bg.jpg") center / cover no-repeat;
    z-index: -1;
    transition: opacity 0.5s linear;
    opacity: 0;
  }
  @media screen and (max-width: $app-narrow-mobile) {
    padding: 0;
  }
  .page-content {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    width: 580px;
    min-height: auto;
    background-color: var(--app-white);
    border-radius: 32px;
    &__head {
      display: flex;
      align-items: center;
      width: 100%;
      justify-content: center;
      position: relative;
      .page-content__back-button {
        cursor: pointer;
        position: absolute;
        left: 0;
        filter: var(--app-filter-grey-500);
      }
    }
    &__theme-toggle {
      position: absolute;
      top: 24px;
      right: 24px;
      z-index: 100;
    }
    @media screen and (max-width: $app-narrow-mobile) {
      border-radius: 0;
      width: 100vw;
      height: 100vh;
      min-height: max-content;
    }
    &__logo {
      background-image: linear-gradient(to left, #006d07 0%, #04700b 52%, #000000 100%);
      background-clip: text;
      color: transparent;
      font-size: 32px;
    }
  }
}

.body--dark {
  .page-container {
    &::before {
      opacity: 1;
    }
  }
  .page-content__logo {
    background: linear-gradient(270deg, #03a80e 0%, #078d10 52%, #a9efa4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}
</style>
