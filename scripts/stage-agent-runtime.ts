#!/usr/bin/env node
// Stage the resident agent's Android runtime payload (Node runtime, agent bundle, the workflow worker built by
// scripts/build-workflow-worker.ts) into the app's source set with @elizaos/os/build stageRuntimePayload, stamp it
// with the pin and this stager's digest, and stage the pinned embedding model beside it.
//   node --conditions=eliza-source --import vibelang/register scripts/stage-agent-runtime.ts [--bundle DIR] [--abi arm64-v8a,x86_64]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {sha256, sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';
import {AGENT_BUNDLE_DIRECTORY} from './build-agent-bundle.ts';
import {workflowWorkerArtifact} from './build-workflow-worker.ts';
import {nativeCacheRoot} from './native-build-inputs.ts';
import {EMBEDDING_MODEL} from './stage-embedding-host.ts';
import {imageNativeViewDeclarationsJson, nativeViewDeclarationsJson} from './native-view-policy.ts';
import {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';
export {AGENT_ENTRY, AGENT_MANIFEST} from './agent-payload.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The app's main source set, the APK tree stageRuntimePayload writes. */
const ANDROID_MAIN = 'android/app/src/main';
/** The staged payload the APK packages. */
export const AGENT_ASSETS = path.join(root, ANDROID_MAIN, 'assets/agent');
/** The packaged debug and release ABIs. */
export const TARGET_ABIS = Object.freeze(['arm64-v8a', 'x86_64'] as const);
/** The Node runtime upstream stages per ABI (vendor/eliza spec/os/build/runtimePayload.md). */
export const NODE_LIBRARY = 'libeliza_node.so';

/**
 * Move a payload stageRuntimePayload wrote into the app's source set. Upstream writes a fresh APK tree,
 * <payload>/android/app/src/main with assets/agent (the bundle, the worker and inventory.json) and
 * jniLibs/<abi>/libeliza_node.so. The agent assets replace the previous payload's. jniLibs also holds the
 * voice and embedding hosts' libraries, so there only the Node runtime is replaced, and a Node runtime of
 * an ABI this payload does not target is removed.
 */
export function installRuntimePayload(payload: string, main = path.join(root, ANDROID_MAIN)) {
  const staged = path.join(payload, ANDROID_MAIN);
  const unexpected = [
    ...fs.readdirSync(staged).filter(name => name !== 'assets' && name !== 'jniLibs'),
    ...fs.readdirSync(path.join(staged, 'assets')).filter(name => name !== 'agent').map(name => `assets/${name}`),
    ...(fs.existsSync(path.join(staged, 'jniLibs')) ? fs.readdirSync(path.join(staged, 'jniLibs')).flatMap(abi =>
      fs.readdirSync(path.join(staged, 'jniLibs', abi)).filter(name => name !== NODE_LIBRARY).map(name => `jniLibs/${abi}/${name}`)) : []),
  ];
  if (unexpected.length) throw new Error(`The runtime payload carries files Alpha does not stage: ${unexpected.join(', ')}`);
  const assets = path.join(main, 'assets/agent'), jniLibs = path.join(main, 'jniLibs');
  fs.rmSync(assets, {recursive: true, force: true});
  fs.mkdirSync(path.dirname(assets), {recursive: true});
  fs.renameSync(path.join(staged, 'assets/agent'), assets);
  if (fs.existsSync(jniLibs)) for (const abi of fs.readdirSync(jniLibs)) fs.rmSync(path.join(jniLibs, abi, NODE_LIBRARY), {force: true});
  const abis = fs.existsSync(path.join(staged, 'jniLibs')) ? fs.readdirSync(path.join(staged, 'jniLibs')).sort() : [];
  for (const abi of abis) {
    fs.mkdirSync(path.join(jniLibs, abi), {recursive: true});
    fs.renameSync(path.join(staged, 'jniLibs', abi, NODE_LIBRARY), path.join(jniLibs, abi, NODE_LIBRARY));
  }
  return {assets, abis};
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
  const worker = workflowWorker ?? await workflowWorkerArtifact();
  const {stageRuntimePayload} = await import('./upstream-os.ts');
  // Upstream refuses an existing output, so it stages into a fresh directory on this filesystem and the result moves into place.
  fs.mkdirSync(path.join(root, '.eliza'), {recursive: true});
  const scratch = fs.mkdtempSync(path.join(root, '.eliza', 'runtime-payload-'));
  let staged;
  try {
    staged = await stageRuntimePayload({abi: abi as never, bundleDir, output: path.join(scratch, 'payload'), workflowWorker: worker});
    installRuntimePayload(staged.output);
  } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
  fs.writeFileSync(path.join(AGENT_ASSETS, 'alpha-source.json'), JSON.stringify({
    base: commit, patches: [], lockSha256: sha256File(path.join(root, 'upstream.lock.json')), stagerSha256: sha256File(fileURLToPath(import.meta.url)),
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(AGENT_ASSETS, 'native-view-declarations.json'), nativeViewDeclarationsJson);
  fs.writeFileSync(path.join(AGENT_ASSETS, 'image-native-view-declarations.json'), imageNativeViewDeclarationsJson);
  fs.writeFileSync(path.join(AGENT_ASSETS, 'alpha-runtime-profile.json'), JSON.stringify({version: 1, runtimeProfile: 'native'}, null, 2) + '\n');
  await stageEmbeddingModel();
  return {output: AGENT_ASSETS, inventory: staged.inventory, workflowWorker: staged.workflowWorker};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {bundle: {type: 'string'}, abi: {type: 'string'}, 'workflow-worker': {type: 'string'}, 'workflow-executable': {type: 'string'}}});
  const worker = values['workflow-worker'] && values['workflow-executable'] ? {dir: path.resolve(values['workflow-worker']), executable: values['workflow-executable']} : undefined;
  const staged = await stageAgentRuntime({bundleDir: values.bundle ? path.resolve(values.bundle) : undefined, abi: values.abi?.split(','), workflowWorker: worker});
  console.log(`Android runtime payload staged in ${path.relative(root, staged.output)} (${staged.inventory.length} files) with the pinned embedding model. This is not device execution evidence.`);
}
