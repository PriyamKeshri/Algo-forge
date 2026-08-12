import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.{test,spec}.ts", "apps/**/*.{test,spec}.ts"],
    globals: true,
  },
});
