// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  css: ["~/global.css", "v-network-graph/lib/style.css"],
  // Giá trị mặc định cho dev — override qua .env bằng NUXT_NODUS_API_BASE /
  // NUXT_PUBLIC_API_BASE (Nuxt tự đọc theo convention, không cần code thêm).
  runtimeConfig: {
    nodusApiBase: "http://localhost:8080",
    public: {
      apiBase: "/api",
    },
  },
  ui: { theme: {} },
});
