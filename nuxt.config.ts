export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  runtimeConfig: {
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    public: {},
  },
  modules: ["@nuxtjs/i18n", "@nuxt/image", "@nuxtjs/color-mode", "nuxt-swiper"],
  css: [
    "normalize.css/normalize.css",
    "@/assets/styles/main.scss",
    "@/assets/styles/fonts.scss",
    "@/assets/styles/typography.scss",
    "@/assets/styles/colors.scss",
    "@/assets/styles/spacing.scss",
  ],
  colorMode: {
    preference: "dark",
    fallback: "dark",
    hid: "nuxt-color-mode-script",
    globalName: "__NUXT_COLOR_MODE__",
    componentName: "ColorScheme",
    classPrefix: "",
    classSuffix: "",
    storage: "cookie",
    storageKey: "nuxt-color-mode",
  },
  i18n: {
    locales: [
      { code: "en", language: "en-US" },
      { code: "fr", language: "fr-FR" },
    ],
    defaultLocale: "en",
  },
});
