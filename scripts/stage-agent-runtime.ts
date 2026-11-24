#!/usr/bin/env node
// Stage the resident agent's Android runtime payload (Node runtime, agent bundle, the workflow worker built by
// scripts/build-workflow-worker.ts) into the app's
// assets with @elizaos/os/build stageRuntimePayload, and stamp it with the pin and this stager's digest.
//   node --conditions=eliza-source --import vibelang/register scripts/stage-agent-runtime.ts [--bundle DIR] [--abi arm64-v8a,x86_64]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {sha256, sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';
import {AGENT_BUNDLE_DIRECTORY} from './build-agent-bundle.ts';
import {imageNativeViewDeclarationsJson, nativeViewDeclarationsJson} from './native-view-policy.ts';
import {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';
import {assertNativeOutputPath, nativeCacheRoot, withNativeCacheLock} from './native-build-inputs.ts';
import {EMBEDDING_MODEL} from './stage-embedding-host.ts';
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
  const stagedMain = path.join(stagedRoot, ANDROID_MAIN);
  const stagedJni = path.join(stagedMain, 'jniLibs');
  const unexpected = [
    ...fs.readdirSync(stagedMain).filter(name => name !== 'assets' && name !== 'jniLibs'),
    ...fs.readdirSync(path.join(stagedMain, 'assets')).filter(name => name !== 'agent').map(name => `assets/${name}`),
    ...fs.readdirSync(stagedJni).flatMap(name => abi.includes(name)
      ? fs.readdirSync(path.join(stagedJni, name)).filter(file => file !== NODE_RUNTIME).map(file => `jniLibs/${name}/${file}`)
      : [`jniLibs/${name}`]),
  ];
  if (unexpected.length) throw new Error(`The runtime payload carries files Alpha does not stage: ${unexpected.join(', ')}`);
  const node = (name: string) => `${ANDROID_MAIN}/jniLibs/${name}/${NODE_RUNTIME}`;
  const files = [assets, ...abi.map(node)];
  const obsolete = TARGET_ABIS.filter(name => !abi.includes(name)).map(node);
  const targets = [...files, ...obsolete].map((relative, index) => {
    assertNativeOutputPath(productRoot, relative);
    const source = files.includes(relative) ? path.join(stagedRoot, relative) : undefined;
    if (source !== undefined) {
      const stat = fs.lstatSync(source);
      if (relative === assets ? !stat.isDirectory() : !stat.isFile()) throw new Error(`Missing staged runtime output: ${relative}`);
    }
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
      if (target.source !== undefined) {
        fs.renameSync(target.source, target.destination);
        target.published = true;
      }
    }
  } catch (error) {
    const rollbackFailures: unknown[] = [];
    for (const target of targets.reverse()) {
      try {
        if (target.published && target.source !== undefined) fs.renameSync(target.destination, target.source);
        if (target.replaced && fs.existsSync(target.backup)) fs.renameSync(target.backup, target.destination);
      } catch (rollbackError) {
        rollbackFailures.push(rollbackError);
      }
    }
    if (rollbackFailures.length > 0) throw new AggregateError([error, ...rollbackFailures], `Could not restore staged runtime. Backups are in ${scratch}`);
    throw error;
  }
}

/**
 * The pinned BGE384 model at its packaged path (AlphaInferenceHost opens assets/agent/models/<file>). Upstream's
 * local-inference catalog says where the model is published; Alpha's embedding admission
 * (scripts/stage-embedding-host.ts) pins the bytes, and the two must name the same digest. The download is cached
 * beside the native inputs and every copy is checked against the pin.
 */
export async function stageEmbeddingModel({target = path.join(root, EMBEDDING_MODEL.path), cache = path.join(nativeCacheRoot(), 'models', 'embedding'), url, fetchBytes = download}: {target?: string; cache?: string; url?: string; fetchBytes?: (url: string) => Promise<Uint8Array>} = {}) {
  const name = path.basename(EMBEDDING_MODEL.path);
  const published = url ?? await publishedModelUrl(name);
  const cached = path.join(cache, EMBEDDING_MODEL.sha256, name);
  let bytes: Uint8Array | null = fs.existsSync(cached) ? fs.readFileSync(cached) : null;
  if (!bytes || sha256(bytes) !== EMBEDDING_MODEL.sha256) {
    bytes = await fetchBytes(published);
    if (sha256(bytes) !== EMBEDDING_MODEL.sha256) throw new Error(`${published} is not the pinned ${name} (${EMBEDDING_MODEL.sha256})`);
    writeAtomically(cached, bytes);
  }
  writeAtomically(target, bytes);
  return target;
}

async function publishedModelUrl(name: string) {
  const {curatedModels} = await import('@elizaos/plugin-local-inference');
  const files = Object.values(curatedModels).flatMap(model => model.source.kind === 'pinned' ? model.source.files : []);
  const file = files.find(candidate => candidate.path === name);
  if (!file) throw new Error(`The pinned local-inference catalog publishes no ${name}`);
  if (file.sha256 !== EMBEDDING_MODEL.sha256) throw new Error(`The local-inference catalog pins ${name} at ${file.sha256}; Alpha's embedding admission pins ${EMBEDDING_MODEL.sha256}`);
  return file.url;
}

/**
 * Fetches the model with a bounded retry: CI keeps no cache between runs, so one rate limit or dropped
 * connection would otherwise fail the whole build. Only network errors, 429 and 5xx are retried; the caller
 * still checks every byte against the pin.
 */
export async function download(url: string, {fetchImpl = fetch, attempts = 3, delayMs = 2000}: {fetchImpl?: typeof fetch; attempts?: number; delayMs?: number} = {}) {
  for (let attempt = 1; ; attempt++) {
    let status: number | undefined, failure: unknown;
    try {
      const response = await fetchImpl(url, {redirect: 'follow'});
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
      status = response.status;
    } catch (error) { failure = error; }
    const retryable = status === undefined || status === 429 || status >= 500;
    if (!retryable || attempt >= attempts) throw status === undefined ? failure : new Error(`${url}: HTTP ${status}`);
    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
  }
}

function writeAtomically(file: string, bytes: Uint8Array) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const partial = `${file}.${process.pid}.partial`;
  try { fs.writeFileSync(partial, bytes); fs.renameSync(partial, file); }
  finally { fs.rmSync(partial, {force: true}); }
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
      await stageEmbeddingModel({target: path.join(staged.output, EMBEDDING_MODEL.path)});
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
