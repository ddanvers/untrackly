export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/i18n", "@nuxt/image", "@nuxtjs/color-mode"],
  css: [
    "normalize.css/normalize.css",
    "@/assets/styles/main.scss",
    "@/assets/styles/fonts.scss",
    "@/assets/styles/typography.scss",
    "@/assets/styles/colors.scss",
  ],
  colorMode: {
    preference: "system",
    fallback: "light",
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
