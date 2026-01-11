import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["components/**/*.test.{ts,tsx}", "components/**/*.spec.{ts,tsx}"],
  },
});
