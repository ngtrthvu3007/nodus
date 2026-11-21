import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The same `@/*` alias as tsconfig.json, so tests can import code that uses it.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
