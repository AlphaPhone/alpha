#!/usr/bin/env node
// Stage the resident agent's Android runtime payload (Node runtime, agent bundle, the workflow worker built by
// scripts/build-workflow-worker.ts) into the app's
// assets with @elizaos/os/build stageRuntimePayload, and stamp it with the pin and this stager's digest.
//   node --conditions=eliza-source --import vibelang/register scripts/stage-agent-runtime.ts [--bundle DIR] [--abi arm64-v8a,x86_64]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {curatedModels} from '@elizaos/plugin-local-inference';
import {sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';
import {AGENT_BUNDLE_DIRECTORY} from './build-agent-bundle.ts';
import {workflowWorkerArtifact} from './build-workflow-worker.ts';
import {imageNativeViewDeclarationsJson, nativeViewDeclarationsJson} from './native-view-policy.ts';
import {nativeCacheRoot} from './native-build-inputs.ts';
import {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';
export {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The staged payload the APK packages. */
export const AGENT_ASSETS = path.join(root, 'android/app/src/main/assets/agent');
/** The staging workspace passed to upstream stageRuntimePayload (which emits android/app/src/main/{assets,jniLibs}). */
const STAGING_ROOT = path.join(root, '.eliza/staged-runtime');
/** The packaged debug and release ABIs. */
export const TARGET_ABIS = Object.freeze(['arm64-v8a', 'x86_64'] as const);

async function stageEmbeddingModel() {
  const host = JSON.parse(fs.readFileSync(path.join(root, 'android/embedding-host/qualified-host.json'), 'utf8')) as {
    model: {path: string; sha256: string};
  };
  const source = curatedModels.model2.source;
  if (source.kind !== 'pinned' || !source.files.length) throw new Error('Pinned embedding model source is missing from @elizaos/plugin-local-inference');
  const pinned = source.files[0];
  if (pinned.sha256 !== host.model.sha256) throw new Error(`Embedding model pin mismatch: catalog has ${pinned.sha256}, qualified-host.json expects ${host.model.sha256}`);
  const cached = path.join(nativeCacheRoot(), 'models', pinned.path);
  if (!fs.existsSync(cached) || sha256File(cached) !== pinned.sha256) {
    fs.mkdirSync(path.dirname(cached), {recursive: true});
    const response = await fetch(pinned.url);
    if (!response.ok) throw new Error(`Failed to fetch pinned embedding model ${pinned.url}: HTTP ${response.status}`);
    const partial = `${cached}.${process.pid}.partial`;
    fs.writeFileSync(partial, Buffer.from(await response.arrayBuffer()));
    const digest = sha256File(partial);
    if (digest !== pinned.sha256) {
      fs.rmSync(partial, {force: true});
      throw new Error(`Downloaded embedding model ${pinned.path} has sha256 ${digest}, expected ${pinned.sha256}`);
    }
    fs.renameSync(partial, cached);
  }
  const target = path.join(root, host.model.path);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(cached, target);
}

export async function stageAgentRuntime({bundleDir = AGENT_BUNDLE_DIRECTORY, abi = [...TARGET_ABIS] as string[], workflowWorker}: {bundleDir?: string; abi?: string[]; workflowWorker?: {dir: string; executable: string}} = {}) {
  const commit = pinnedCommit(root);
  if (!fs.existsSync(path.join(bundleDir, AGENT_MANIFEST)) || !fs.existsSync(path.join(bundleDir, AGENT_ENTRY))) throw new Error('Build the agent bundle first: pnpm agent:bundle');
  // The bundle carries the workflow plugin, so its manifest pins the worker digest; the payload refuses a missing or different worker.
  const worker = workflowWorker ?? await workflowWorkerArtifact();
  const {stageRuntimePayload} = await import('./upstream-os.ts');
  fs.rmSync(STAGING_ROOT, {recursive: true, force: true});
  const staged = await stageRuntimePayload({abi: abi as never, bundleDir, output: STAGING_ROOT, workflowWorker: worker});
  const stagedMain = path.join(staged.output, 'android/app/src/main');
  fs.rmSync(AGENT_ASSETS, {recursive: true, force: true});
  fs.cpSync(path.join(stagedMain, 'assets/agent'), AGENT_ASSETS, {recursive: true});
  const stagedJni = path.join(stagedMain, 'jniLibs');
  if (fs.existsSync(stagedJni)) {
    for (const targetAbi of fs.readdirSync(stagedJni)) {
      const abiDir = path.join(stagedJni, targetAbi);
      if (!fs.statSync(abiDir).isDirectory()) continue;
      const destAbiDir = path.join(root, 'android/app/src/main/jniLibs', targetAbi);
      fs.mkdirSync(destAbiDir, {recursive: true});
      for (const file of fs.readdirSync(abiDir)) {
        const src = path.join(abiDir, file);
        const dest = path.join(destAbiDir, file);
        fs.copyFileSync(src, dest);
        fs.chmodSync(dest, fs.statSync(src).mode & 0o777);
      }
    }
  }
  await stageEmbeddingModel();
  fs.writeFileSync(path.join(AGENT_ASSETS, 'alpha-source.json'), JSON.stringify({
    base: commit, patches: [], lockSha256: sha256File(path.join(root, 'upstream.lock.json')), stagerSha256: sha256File(fileURLToPath(import.meta.url)),
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(AGENT_ASSETS, 'native-view-declarations.json'), nativeViewDeclarationsJson);
  fs.writeFileSync(path.join(AGENT_ASSETS, 'image-native-view-declarations.json'), imageNativeViewDeclarationsJson);
  fs.writeFileSync(path.join(AGENT_ASSETS, 'alpha-runtime-profile.json'), JSON.stringify({version: 1, runtimeProfile: 'native'}, null, 2) + '\n');
  return {...staged, output: AGENT_ASSETS};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {bundle: {type: 'string'}, abi: {type: 'string'}, 'workflow-worker': {type: 'string'}, 'workflow-executable': {type: 'string'}}});
  const worker = values['workflow-worker'] && values['workflow-executable'] ? {dir: path.resolve(values['workflow-worker']), executable: values['workflow-executable']} : undefined;
  const staged = await stageAgentRuntime({bundleDir: values.bundle ? path.resolve(values.bundle) : undefined, abi: values.abi?.split(','), workflowWorker: worker});
  console.log(`Android runtime payload staged in ${path.relative(root, staged.output)} (${staged.inventory.length} files). This is not device execution evidence.`);
}
