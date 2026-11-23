import { project } from "vibestack/testing/vitest";

export default project({
  root: import.meta.dirname,
  plugins: [{
    name: "alpha-cloud-source-exports",
    config: () => ({
      ssr: {
        resolve: {
          conditions: ["eliza-source", "module", "node", "development|production"],
          externalConditions: ["eliza-source", "node", "module-sync"],
        },
      },
    }),
  }],
});
