#!/usr/bin/env node
// Stage the resident agent's Android runtime payload (Node runtime, agent bundle, the workflow worker built by
// scripts/build-workflow-worker.ts) into the app's
// assets with @elizaos/os/build stageRuntimePayload, and stamp it with the pin and this stager's digest.
//   node --conditions=eliza-source --import vibelang/register scripts/stage-agent-runtime.ts [--bundle DIR] [--abi arm64-v8a,x86_64]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';
import {AGENT_BUNDLE_DIRECTORY} from './build-agent-bundle.ts';
import {imageNativeViewDeclarationsJson, nativeViewDeclarationsJson} from './native-view-policy.ts';
import {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';
import {assertNativeOutputPath, withNativeCacheLock} from './native-build-inputs.ts';
export {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_MAIN = 'android/app/src/main';
const NODE_RUNTIME = 'libeliza_node.so';
/** The staged payload the APK packages. */
export const AGENT_ASSETS = path.join(root, ANDROID_MAIN, 'assets/agent');
/** The packaged debug and release ABIs. */
export const TARGET_ABIS = Object.freeze(['arm64-v8a', 'x86_64'] as const);

/** Publish the SDK's generated Android tree into the consumer's source set. */
export function publishAgentRuntime(productRoot: string, stagedRoot: string, abi: readonly string[], scratch: string) {
  const assets = `${ANDROID_MAIN}/assets/agent`;
  const files = [assets, ...abi.map(name => `${ANDROID_MAIN}/jniLibs/${name}/${NODE_RUNTIME}`)];
  const targets = files.map((relative, index) => {
    assertNativeOutputPath(productRoot, relative);
    const source = path.join(stagedRoot, relative);
    const stat = fs.lstatSync(source);
    if (relative === assets ? !stat.isDirectory() : !stat.isFile()) throw new Error(`Missing staged runtime output: ${relative}`);
    return {source, destination: path.join(productRoot, relative), backup: path.join(scratch, `previous-${index}`), replaced: false, published: false};
  });
  // The runtime stager owns the bundle. The consumer's independently qualified
  // embedding artifacts may already be present under the same assets directory.
  const models = `${assets}/models`;
  assertNativeOutputPath(productRoot, models);
  const productModels = path.join(productRoot, models);
  const stagedModels = path.join(stagedRoot, models);
  if (fs.existsSync(productModels) && !fs.existsSync(stagedModels)) fs.cpSync(productModels, stagedModels, {recursive: true, errorOnExist: true, force: false});
  for (const target of targets) fs.mkdirSync(path.dirname(target.destination), {recursive: true});
  try {
    for (const target of targets) {
      target.replaced = fs.existsSync(target.destination);
      if (target.replaced) fs.renameSync(target.destination, target.backup);
      fs.renameSync(target.source, target.destination);
      target.published = true;
    }
  } catch (error) {
    const rollbackFailures: unknown[] = [];
    for (const target of targets.reverse()) {
      try {
        if (target.published) fs.renameSync(target.destination, target.source);
        if (target.replaced && fs.existsSync(target.backup)) fs.renameSync(target.backup, target.destination);
      } catch (rollbackError) {
        rollbackFailures.push(rollbackError);
      }
    }
    if (rollbackFailures.length > 0) throw new AggregateError([error, ...rollbackFailures], `Could not restore staged runtime. Backups are in ${scratch}`);
    throw error;
  }
}

export async function stageAgentRuntime({bundleDir = AGENT_BUNDLE_DIRECTORY, abi = [...TARGET_ABIS] as string[], workflowWorker}: {bundleDir?: string; abi?: string[]; workflowWorker?: {dir: string; executable: string}} = {}) {
  const commit = pinnedCommit(root);
  if (!fs.existsSync(path.join(bundleDir, AGENT_MANIFEST)) || !fs.existsSync(path.join(bundleDir, AGENT_ENTRY))) throw new Error('Build the agent bundle first: pnpm agent:bundle');
  // The bundle carries the workflow plugin, so its manifest pins the worker digest; the payload refuses a missing or different worker.
  const worker = workflowWorker ?? await (await import('./build-workflow-worker.ts')).workflowWorkerArtifact();
  const {stageRuntimePayload} = await import('./upstream-os.ts');
  const work = path.join(root, '.eliza/android-agent-stage');
  return withNativeCacheLock(work, async assertHeld => {
    const scratch = fs.mkdtempSync(path.join(work, 'runtime-'));
    let keepScratch = false;
    try {
      const staged = await stageRuntimePayload({abi: abi as never, bundleDir, output: path.join(scratch, 'payload'), workflowWorker: worker});
      const assets = path.join(staged.output, ANDROID_MAIN, 'assets/agent');
      fs.writeFileSync(path.join(assets, 'alpha-source.json'), JSON.stringify({
        base: commit, patches: [], lockSha256: sha256File(path.join(root, 'upstream.lock.json')), stagerSha256: sha256File(fileURLToPath(import.meta.url)),
      }, null, 2) + '\n');
      fs.writeFileSync(path.join(assets, 'native-view-declarations.json'), nativeViewDeclarationsJson);
      fs.writeFileSync(path.join(assets, 'image-native-view-declarations.json'), imageNativeViewDeclarationsJson);
      fs.writeFileSync(path.join(assets, 'alpha-runtime-profile.json'), JSON.stringify({version: 1, runtimeProfile: 'native'}, null, 2) + '\n');
      assertHeld();
      try {
        publishAgentRuntime(root, staged.output, abi, scratch);
      } catch (error) {
        keepScratch = error instanceof AggregateError;
        throw error;
      }
      return {...staged, output: AGENT_ASSETS};
    } finally {
      if (!keepScratch) fs.rmSync(scratch, {recursive: true, force: true});
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {bundle: {type: 'string'}, abi: {type: 'string'}, 'workflow-worker': {type: 'string'}, 'workflow-executable': {type: 'string'}}});
  const worker = values['workflow-worker'] && values['workflow-executable'] ? {dir: path.resolve(values['workflow-worker']), executable: values['workflow-executable']} : undefined;
  const staged = await stageAgentRuntime({bundleDir: values.bundle ? path.resolve(values.bundle) : undefined, abi: values.abi?.split(','), workflowWorker: worker});
  console.log(`Android runtime payload staged in ${path.relative(root, staged.output)} (${staged.inventory.length} files). This is not device execution evidence.`);
}
