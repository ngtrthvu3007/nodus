// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  css: ["~/global.css"],
  runtimeConfig: {
    nodusApiBase: "http://localhost:8080",
    public: {
      apiBase: "/api",
    },
  },
  ui: { theme: {} },
});
