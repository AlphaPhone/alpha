// Scratch-only config: the package's tests without the generated schema tests, which need every area to compile; eliza resolved from source.
import tailwindcss from "@tailwindcss/vite";
import vibelang from "vibelang-vite";
import { defineConfig } from "vitest/config";
const conditions = ["node", "development|production", "eliza-source"];
export default defineConfig({
  root: import.meta.dirname,
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  plugins: [vibelang(), tailwindcss()],
  test: { include: ["test/**/*.test.{ts,tsx,vibe}"], exclude: ["**/node_modules/**", "test/**/*.browser.test.*"], environment: "node",
    sequence: { shuffle: false, seed: 1 }, retry: 0, maxConcurrency: 3, testTimeout: 60_000, hookTimeout: 60_000, passWithNoTests: true },
});
