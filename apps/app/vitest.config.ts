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

export default project({ root: import.meta.dirname, plugins: [elizaSource, tailwindcss()] });
