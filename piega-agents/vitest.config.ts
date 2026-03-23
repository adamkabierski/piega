import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 120_000, // LLM calls can be slow
    hookTimeout: 60_000,
    globalSetup: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@fixtures": resolve(__dirname, "fixtures"),
    },
  },
})
