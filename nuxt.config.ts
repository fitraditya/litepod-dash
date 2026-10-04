// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,

  app: {
    head: {
      titleTemplate: 'Litepod - %s',
    },
  },

  // Server settings are read from process.env at runtime in server/utils/app-config.ts
  // (process.env here would be frozen at build time).
  runtimeConfig: {
    public: {},
  },
})
