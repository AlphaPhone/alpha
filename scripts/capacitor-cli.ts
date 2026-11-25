#!/usr/bin/env node
// Runs @capacitor/cli on Node 26 inside this `"type": "module"` repository.
// @capacitor/cli 8.5.2 transpiles capacitor.config.ts to CommonJS via require.extensions['.ts'],
// which Node 26 executes as ESM under `"type": "module"` (`exports is not defined`). Replacing
// requireTS with Node's native ESM-capable require() loads capacitor.config.ts directly.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const capNode = require('@capacitor/cli/dist/util/node.js') as {
  requireTS: (_ts: unknown, id: string) => unknown;
};
capNode.requireTS = (_ts, id) => {
  delete require.cache[id];
  return require(id);
};

const cli = require('@capacitor/cli/dist/index') as { run: () => void };
cli.run();
