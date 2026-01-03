export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  runtimeConfig: {
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    public: {
      turnApiKey: "",
    },
  },
  modules: ["@nuxt/image", "nuxt-swiper"],
  css: [
    "normalize.css/normalize.css",
    "@/assets/styles/main.scss",
    "@/assets/styles/fonts.scss",
    "@/assets/styles/typography.scss",
    "@/assets/styles/colors.scss",
    "@/assets/styles/spacing.scss",
  ],
});
