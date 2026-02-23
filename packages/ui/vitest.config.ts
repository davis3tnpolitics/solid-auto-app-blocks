import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      components: fileURLToPath(new URL("./components", import.meta.url)),
      lib: fileURLToPath(new URL("./lib", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.tsx"],
    include: [
      "components/**/*.test.{ts,tsx}",
      "components/**/*.spec.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "lib/**/*.spec.{ts,tsx}",
    ],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "components/charts/**/*.tsx",
        "components/forms/**/*.tsx",
        "components/ui/button.tsx",
        "components/ui/checkbox.tsx",
        "components/ui/dialog.tsx",
        "components/ui/input.tsx",
        "components/ui/tabs.tsx",
        "lib/**/*.ts",
      ],
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
        branches: 70,
      },
    },
  },
})
