// Integration scratch: the package's own tests over the built eliza packages, without the generated schema tests.
import tailwindcss from "@tailwindcss/vite";
import vibelang from "vibelang-vite";
import { defineConfig } from "vitest/config";
export default defineConfig({
  root: import.meta.dirname,
  plugins: [vibelang(), tailwindcss()],
  test: { include: ["test/**/*.test.{ts,tsx,vibe}"], exclude: ["**/node_modules/**", "test/**/*.browser.test.*"], environment: "node",
    sequence: { shuffle: false, seed: 1 }, retry: 0, maxConcurrency: 3, testTimeout: 60_000, hookTimeout: 60_000, passWithNoTests: true },
});
