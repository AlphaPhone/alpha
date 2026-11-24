#!/usr/bin/env node
// Stage the resident agent's Android runtime payload (Node runtime, agent bundle, the workflow worker built by
// scripts/build-workflow-worker.ts) with @elizaos/os/build stageRuntimePayload into .eliza/runtime-payload, an
// Android source set (android/app/src/main/{assets/agent,jniLibs/<abi>/libeliza_node.so}) the generated Gradle host
// packages, and stamp it with the pin and this stager's digest.
//   node --conditions=eliza-source --import vibelang/register scripts/stage-agent-runtime.ts [--bundle DIR] [--abi arm64-v8a,x86_64]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';
import {AGENT_BUNDLE_DIRECTORY} from './build-agent-bundle.ts';
import {workflowWorkerArtifact} from './build-workflow-worker.ts';
import {imageNativeViewDeclarationsJson, nativeViewDeclarationsJson} from './native-view-policy.ts';
import {AGENT_ENTRY, AGENT_MANIFEST, RUNTIME_MAIN, RUNTIME_PAYLOAD, STAGED_AGENT_ASSETS, STAGED_JNI_LIBS} from './agent-payload.ts';
export {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The payload root stageRuntimePayload writes; scripts/android-host.ts hands it to the generated host as `runtime`. */
export const RUNTIME_PAYLOAD_ROOT = path.join(root, RUNTIME_PAYLOAD);
/** The staged assets/agent directory the APK packages. */
export const AGENT_ASSETS = path.join(root, STAGED_AGENT_ASSETS);
/** The staged Node runtime libraries (jniLibs/<abi>/libeliza_node.so) the APK packages. */
export const RUNTIME_JNI_LIBS = path.join(root, STAGED_JNI_LIBS);
/** The packaged debug and release ABIs. */
export const TARGET_ABIS = Object.freeze(['arm64-v8a', 'x86_64'] as const);

type RuntimeInput = {kind: 'built'; dir: string} | {kind: 'fetched'; abi: string; url: string};

/**
 * Stage the payload into `output` (default .eliza/runtime-payload), replacing an earlier one: stageRuntimePayload
 * refuses an existing output. Alpha's own files (source stamp, view declarations, runtime profile) go beside the
 * bundle in assets/agent; they are not in the inventory, which upstream PayloadCheck allows. `lock` and `runtimes`
 * pass through to stageRuntimePayload (a test supplies its own lock and runtime; a build uses the pinned lock).
 */
export async function stageAgentRuntime({bundleDir = AGENT_BUNDLE_DIRECTORY, abi = [...TARGET_ABIS] as string[], workflowWorker, output = RUNTIME_PAYLOAD_ROOT, lock, runtimes}: {bundleDir?: string; abi?: string[]; workflowWorker?: {dir: string; executable: string} | null; output?: string; lock?: string; runtimes?: RuntimeInput[]} = {}) {
  const commit = pinnedCommit(root);
  if (!fs.existsSync(path.join(bundleDir, AGENT_MANIFEST)) || !fs.existsSync(path.join(bundleDir, AGENT_ENTRY))) throw new Error('Build the agent bundle first: pnpm agent:bundle');
  // The bundle carries the workflow plugin, so its manifest pins the worker digest; the payload refuses a missing or
  // different worker. Only a test passes null, for a bundle that pins no worker.
  const worker = workflowWorker === null ? undefined : workflowWorker ?? await workflowWorkerArtifact();
  const {stageRuntimePayload} = await import('./upstream-os.ts');
  fs.rmSync(output, {recursive: true, force: true});
  const staged = await stageRuntimePayload({abi: abi as never, bundleDir, output, ...(worker ? {workflowWorker: worker} : {}), ...(lock ? {lock} : {}), ...(runtimes ? {runtimes: runtimes as never} : {})});
  const assets = path.join(staged.output, RUNTIME_MAIN, 'assets/agent');
  fs.writeFileSync(path.join(assets, 'alpha-source.json'), JSON.stringify({
    base: commit, patches: [], lockSha256: sha256File(path.join(root, 'upstream.lock.json')), stagerSha256: sha256File(fileURLToPath(import.meta.url)),
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(assets, 'native-view-declarations.json'), nativeViewDeclarationsJson);
  fs.writeFileSync(path.join(assets, 'image-native-view-declarations.json'), imageNativeViewDeclarationsJson);
  fs.writeFileSync(path.join(assets, 'alpha-runtime-profile.json'), JSON.stringify({version: 1, runtimeProfile: 'native'}, null, 2) + '\n');
  return staged;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {bundle: {type: 'string'}, abi: {type: 'string'}, 'workflow-worker': {type: 'string'}, 'workflow-executable': {type: 'string'}}});
  const worker = values['workflow-worker'] && values['workflow-executable'] ? {dir: path.resolve(values['workflow-worker']), executable: values['workflow-executable']} : undefined;
  const staged = await stageAgentRuntime({bundleDir: values.bundle ? path.resolve(values.bundle) : undefined, abi: values.abi?.split(','), workflowWorker: worker});
  console.log(`Android runtime payload staged in ${path.relative(root, staged.output)} (${staged.inventory.length} files); the generated Gradle host packages it. This is not device execution evidence.`);
}
