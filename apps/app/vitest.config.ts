import { project } from "vibestack/testing/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

const base = project({ root: import.meta.dirname });

// The journeys over eliza's real agent and cloud ask the run's setup for them (test/eliza/owned.ts).
export default defineConfig(async (env) => mergeConfig(await base(env), { test: { globalSetup: ["./test/eliza/setup.ts"] } }));
