export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/i18n',
    '@nuxt/image',
  ],
    css: [
    "normalize.css/normalize.css",
    "@/assets/styles/main.scss",
    "@/assets/styles/fonts.scss",
    "@/assets/styles/typography.scss",
    "@/assets/styles/colors.scss",
  ],
  i18n: {
    locales: [
      { code: 'en', language: 'en-US' },
      { code: 'fr', language: 'fr-FR' }
    ],
    defaultLocale: 'en',
  },
})