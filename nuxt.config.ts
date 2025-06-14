import Aura from '@primeuix/themes/aura';
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@primevue/nuxt-module', '@nuxtjs/i18n'],
  primevue: {
      options: {
          theme: {
              preset: Aura
          }
      }
  },
  i18n: {
    locales: [
      { code: 'en', language: 'en-US' },
      { code: 'fr', language: 'fr-FR' }
    ],
    defaultLocale: 'en',
  },
})