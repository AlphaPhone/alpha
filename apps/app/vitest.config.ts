import tailwindcss from "@tailwindcss/vite";
import { defineConfig, mergeConfig } from "vitest/config";
import { project } from "../../vendor/eliza/vibestack/testing/vitest.ts";

const alphaProject = project({ root: import.meta.dirname, plugins: [tailwindcss()] });

export default defineConfig(async (environment) =>
  mergeConfig(await alphaProject(environment), { resolve: { conditions: ["eliza-source"] } }),
);
