import { checkout } from "@repo/eliza-harness/checkout";
import { project } from "vibestack/testing/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

/** eliza's client runs as this package's own code, on its one copy of Effect, so the schemas it exports decode here. */
const linked = (directory: string) => new RegExp(`^${RegExp.escape(directory)}`);

export default defineConfig(async (env) => mergeConfig(await project({ root: import.meta.dirname })(env), {
  resolve: { dedupe: ["effect", "vibelang-runtime"] },
  test: { server: { deps: { inline: [linked(checkout().root)] } } },
}));
