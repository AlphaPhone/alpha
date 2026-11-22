#!/usr/bin/env node
// The resident agent's mobile bundle, built from the pinned upstream source with @elizaos/agent/bundle.
//   node --conditions=eliza-source --import vibelang/register scripts/build-agent-bundle.ts [--out DIR]
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {pinnedCommit} from './upstream-pin.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The upstream plugins Alpha's resident agent loads; the same workspace packages apps/app depends on. */
export const RESIDENT_PLUGINS = Object.freeze([
  '@elizaos/plugin-personal-assistant', '@elizaos/plugin-calendar', '@elizaos/plugin-inbox', '@elizaos/plugin-notes',
  '@elizaos/plugin-files', '@elizaos/plugin-workflow', '@elizaos/plugin-maps', '@elizaos/plugin-browser',
]);

/** The plugin the host provides as a module factory over the device's InferenceEngine (scripts/resident/entry.vibe). */
export const HOSTED_PLUGINS = Object.freeze(['@elizaos/plugin-local-inference']);

/** The mobile profile groups a device variant's launch loads (residentLoadList): Maps and Browser are the views profile. */
export const RESIDENT_PROFILES = Object.freeze({
  core: ['@elizaos/plugin-personal-assistant', '@elizaos/plugin-calendar', '@elizaos/plugin-inbox', '@elizaos/plugin-notes',
    '@elizaos/plugin-files', '@elizaos/plugin-workflow', '@elizaos/plugin-local-inference'],
  views: ['@elizaos/plugin-maps', '@elizaos/plugin-browser'],
  aospOnly: [] as string[],
  optional: [] as string[],
});

/** Alpha's bundle entry: runAgentCli with the bundled plugins and hostModules (localInferenceModule(engine)). */
export const RESIDENT_ENTRY = path.join(root, 'scripts/resident/entry.vibe');

/** The bundle directory the Android staging step reads. */
export const AGENT_BUNDLE_DIRECTORY = path.join(root, '.eliza/agent-bundle');

export async function buildResidentBundle(outDir = AGENT_BUNDLE_DIRECTORY) {
  const {buildAgentBundle} = await import('./upstream-os.ts');
  return buildAgentBundle({plugins: [...RESIDENT_PLUGINS], profiles: RESIDENT_PROFILES, entry: RESIDENT_ENTRY, outDir, sourceCommit: pinnedCommit(root), sourceRoot: path.join(root, 'vendor/eliza')} as Parameters<typeof buildAgentBundle>[0]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {out: {type: 'string'}}});
  const result = await buildResidentBundle(values.out ? path.resolve(values.out) : undefined);
  console.log(JSON.stringify(result, null, 1));
  console.log('Agent bundle built from the pinned source. This is not device execution evidence.');
}
