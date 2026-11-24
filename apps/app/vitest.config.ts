import { registerHooks } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import { defaultClientConditions, defaultExternalConditions, defaultServerConditions, type Plugin } from "vite";
import { project } from "../../vendor/eliza/vibestack/testing/vitest.ts";

/**
 * The pinned upstream packages resolve to their sources, as in vite.config.ts and tsconfig.json: their `eliza-source` export
 * names the `.vibe` source, the others an unbuilt `dist/`. Node tests run in the ssr environment and happy-dom tests in the
 * client one, so both take the condition ahead of Vite's own defaults.
 */
const elizaSource: Plugin = {
  name: "alpha-eliza-source-exports",
  config: () => ({
    resolve: { conditions: ["eliza-source", ...defaultClientConditions] },
    ssr: {
      resolve: {
        conditions: ["eliza-source", ...defaultServerConditions],
        externalConditions: ["eliza-source", ...defaultExternalConditions],
      },
    },
  }),
};

/**
 * The generated schema and contract tests load each module in this Node process (generate.ts imports it through
 * `vibelang/register`), outside Vite, so Node's own resolution takes the same condition: an upstream module then loads
 * from its source as in the tests, instead of from a `dist/` that may not be built.
 */
registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier, context.conditions.includes("eliza-source") ? context : { ...context, conditions: ["eliza-source", ...context.conditions] }),
});

export default project({ root: import.meta.dirname, plugins: [elizaSource, tailwindcss()] });
