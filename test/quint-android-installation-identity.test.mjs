// Full-module import, real source-view I/O and verifier calls. No APK, key or device is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {androidIdentity, stageAndroidIdentity, verifyAndroidIdentity, RETAINED_ANDROID_APP_ID} from '../scripts/android-identity.ts';
import {captureInputs, checkTraces} from '../specs/quint/refinement/check-traces.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.config.json'), 'utf8')).appId;
const packages = ['', canonical, RETAINED_ANDROID_APP_ID, 'example.unreviewed.app'];
const sourceName = 'android/app/src/main/java/' + canonical.replaceAll('.', '/') + '/AlphaTelephony.java';
const original = fs.readFileSync(path.join(ROOT, sourceName), 'utf8');
const revisions = [original, original + '\n// Second source input identity.\n'];
const sha = value => createHash('sha256').update(value).digest('hex');
const action = (name, ...args) => ({name, args});

function observeTrace(name, operations) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-identity-trace-'));
 const previous = process.env.ALPHA_ANDROID_APPLICATION_ID;
 try {
  const write = (name, data) => {const file = path.join(root, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, data);};
  for (const name of ['app.config.json', 'android/consumer-host.json']) write(name, fs.readFileSync(path.join(ROOT, name)));
  write(sourceName, revisions[0]);
  process.env.ALPHA_ANDROID_APPLICATION_ID = canonical;
  const views = [];
  let accepted = false, result = 'none';
  const project = () => {
   const profileFile = path.join(root, 'android/.eliza-consumer-profile.json');
   const profile = fs.existsSync(profileFile) ? JSON.parse(fs.readFileSync(profileFile, 'utf8')) : null;
   const asset = profile?.assetFiles[0];
   const receipt = asset ? JSON.parse(fs.readFileSync(asset.source, 'utf8')) : null;
   const state = {
    selected: packages.indexOf(process.env.ALPHA_ANDROID_APPLICATION_ID),
    profile: profile ? packages.indexOf(profile.identity.appId) : 0,
    revision: revisions.indexOf(fs.readFileSync(path.join(root, sourceName), 'utf8')),
    profileRevision: receipt ? revisions.findIndex(value => sha(value) === receipt.inputs[sourceName]) : 0,
    cache0: !views[0] ? 'none' : fs.existsSync(path.join(views[0], 'injected.java')) ? 'bad' : 'good',
    cache1: !views[1] ? 'none' : fs.existsSync(path.join(views[1], 'injected.java')) ? 'bad' : 'good',
    accepted, result,
   };
   return Object.fromEntries(Object.entries(state).map(([key, value]) => ['s.' + key, value]));
  };
  const expect = project();
  const steps = operations.map(([name, ...args]) => {
   accepted = false; result = 'none';
   if (name === 'selectPackage') process.env.ALPHA_ANDROID_APPLICATION_ID = packages[args[0]];
   else if (name === 'editInput') {
    const revision = revisions.indexOf(fs.readFileSync(path.join(root, sourceName), 'utf8'));
    write(sourceName, revisions[1 - revision]);
   } else if (name === 'tamper') {
    const profile = JSON.parse(fs.readFileSync(path.join(root, 'android/.eliza-consumer-profile.json'), 'utf8'));
    fs.writeFileSync(path.join(path.dirname(profile.assetFiles[0].source), 'injected.java'), '// unreviewed');
   } else {
    const before = fs.readFileSync(path.join(root, sourceName));
    try {
     if (name === 'generate') {
      const identity = androidIdentity(root), view = stageAndroidIdentity(root, identity);
      if (view) views[revisions.indexOf(before.toString())] = view.root;
      write('android/.eliza-consumer-profile.json', JSON.stringify({identity, assetFiles: view ? [{name: 'android-identity.json', source: path.join(view.root, 'identity.json')}] : []}));
      result = 'generated';
     } else {
      assert.equal(name, 'verify');
      verifyAndroidIdentity(root); accepted = true; result = 'accepted';
     }
    } catch {result = 'refused';}
    assert.deepEqual(fs.readFileSync(path.join(root, sourceName)), before, 'Generation and verification preserve authored input bytes');
   }
   return {action: action(name, ...args), expect: project()};
  });
  return {name, init: action('init'), expect, steps};
 } finally {
  if (previous === undefined) delete process.env.ALPHA_ANDROID_APPLICATION_ID;
  else process.env.ALPHA_ANDROID_APPLICATION_ID = previous;
  fs.rmSync(root, {recursive: true, force: true});
 }
}

test('installation source generation and verification refine the package/current-input safety model', async () => {
 const sources = ['scripts/android-identity.ts', 'android/consumer-host.json', 'app.config.json', sourceName, fileURLToPath(import.meta.url)];
 const driverHashes = captureInputs(sources);
 const traces = [
  observeTrace('canonical-default', [['generate'], ['verify'], ['editInput'], ['verify']]),
  observeTrace('retained-input-change-and-regeneration', [['selectPackage', 2], ['generate'], ['verify'], ['editInput'], ['verify'], ['generate'], ['verify']]),
  observeTrace('tampered-cache-is-not-repaired-silently', [['selectPackage', 2], ['generate'], ['tamper'], ['generate'], ['verify']]),
  observeTrace('canonical-selection-preserves-inactive-cache', [['selectPackage', 2], ['generate'], ['tamper'], ['selectPackage', 1], ['generate'], ['verify'], ['selectPackage', 2], ['generate'], ['verify']]),
  observeTrace('unknown-package-does-not-replace-profile', [['generate'], ['selectPackage', 3], ['generate'], ['verify'], ['selectPackage', 1], ['verify']]),
 ];
 const receipt = await checkTraces({model: 'AndroidInstallationIdentity', sources, driverHashes, traces, scope: 'bounded-orchestration', assumptions: [
  'The complete production identity module is imported. Real temporary files and its actual generation/verifier calls provide every observed result.',
  'One full authored Java input has two byte identities. Minimal generated-profile metadata supplies the same identity/asset fields the owning full-generator test separately exercises.',
  'Tampering adds an unlisted file to the current generated view. Concurrent producers, I/O interruption, Gradle, native model/JNI compatibility, cryptography and installed acceptance are separate gates.',
 ]});
 assert.ok(receipt.passed && receipt.driverInputsBound && receipt.inputsUnchanged);
});
