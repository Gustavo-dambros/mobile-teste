import path from "path"

import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Real "server-only" throws outside Next's own module graph — see the stub file.
      "server-only": path.resolve(__dirname, "lib/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
})
