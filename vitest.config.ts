import path from "node:path"

/** Config Vitest sans import `vitest/config` (compatible npx / install local). */
export default {
  test: {
    environment: "node" as const,
    include: ["lib/services/**/*.test.ts", "lib/schemas/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/real-estate/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
}
