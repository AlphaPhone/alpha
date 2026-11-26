#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/**
 * Runs `@capacitor/cli` on Node 26 inside this `"type": "module"` repository by replacing
 * its CommonJS `requireTS` loader with Node's native ESM-capable `require()`.
 */
const capNode = require("@capacitor/cli/dist/util/node.js") as {
  requireTS: (_ts: unknown, id: string) => unknown;
};
capNode.requireTS = (_ts, id) => {
  delete require.cache[id];
  return require(id);
};

const cli = require("@capacitor/cli/dist/index") as { run: () => void };
cli.run();
