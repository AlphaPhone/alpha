import fs from "node:fs";
import path from "node:path";
import { project } from "vibestack/testing/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

const base = project({ root: import.meta.dirname });
/** Where the linked eliza packages really are: Vitest runs their files as this package's own, and not as a dependency Node loads. */
const eliza = new RegExp(`^${fs.realpathSync.native(path.join(import.meta.dirname, "../../.eliza")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

/**
 * The journeys over eliza's real agent and cloud ask the run's setup for them (test/eliza/owned.ts). eliza's clients are
 * linked from their own checkout: as in the page (vite.config.ts), they run on this package's one copy of Effect and
 * of Capacitor, so that a schema or an error of theirs is one Alpha's code can read.
 */
export default defineConfig(async (env) => mergeConfig(await base(env), {
  resolve: { dedupe: ["effect", "vibelang-runtime", "@capacitor/core"] },
  test: { globalSetup: ["./test/eliza/setup.ts"], server: { deps: { inline: [eliza] } } },
}));
