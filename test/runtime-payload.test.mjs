// The resident runtime payload under its vibestack names (register rows E2-011, E2-012, E2-114, E2-242, A2-218):
// what scripts/stage-agent-runtime.ts stages through upstream @elizaos/os stageRuntimePayload, what the app's
// on-device agent check (ResidentPayload, AlphaLocalAgentPlugin.runtimePackaged) looks for, the file mode the Pixel
// 10a product composition and the native stager give libeliza_node.so, and the payload files diagnostics hash.
// Host checks only: no APK is built and nothing runs on a device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runJvm, jvmSkip, nativeSource, fixture, root} from './fixtures/jvm-tools.mjs';
import {AGENT_ENTRY, AGENT_INVENTORY, NODE_RUNTIME_LIBRARY, RUNTIME_PAYLOAD, STAGED_AGENT_ASSETS, apkNodeRuntime} from '../scripts/agent-payload.ts';
import {EXECUTABLE_NATIVE_LIBRARIES, nativeLibraryMode} from '../scripts/os-ported/os/pixel10a-product.ts';
import {stagedRuntime} from '../scripts/android-host.ts';
import {embeddingApkProblems} from '../scripts/stage-embedding-host.ts';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const upstreamAgent = name => path.join(root, 'vendor/eliza/packages/os/android/agent-service/src/main/java/ai/eliza/os/agent', name);
const upstreamFixtures = path.join(root, 'vendor/eliza/packages/os/test/fixtures/runtime-payload');

test('the on-device agent is offered for the vibestack payload (inventory.json and libeliza_node.so) and never for the Bun-era files', {skip: jvmSkip('javac')}, () => {
  const sources = [nativeSource('ResidentPayload.java'), upstreamAgent('PayloadCheck.java'), upstreamAgent('AgentDirectories.java'), upstreamAgent('RouteGate.java'),
    fixture('resident-payload-jvm/ResidentPayloadTest.java')];
  const out = JSON.parse(runJvm(sources, 'ai.alphacompute.alphaphone.ResidentPayloadTest', {release: '21'}).trim());
  assert.deepEqual(out, {inventory: `agent/${AGENT_INVENTORY}`, node: NODE_RUNTIME_LIBRARY, vibestack: true, bunEra: false, noInventory: false, noRuntime: false, noDirectory: false});
  const plugin = fs.readFileSync(nativeSource('AlphaLocalAgentPlugin.java'), 'utf8');
  assert.match(plugin, /return ResidentPayload\.packaged\(context\.getAssets\(\)::open,new File\(context\.getApplicationInfo\(\)\.nativeLibraryDir\)\);/);
});

test('agent:stage-android stages an Android source set the generated host packages, with libeliza_node.so executable as the image composer expects', async t => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-runtime-payload-'));
  t.after(() => fs.rmSync(scratch, {recursive: true, force: true}));
  const elf = fs.readFileSync(path.join(upstreamFixtures, 'node-arm64-v8a.so'));
  const pinned = JSON.parse(fs.readFileSync(path.join(root, 'vendor/eliza/packages/os/aosp/runtime/node.lock.json'), 'utf8'));
  const lock = path.join(scratch, 'node.lock.json');
  fs.writeFileSync(lock, JSON.stringify({...pinned, entries: [{abi: 'arm64-v8a', sha256: sha(elf), archiveSha256: 'a'.repeat(64), url: 'https://example.invalid/node.zip'}]}));
  const built = path.join(scratch, 'built');
  fs.mkdirSync(built);
  fs.writeFileSync(path.join(built, NODE_RUNTIME_LIBRARY), elf);
  fs.writeFileSync(path.join(built, 'node-runtime.json'), JSON.stringify({schema: 1, abi: 'arm64-v8a', version: pinned.version, ndk: pinned.ndk, apiLevel: pinned.apiLevel, sha256: sha(elf)}));
  const consumer = path.join(scratch, 'consumer');
  assert.equal(stagedRuntime(consumer), undefined, 'no payload is handed to the generated host before staging');

  const {stageAgentRuntime} = await import('../scripts/stage-agent-runtime.ts');
  const stage = () => stageAgentRuntime({bundleDir: path.join(upstreamFixtures, 'bundle'), abi: ['arm64-v8a'], workflowWorker: null,
    output: path.join(consumer, RUNTIME_PAYLOAD), lock, runtimes: [{kind: 'built', dir: built}]});
  await stage();
  // stageRuntimePayload refuses an existing output, so a second staging must replace the first.
  const staged = await stage();
  assert.equal(staged.output, path.join(consumer, RUNTIME_PAYLOAD));
  assert.equal(stagedRuntime(consumer), path.join(consumer, RUNTIME_PAYLOAD));

  const assets = path.join(consumer, STAGED_AGENT_ASSETS);
  for (const name of [AGENT_ENTRY, 'manifest.json', AGENT_INVENTORY, 'alpha-source.json', 'alpha-runtime-profile.json', 'native-view-declarations.json', 'image-native-view-declarations.json'])
    assert.ok(fs.statSync(path.join(assets, name)).isFile(), name);
  const inventory = JSON.parse(fs.readFileSync(path.join(assets, AGENT_INVENTORY), 'utf8'));
  assert.deepEqual(inventory.files.map(row => row.path).sort(), [`assets/agent/${AGENT_ENTRY}`, 'assets/agent/manifest.json', apkNodeRuntime('arm64-v8a')]);
  const stamp = JSON.parse(fs.readFileSync(path.join(assets, 'alpha-source.json'), 'utf8'));
  assert.equal(stamp.base, JSON.parse(fs.readFileSync(path.join(root, 'upstream.lock.json'), 'utf8')).commit);

  const node = path.join(consumer, RUNTIME_PAYLOAD, 'android/app/src/main/jniLibs/arm64-v8a', NODE_RUNTIME_LIBRARY);
  assert.equal(sha(fs.readFileSync(node)), sha(elf));
  const mode = (fs.statSync(node).mode & 0o777).toString(8).padStart(4, '0');
  assert.equal(mode, '0755', 'upstream installs the Node runtime executable');
  assert.equal(nativeLibraryMode(NODE_RUNTIME_LIBRARY), mode, 'the Pixel 10a composer expects the staged mode');
  assert.equal((fs.statSync(path.join(assets, AGENT_ENTRY)).mode & 0o777).toString(8).padStart(4, '0'), '0644');
});

test('the Pixel 10a composer and the native stager give exactly libeliza_node.so mode 0755 and every other JNI library 0644', () => {
  assert.deepEqual(EXECUTABLE_NATIVE_LIBRARIES, [NODE_RUNTIME_LIBRARY]);
  const names = [NODE_RUNTIME_LIBRARY, 'libelizainference.so', 'libparadeevoicejni.so', 'libc++_shared.so', 'libeliza_bun.so', 'libeliza_ld_musl_aarch64.so'];
  const program = 'import importlib.util,json,sys\n'
    + 'spec=importlib.util.spec_from_file_location("stager",sys.argv[1]);stager=importlib.util.module_from_spec(spec);spec.loader.exec_module(stager)\n'
    + 'print(json.dumps({target:{n:config["modes"].get(n,"0644") for n in sys.argv[2:]} for target,config in stager.TARGETS.items()}))';
  const stager = JSON.parse(execFileSync('python3', ['-I', '-c', program, path.join(root, 'scripts/os-ported/os/stage-android-native.py'), ...names], {encoding: 'utf8'}));
  for (const [target, modes] of Object.entries(stager))
    for (const name of names) assert.equal(modes[name], nativeLibraryMode(name), `${target} ${name}`);
  const composer = fs.readFileSync(path.join(root, 'scripts/os-ported/os/pixel10a-product.ts'), 'utf8');
  assert.doesNotMatch(composer, /libeliza_bun|libeliza_ld_musl/);
});

test('the embedding APK check finds the resident ABIs by the packaged Node runtime', () => {
  const names = [apkNodeRuntime('arm64-v8a'), apkNodeRuntime('x86_64'), 'lib/x86_64/libeliza_bun.so'];
  const problems = embeddingApkProblems({names, read: () => Buffer.alloc(0)}, {abi: 'arm64-v8a', libraries: [], additionalAbis: []});
  assert.ok(problems.some(problem => /Resident embedding ABI is not admitted: x86_64/.test(problem)), problems.join('\n'));
  assert.ok(problems.every(problem => !/armeabi|libeliza_bun/.test(problem)), problems.join('\n'));
});

test('diagnostics hash the payload files the stager writes, in the same list natively and in the renderer', () => {
  const list = text => [...text.matchAll(/"(agent\/[^"]+)"/g)].map(match => match[1]);
  const renderer = list(/RUNTIME_HASH_ASSETS = \[([^\]]+)\]/.exec(fs.readFileSync(path.join(root, 'apps/app/src/settings/diagnostics.vibe'), 'utf8'))[1]);
  const native = list(/for\(String asset:new String\[\]\{([^}]+)\}\)\{String hash=assetSha256/.exec(fs.readFileSync(nativeSource('AlphaDevicePlugin.java'), 'utf8'))[1]);
  assert.deepEqual(native, renderer);
  assert.deepEqual(renderer.filter(name => !name.startsWith('agent/workflow-worker/')), ['agent/alpha-source.json', `agent/${AGENT_INVENTORY}`, `agent/${AGENT_ENTRY}`]);
});

test('the packaged-runtime verifier compares an APK with the payload agent:stage-android writes', () => {
  const staged = execFileSync('python3', ['-I', '-c', 'import importlib.util,sys\nspec=importlib.util.spec_from_file_location("v",sys.argv[1]);v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)\nprint(v.STAGED.relative_to(v.ROOT).as_posix())',
    path.join(root, 'scripts/verify-packaged-runtime.py')], {encoding: 'utf8'}).trim();
  assert.equal(staged, STAGED_AGENT_ASSETS);
});

test('no Alpha runtime code, script or Android test names a Bun-era payload file', () => {
  const files = execFileSync('git', ['ls-files', '--', 'android/app/src', 'scripts', 'apps/app/src', '.github/workflows', 'licenses'], {cwd: root, encoding: 'utf8'}).split('\n')
    .filter(file => file && file !== 'scripts/legacy-retirement.json' && fs.existsSync(path.join(root, file)) && /\.(java|ts|mjs|py|vibe|ya?ml|json|sh)$/.test(file));
  const legacy = /libeliza_bun|libeliza_ld_musl|agent-bundle\.js|BUN_FEATURE_FLAG|ELIZA_BUN_CHANNEL/;
  const offenders = files.filter(file => legacy.test(fs.readFileSync(path.join(root, file), 'utf8')));
  assert.deepEqual(offenders, []);
});
