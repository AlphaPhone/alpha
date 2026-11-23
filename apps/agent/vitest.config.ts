import fs from "node:fs";
import path from "node:path";
import { project } from "vibestack/testing/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

const base = project({ root: import.meta.dirname });
const eliza = new RegExp(`^${fs.realpathSync.native(path.join(import.meta.dirname, "../../.eliza")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

export default defineConfig(async (env) => mergeConfig(await base(env), {
  resolve: { dedupe: ["effect", "vibelang-runtime"] },
  test: { server: { deps: { inline: [eliza] } } },
}));
