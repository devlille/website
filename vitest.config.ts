import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: [
        "src/config/**/*.ts",
        "src/core/**/*.ts",
        "src/data/**/*.ts",
        "src/i18n/**/*.ts",
      ],
      reporter: ["text", "html"],
    },
  },
});
