// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-04-23',
  future: { compatibilityVersion: 4 },
  app: {
    baseURL: process.env.BASE_URL || '/', // Replace with your repo name
  },
  nitro: {
    preset: 'static'
  },
  
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui'
  ]
})