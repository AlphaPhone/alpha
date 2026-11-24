// Runtime notice enumeration on a payload the pinned upstream stageRuntimePayload stages from fixture inputs (fixture
// Node ELF files, not a runnable runtime); not APK, device or legal evidence.
// Policy P-09: a copyleft, unknown or text-less package is listed and flagged; only broken input fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {RUNTIME_ENTRY, collectNotices, finishEntry, packagedRuntimePresent, runtimeEntries, ROOT, UNVERIFIED} from '../scripts/generate-licenses.ts';
import {installRuntimePayload, stageEmbeddingModel} from '../scripts/stage-agent-runtime.ts';
import {stageRuntimePayload} from '../scripts/upstream-os.ts';

const canonicalTexts = {MIT: 'MIT terms', ISC: 'ISC terms', 'Apache-2.0': 'Apache terms'};
const templates = {mit: 'MIT terms', isc: 'ISC terms', apache: 'Apache terms', canonical: expression => canonicalTexts[expression] ?? ''};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const FIXTURES = path.join(ROOT, 'vendor/eliza/packages/os/test/fixtures/runtime-payload');
const ABIS = ['arm64-v8a', 'x86_64'];
const write = (file, bytes) => { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes); };

/** A checkout with the voice host's libraries already in jniLibs and a payload staged by upstream from fixture inputs. */
async function stagedCheckout(t, {abi = ABIS} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-runtime-notices-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const main = path.join(root, 'android/app/src/main');
  const source = path.join(root, 'vendor/eliza');
  const elf = Object.fromEntries(ABIS.map(name => [name, fs.readFileSync(path.join(FIXTURES, `node-${name}.so`))]));
  const lock = path.join(source, 'packages/os/aosp/runtime/node.lock.json');
  write(lock, JSON.stringify({version: '26.13.1', ndk: '29.0.14206865', apiLevel: 29, sourceSha256: 'e'.repeat(64), buildCommit: 'c'.repeat(40),
    entries: ABIS.map(name => ({abi: name, sha256: sha256(elf[name]), archiveSha256: 'a'.repeat(64), url: `https://example.test/node-${name}.zip`}))}));
  const runtimes = abi.map(name => {
    const dir = path.join(root, 'inputs', `node-${name}`);
    write(path.join(dir, 'libeliza_node.so'), elf[name]);
    write(path.join(dir, 'node-runtime.json'), JSON.stringify({schema: 1, abi: name, version: '26.13.1', ndk: '29.0.14206865', apiLevel: 29, sha256: sha256(elf[name])}));
    return {kind: 'built', dir};
  });
  // Installed packages, as the workspace holds them: a workspace package of the pin and pnpm store entries.
  write(path.join(source, 'packages/core/package.json'), JSON.stringify({name: '@elizaos/core', version: '2.0.0', license: 'MIT'}));
  write(path.join(source, 'packages/core/LICENSE'), 'core licence text');
  write(path.join(root, 'node_modules/.pnpm/zod@4.1.0/node_modules/zod/package.json'), JSON.stringify({name: 'zod', version: '4.1.0', license: 'MIT'}));
  write(path.join(root, 'node_modules/.pnpm/zod@4.1.0/node_modules/zod/LICENSE'), 'zod licence text');
  write(path.join(root, 'node_modules/.pnpm/@scope+pkg@2.0.0_abc/node_modules/@scope/pkg/package.json'), JSON.stringify({name: '@scope/pkg', version: '2.0.0', license: {type: 'ISC'}}));
  // The worker artifact and the bundle that pins it.
  const worker = path.join(root, 'inputs/worker');
  write(path.join(worker, 'src/worker/main.js'), 'export const worker = 1\n');
  write(path.join(worker, 'dependencies.json'), JSON.stringify({zod: '4.1.0', '@scope/pkg': '2.0.0'}));
  const bundle = path.join(root, 'inputs/bundle');
  const agent = 'export const agent = 1\n';
  write(path.join(bundle, 'agent.mjs'), agent);
  write(path.join(bundle, 'manifest.json'), JSON.stringify({schema: 1, node: '26', bundleSha256: sha256(agent), localInference: false,
    workflowWorkerSha256: sha256('export const worker = 1\n'), packages: [{name: '@elizaos/core', version: '2.0.0'}, {name: 'zod', version: '4.1.0'}]}));
  // Earlier build steps: the voice host's engine, and a Node runtime from an older staging for x86_64.
  write(path.join(main, 'jniLibs/arm64-v8a/libelizainference.so'), 'voice engine');
  write(path.join(main, 'jniLibs/x86_64/libeliza_node.so'), 'older runtime');
  write(path.join(main, 'assets/agent/stale.txt'), 'previous payload');
  const staged = await stageRuntimePayload({abi, bundleDir: bundle, lock, runtimes, workflowWorker: {dir: worker, executable: 'src/worker/main.js'}, output: path.join(root, 'payload')});
  installRuntimePayload(staged.output, main);
  write(path.join(main, 'assets/agent/alpha-source.json'), JSON.stringify({base: 'a'.repeat(40)}));
  return {root, main, agentDir: path.join(main, 'assets/agent'), source, staged, elf};
}

test('the staged payload moves into the source set: assets replaced, only the Node runtime replaced in jniLibs', async t => {
  const {main, staged, elf} = await stagedCheckout(t);
  assert.deepEqual(staged.inventory.filter(row => row.path.startsWith('lib/')).map(row => row.path), ['lib/arm64-v8a/libeliza_node.so', 'lib/x86_64/libeliza_node.so']);
  assert.equal(fs.existsSync(path.join(main, 'assets/agent/stale.txt')), false, 'the previous payload is replaced');
  for (const name of ['agent.mjs', 'manifest.json', 'inventory.json', 'workflow-worker/src/worker/main.js']) assert.ok(fs.existsSync(path.join(main, 'assets/agent', name)), name);
  for (const abi of ABIS) {
    const file = path.join(main, 'jniLibs', abi, 'libeliza_node.so');
    assert.deepEqual(fs.readFileSync(file), elf[abi], abi);
    assert.equal(fs.statSync(file).mode & 0o777, 0o755, `${abi} runtime stays executable`);
  }
  assert.equal(fs.readFileSync(path.join(main, 'jniLibs/arm64-v8a/libelizainference.so'), 'utf8'), 'voice engine', 'other hosts keep their libraries');
  assert.equal(fs.existsSync(staged.output), true, 'the caller removes its scratch payload');
});

test('a payload for fewer ABIs removes the Node runtime of an ABI it does not target', async t => {
  const {main, root, agentDir, source} = await stagedCheckout(t, {abi: ['arm64-v8a']});
  assert.equal(fs.existsSync(path.join(main, 'jniLibs/x86_64/libeliza_node.so')), false);
  const errors = [];
  const node = runtimeEntries(root, templates, errors, {agentDir, sourceDir: source}).find(entry => entry.name === RUNTIME_ENTRY);
  assert.deepEqual(errors, []);
  assert.match(node.text, /packaged as libeliza_node\.so for arm64-v8a and runs/);
});

test('a PACKAGED runtime lists Node for the staged ABIs and every bundled agent and worker package', async t => {
  const {root, agentDir, source} = await stagedCheckout(t);
  assert.equal(packagedRuntimePresent(root, agentDir), true);
  const errors = [];
  const entries = runtimeEntries(root, templates, errors, {agentDir, sourceDir: source});
  assert.deepEqual(errors, []);
  const byName = Object.fromEntries(entries.map(entry => [entry.name, entry]));
  const node = byName[RUNTIME_ENTRY];
  assert.equal(node.version, '26.13.1 (nodejs/node v26.13.1)');
  assert.equal(node.license, UNVERIFIED);
  assert.match(node.text, /Node\.js 26\.13\.1, built for Android with NDK 29\.0\.14206865 \(elizaOS\/eliza c{40}\), is packaged as libeliza_node\.so for arm64-v8a and x86_64/);
  assert.match(node.text, /MIT terms/);
  assert.deepEqual(entries.map(entry => entry.name).sort(), ['@elizaos/core', '@scope/pkg', RUNTIME_ENTRY, 'zod'].sort());
  assert.match(byName['@elizaos/core'].text, /^Bundled in the on-device agent bundle\.\n\ncore licence text/);
  assert.match(byName.zod.text, /^Bundled in the on-device agent bundle and workflow worker\./);
  assert.match(byName['@scope/pkg'].text, /^Bundled in the on-device workflow worker\./);
  assert.deepEqual([byName['@scope/pkg'].textSource, finishEntry(byName['@scope/pkg']).flags], ['spdx-canonical', ['licence-text-missing-from-package']]);
});

test('a Node runtime that is not the staged pinned bytes, or no staged runtime at all, fails generation', async t => {
  const {root, main, agentDir, source} = await stagedCheckout(t);
  fs.writeFileSync(path.join(main, 'jniLibs/x86_64/libeliza_node.so'), 'replaced');
  let errors = [];
  let node = runtimeEntries(root, templates, errors, {agentDir, sourceDir: source}).find(entry => entry.name === RUNTIME_ENTRY);
  assert.match(errors.join('\n'), /jniLibs\/x86_64\/libeliza_node\.so is not the staged Node runtime/);
  assert.match(node.text, /for arm64-v8a and runs/, 'the notice names only the runtime that is staged');
  const inventory = path.join(agentDir, 'inventory.json');
  const document = JSON.parse(fs.readFileSync(inventory, 'utf8'));
  fs.writeFileSync(inventory, JSON.stringify({...document, files: document.files.filter(row => !row.path.startsWith('lib/'))}));
  errors = [];
  node = runtimeEntries(root, templates, errors, {agentDir, sourceDir: source}).find(entry => entry.name === RUNTIME_ENTRY);
  assert.equal(node, undefined);
  assert.match(errors.join('\n'), /inventory\.json lists no libeliza_node\.so/);
});

test('a bundled package missing from the workspace or a missing worker inventory fails generation', async t => {
  const {root, agentDir, source} = await stagedCheckout(t);
  fs.rmSync(path.join(root, 'node_modules/.pnpm/zod@4.1.0'), {recursive: true});
  fs.rmSync(path.join(agentDir, 'workflow-worker/dependencies.json'));
  const errors = [];
  runtimeEntries(root, templates, errors, {agentDir, sourceDir: source});
  assert.ok(errors.some(error => /agent bundle: zod@4\.1\.0 is not installed/.test(error)), errors.join('\n'));
  assert.ok(errors.some(error => /dependencies\.json is missing/.test(error)), errors.join('\n'));
});

test('without a staged runtime only the umbrella payload entry is shipped', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-no-runtime-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.equal(packagedRuntimePresent(root), false);
  assert.deepEqual(runtimeEntries(root, templates, []), []);
  const committed = collectNotices(ROOT, {packagedRuntime: false});
  assert.equal(committed.entries.some(entry => entry.name === RUNTIME_ENTRY), false);
  assert.ok(committed.entries.some(entry => entry.name === 'On-device elizaOS agent runtime payload'));
});

test('the embedding model is staged only as the pinned bytes', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-embedding-model-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const target = path.join(root, 'assets/agent/models/bge-small-en-v1.5-f16.gguf'), cache = path.join(root, 'cache');
  const fetched = [];
  await assert.rejects(stageEmbeddingModel({target, cache, url: 'https://example.test/bge.gguf', fetchBytes: async url => { fetched.push(url); return new Uint8Array([1, 2, 3]); }}),
    /https:\/\/example\.test\/bge\.gguf is not the pinned bge-small-en-v1\.5-f16\.gguf/);
  assert.deepEqual(fetched, ['https://example.test/bge.gguf']);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(cache), false, 'refused bytes are not cached');
});
