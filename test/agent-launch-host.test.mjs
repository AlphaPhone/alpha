// The resident's launch data (android/agent/host.json, character.json, policy.json) judged by upstream's own
// validators at the vendor/eliza pin (A2-005, A2-006, E2-004):
//  - the agent service's start admission, vendor/eliza packages/os AgentConfig.java, which the resident's
//    service runs at every start and which writes the launch document;
//  - the os build's agent data admission, admitAgentBytes (packages/os/src/build/agent-config.vibe);
//  - the agent process's own launch parse, parseLaunch (packages/agent/src/host/launch.vibe), given a frame
//    with a device key.
// Evidence class: source and host-JVM test only. It is not an APK build, an emulator run or a signed-in chat
// turn on a device; a hosted reply still needs that check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Effect} from 'effect';
import {admitAgentBytes} from '../vendor/eliza/packages/os/src/build/agent-config.vibe';
import {parseLaunch} from '../vendor/eliza/packages/agent/src/host/launch.vibe';
import {fixture, jvmSkip, root, runJvm} from './fixtures/jvm-tools.mjs';

const agentFile = name => path.join(root, 'android/agent', name);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const host = () => JSON.parse(read('android/agent/host.json'));
const agentService = name => path.join(root, 'vendor/eliza/packages/os/android/agent-service/src/main/java/ai/eliza/os/agent', name);
const serviceSources = ['AgentConfig.java', 'RouteGate.java', 'ChannelPolicy.java', 'AgentCredentials.java', 'LaunchFrame.java'].map(agentService);

/** Upstream AgentConfig's verdict on these three files: {admitted, needsAccount, ownKey, document} or {refused}. */
function serviceVerdict(hostPath = agentFile('host.json')) {
  const output = runJvm([...serviceSources, fixture('AgentLaunchDocument.java')], 'AgentLaunchDocument',
    {release: '21', args: [hostPath, agentFile('character.json'), agentFile('policy.json')]});
  const [verdict, document] = output.split('\n');
  if (verdict.startsWith('refused ')) return {refused: verdict.slice('refused '.length)};
  const [, needsAccount, ownKey] = verdict.split(' ');
  return {admitted: true, needsAccount: needsAccount === 'true', ownKey: ownKey === 'true', document};
}

/** The same host file with one change, written to a temporary file. */
function changedHost(change) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-agent-host-'));
  const file = path.join(directory, 'host.json');
  const changed = host();
  change(changed);
  fs.writeFileSync(file, JSON.stringify(changed));
  return {file, done: () => fs.rmSync(directory, {recursive: true, force: true})};
}

const bytes = file => new Uint8Array(fs.readFileSync(file));
const buildAdmission = (hostBytes = bytes(agentFile('host.json'))) =>
  Effect.runPromise(Effect.either(admitAgentBytes({host: hostBytes, character: bytes(agentFile('character.json')), policy: bytes(agentFile('policy.json'))})));

test('the resident launches on Alpha Cloud with the model Alpha Cloud serves', () => {
  const deployment = JSON.parse(read('cloud/deployment.json'));
  const alphaModel = /export const alphaModel = "([^"]+)"/.exec(read('cloud/src/profile.vibe'))?.[1];
  assert.ok(alphaModel, 'cloud/src/profile.vibe names the model Alpha Cloud serves');
  // Owner decision 2026-11-23 (E2-003): at the cutover the phone talks to Alpha's own Cloud.
  assert.deepEqual(host().model, {
    backend: 'cloud', cloudBaseUrl: deployment.alphaCloudHosts.production.api,
    smallModel: alphaModel, largeModel: alphaModel,
    // Alpha Cloud's profile has no vision model, so image description names none.
    imageModel: '',
  });
  assert.match(read('cloud/src/profile.vibe'), new RegExp(`models: \\[\\{ id: alphaModel, provider: "cerebras", upstreamModel: alphaModel, vision: false \\}\\]`));
});

test('local embeddings name the dimensions of the embedding model the APK ships', () => {
  const qualified = JSON.parse(read('android/embedding-host/qualified-host.json'));
  assert.equal(host().embeddings, 'local');
  assert.equal(host().embeddingDimensions, qualified.model.dimensions);
  assert.equal(qualified.model.dimensions, 384);
});

test('upstream AgentConfig admits the shipped agent data and writes a cloud launch document', {skip: jvmSkip('javac')}, async () => {
  const verdict = serviceVerdict();
  assert.equal(verdict.refused, undefined, `AgentConfig refused the shipped files: ${verdict.refused}`);
  assert.equal(verdict.needsAccount, true, 'a cloud launch needs the signed-in account');
  assert.equal(verdict.ownKey, false);
  const document = JSON.parse(verdict.document);
  assert.deepEqual(document.model, host().model);
  assert.deepEqual(document.account, {userId: 'owner-user', organizationId: 'owner-org'});
  assert.equal(document.embeddings, 'local');
  assert.equal(document.embeddingDimensions, 384);

  // The agent process admits the document the service wrote, framed with the device key it sends a cloud launch.
  const frame = JSON.stringify({version: 1, token: 'launch-token', epoch: 1, credential: {version: 1, value: 'device-key'}});
  const parsed = await Effect.runPromise(Effect.either(parseLaunch(verdict.document, frame)));
  assert.equal(parsed._tag, 'Right', `the agent refused the launch document: ${JSON.stringify(parsed.left)}`);
  assert.equal(parsed.right.launch.model.backend, 'cloud');
  // Signed out (P-43), Alpha frames its no-Cloud-key placeholder; the agent must still admit the frame, or the
  // resident would not run at all.
  const unbound = /static final String UNBOUND = "([^"]+)";/.exec(read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaAgentCredentials.java'))?.[1];
  assert.ok(unbound, 'AlphaAgentCredentials names its signed-out key');
  const signedOut = await Effect.runPromise(Effect.either(parseLaunch(verdict.document,
    JSON.stringify({version: 1, token: 'launch-token', epoch: 1, credential: {version: 1, value: unbound}}))));
  assert.equal(signedOut._tag, 'Right', 'the agent admits the signed-out launch frame');
  // Without a credential the agent refuses a cloud launch as a credential error, never as a keyless run.
  const keyless = await Effect.runPromise(Effect.either(parseLaunch(verdict.document, JSON.stringify({version: 1, token: 'launch-token', epoch: 1}))));
  assert.equal(keyless._tag, 'Left');
});

test('upstream AgentConfig refuses local embeddings without their dimensions and a keyless model', {skip: jvmSkip('javac')}, () => {
  const undimensioned = changedHost(h => { delete h.embeddingDimensions; });
  try { assert.deepEqual(serviceVerdict(undimensioned.file), {refused: 'Local embeddings need their dimensions'}); }
  finally { undimensioned.done(); }
  const foreign = changedHost(h => { h.model.cloudBaseUrl = 'https://api.alphacompute.cc/api/v1'; });
  try { assert.deepEqual(serviceVerdict(foreign.file), {refused: 'The cloud address is an https origin'}); }
  finally { foreign.done(); }
});

test('the os build admission admits the shipped agent data', async () => {
  const admitted = await buildAdmission();
  assert.equal(admitted._tag, 'Right', `admitAgentBytes refused the shipped files: ${admitted.left?.detail}`);
  assert.equal(admitted.right.service, host().service);
  assert.equal(admitted.right.needsAccount, true);
  const undimensioned = host();
  delete undimensioned.embeddingDimensions;
  const refused = await buildAdmission(new TextEncoder().encode(JSON.stringify(undimensioned)));
  assert.equal(refused._tag, 'Left', 'the build admission refuses local embeddings without their dimensions');
});

test('the launch hook exports no provider key or model selector into the launch environment', () => {
  const plugin = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  const retired = /static final String\[\] LAUNCH_MODEL_ENVIRONMENT=\{([^}]*)\}/.exec(plugin)?.[1];
  assert.ok(retired, 'AlphaLocalAgentPlugin names the retired launch variables');
  const names = [...retired.matchAll(/"([A-Z0-9_]+)"/g)].map(match => match[1]);
  for (const name of ['ELIZAOS_CLOUD_API_KEY', 'ELIZAOS_CLOUD_BASE_URL', 'CEREBRAS_API_KEY', 'OPENAI_API_KEY', 'CARTESIA_API_KEY'])
    assert.ok(names.includes(name), `${name} is removed from the launch environment`);
  assert.match(plugin, /for\(String retired:LAUNCH_MODEL_ENVIRONMENT\)env\.remove\(retired\);/);
  assert.doesNotMatch(plugin, /env\.put\("ELIZAOS_CLOUD_BASE_URL"/);
});
