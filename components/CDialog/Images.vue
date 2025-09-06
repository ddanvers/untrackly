<template>
  <div class="c-dialog-images">
    <CDialog :model-value="isDialogOpened" @update:modelValue="closeDialog">
      <template #content>
        <swiper-container
          class="c-swiper"
          thumbs-swiper=".c-thumbs"
          :space-between="16"
          :navigation="true"
          :grab-cursor="true"
          :loop="true"
          @click.stop
        >
          <swiper-slide @click="closeDialog" v-for="image in computedImages" :key="image">
            <NuxtImg :src="image" />
          </swiper-slide>
        </swiper-container>
        <swiper-container
          class="c-thumbs"
          :space-between="8"
          :slides-per-view="6"
          :free-mode="true"
          :watch-slides-progress="true"
        >
          <swiper-slide @click.stop v-for="image in computedImages" :key="image">
            <NuxtImg :src="image" />
          </swiper-slide>
        </swiper-container>
      </template>
    </CDialog>
  </div>
</template>

<script setup lang="ts">
const { isDialogOpened, getImages, closeDialog } = useDialogImages();
const computedImages = computed(() => getImages());
const containerRef = ref(null);
useSwiper(containerRef, {
  effect: "creative",
  loop: true,
  autoplay: {
    delay: 5000,
  },
  creativeEffect: {
    prev: {
      shadow: true,
      translate: [0, 0, -400],
    },
    next: {
      shadow: true,
      translate: [0, 0, -400],
    },
  },
});
</script>

<style scoped lang="scss">
swiper-slide {
  text-align: center;
  font-size: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
}

swiper-container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

swiper-slide {
  background-size: cover;
  background-position: center;
}

.c-swiper {
  width: 80vw;
  height: 80vh;
}

.c-thumbs {
  height: 120px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
}

.c-thumbs swiper-slide {
  width: 120px !important;
  height: 120px;
  opacity: 0.5;
}

.c-thumbs .swiper-slide-thumb-active {
  opacity: 1;
}

swiper-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
<style lang="scss">
.swiper-button-next,
.swiper-button-prev {
  color: #fff;
}
</style>
