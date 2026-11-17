import {fixtureTest} from './support/fixture-build-context.mjs';
// bun run android:build:fast (scripts/build-android-fast.ts) with stand-ins for `android:sync` and
// Gradle: the Gradle stand-in zips android/app/src/main/assets into the APK path the way Gradle
// packages assets, and the real inspection step then reads that zip. These checks run no Gradle
// and assemble no real APK; they are not APK, emulator or device evidence.
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildAndroidConsumer} from '../vendor/eliza/packages/app/scripts/mobile/android/build-consumer.mjs';
import {buildEnv} from '../scripts/build-android.ts';
import {APK_FLAGS_ENTRY, APK_RUNTIME_ENTRY, FAST_APK, FAST_OUTPUT, PACKAGED_FLAGS, STAGED_RUNTIME, fastBuildOptions, inspect, markFastIteration, parseFastArgs, syncMarkAndBuild, systemPackageInstalled, systemUpdateRefusal} from '../scripts/build-android-fast.ts';
import {auditWebBundle, FAST_ITERATION_ERROR} from '../scripts/audit-production-bundle.ts';

const tmp = t => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-fast-build-'));
 t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
 return dir;
};

test('fast build options parse strictly', () => {
 assert.deepEqual(parseFastArgs([]), {restage: false, install: false, inspect: false, allowSystemUpdate: false});
 assert.deepEqual(parseFastArgs(['--restage', '--install']), {restage: true, install: true, inspect: false, allowSystemUpdate: false});
 assert.deepEqual(parseFastArgs(['--install', '--allow-system-update']), {restage: false, install: true, inspect: false, allowSystemUpdate: true});
 for (const bad of [['--release'], ['--restage', '--restage'], ['--inspect', '--install'], ['--allow-system-update'], ['--inspect', '--allow-system-update']]) assert.throws(() => parseFastArgs(bad));
});

const MAIN = 'android/app/src/main';
const write = (file, text) => {fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text);};
/** Zip `entries` ({name: text}) into `apk`, replacing it. */
const zipEntries = (apk, entries) => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-fast-apk-'));
 try {
  for (const [name, text] of Object.entries(entries)) write(path.join(dir, name), text);
  fs.rmSync(apk, {force: true});
  fs.mkdirSync(path.dirname(apk), {recursive: true});
  execFileSync('zip', ['-q', '-r', path.resolve(apk), ...Object.keys(entries)], {cwd: dir});
 } finally {fs.rmSync(dir, {recursive: true, force: true});}
};

/** A consumer-build runner: Gradle packages src/main/assets as assets/, the verify step runs the real inspect. */
const fakeRunner = (root, calls) => (command, args, opts) => {
 calls.push({command, args, env: opts.env});
 if (command === './gradlew') {
  const apk = path.join(root, 'android/app/build/outputs/apk/launcher/debug/app-launcher-debug.apk');
  fs.rmSync(apk, {force: true});
  fs.mkdirSync(path.dirname(apk), {recursive: true});
  execFileSync('zip', ['-q', '-r', apk, 'assets'], {cwd: path.join(root, MAIN)});
 } else if (command === 'bun' && args.join(' ') === 'scripts/build-android-fast.ts --inspect') inspect(root);
 else throw new Error(`unexpected command ${command} ${args.join(' ')}`);
};

const fixtureRoot = t => {
 const root = tmp(t);
 fs.copyFileSync(new URL('../app.config.json', import.meta.url), path.join(root, 'app.config.json'));
 write(path.join(root, STAGED_RUNTIME), '// staged resident runtime');
 return root;
};

test('the packaged paths are the APK entries inspect reads', () => {
 // Gradle packages src/main/assets/<path> as assets/<path>.
 assert.equal(path.posix.relative(MAIN, PACKAGED_FLAGS), APK_FLAGS_ENTRY);
 assert.equal(path.posix.relative(MAIN, STAGED_RUNTIME), APK_RUNTIME_ENTRY);
});

test('inspect admits only an APK carrying the marker, a flag-off payload and the staged runtime', t => {
 const root = tmp(t);
 const apk = path.join(root, FAST_OUTPUT, FAST_APK);
 const manifest = path.join(root, FAST_OUTPUT, 'apk-manifest.json');
 const flags = value => JSON.stringify(value);
 const good = {[APK_FLAGS_ENTRY]: flags({testMocks: false, fastIteration: true}), [APK_RUNTIME_ENTRY]: 'runtime'};
 zipEntries(apk, good);
 inspect(root);
 const written = JSON.parse(fs.readFileSync(manifest, 'utf8'));
 assert.equal(written.fastIteration, true);
 assert.equal(written.apks.length, 1);
 assert.equal(written.apks[0].distributable, false);
 assert.equal(written.apks[0].bytes, fs.statSync(apk).size);
 const refused = [
  [{[APK_RUNTIME_ENTRY]: 'runtime'}, /build-flags\.json|unzip|Command failed/],
  [{...good, [APK_FLAGS_ENTRY]: flags({testMocks: false})}, /fastIteration marker/],
  [{...good, [APK_FLAGS_ENTRY]: flags({testMocks: false, fastIteration: 'yes'})}, /fastIteration marker/],
  [{...good, [APK_FLAGS_ENTRY]: flags({testMocks: true, fastIteration: true})}, /testMocks=true/],
  [{...good, [APK_FLAGS_ENTRY]: flags({fastIteration: true})}, /testMocks=undefined/],
  [{[APK_FLAGS_ENTRY]: good[APK_FLAGS_ENTRY]}, /staged resident runtime/],
  [{[APK_FLAGS_ENTRY]: good[APK_FLAGS_ENTRY], [`${APK_RUNTIME_ENTRY}.map`]: '{}'}, /staged resident runtime/],
 ];
 for (const [entries, error] of refused) {
  fs.rmSync(manifest, {force: true});
  zipEntries(apk, entries);
  assert.throws(() => inspect(root), error, JSON.stringify(Object.keys(entries)));
  assert.equal(fs.existsSync(manifest), false);
 }
});

fixtureTest('a fast build assembles only the debug launcher with a warm daemon, no lint and no androidTest, into artifacts/fast', t => {
 const root = fixtureRoot(t);
 write(path.join(root, PACKAGED_FLAGS), JSON.stringify({testMocks: false, fastIteration: true}));
 const env = buildEnv({PATH: process.env.PATH, ELIZA_DEV_ALLOW_TEST_MOCKS: '1', VITE_ELIZA_DEV_ALLOW_TEST_MOCKS: '1'});
 const options = fastBuildOptions(env, root);
 const calls = [];
 buildAndroidConsumer({...options, run: fakeRunner(root, calls)});
 const gradle = calls.filter(call => call.command === './gradlew');
 assert.equal(gradle.length, 1);
 assert.deepEqual(gradle[0].args, ['--daemon', ':app:assembleLauncherDebug']);
 assert.equal(gradle[0].env.ELIZA_DEV_ALLOW_TEST_MOCKS, undefined);
 assert.deepEqual(calls.filter(call => call.command === 'bun').map(call => call.args), [['scripts/build-android-fast.ts', '--inspect']]);
 const output = path.join(root, FAST_OUTPUT);
 assert.deepEqual(fs.readdirSync(output).sort(), ['apk-manifest.json', 'build-config.json', 'launcher-debug.apk']);
 assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'apk-manifest.json'), 'utf8')).apks[0].fastIteration, true);
 const record = JSON.parse(fs.readFileSync(path.join(output, 'build-config.json'), 'utf8'));
 assert.equal(record.fastIteration, true);
 assert.equal(record.distributable, false);
 assert.equal(record.testMocks, false);
 assert.equal(record.release, false);
 // Nothing lands at the top level of artifacts/, which verify-apks, signing and release admission read.
 assert.deepEqual(fs.readdirSync(path.join(root, 'artifacts')), ['fast']);
});

fixtureTest('the marker follows the last sync and reaches the APK the inspection reads', t => {
 const root = fixtureRoot(t);
 const steps = [];
 // android:sync recopies an unmarked build-flags.json from the web build, as the real sync does.
 const run = (command, args) => {
  steps.push(`${command} ${args.join(' ')}`);
  if (args.join(' ') === 'run android:sync') write(path.join(root, PACKAGED_FLAGS), JSON.stringify({testMocks: false}));
 };
 const calls = [];
 syncMarkAndBuild(root, run, () => {
  steps.push('build');
  buildAndroidConsumer({...fastBuildOptions(buildEnv({PATH: process.env.PATH}), root), run: fakeRunner(root, calls)});
 });
 assert.deepEqual(steps, ['bun scripts/android-host.ts', 'bun run android:sync', 'bun scripts/android-host.ts', 'build']);
 const apk = path.join(root, FAST_OUTPUT, FAST_APK);
 assert.deepEqual(JSON.parse(execFileSync('unzip', ['-p', apk, APK_FLAGS_ENTRY], {encoding: 'utf8'})), {testMocks: false, fastIteration: true});
 assert.equal(JSON.parse(fs.readFileSync(path.join(root, FAST_OUTPUT, 'apk-manifest.json'), 'utf8')).fastIteration, true);
});

test('the fast marker makes the production bundle audit refuse the payload', t => {
 const dir = tmp(t);
 fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Alpha Phone</title>');
 fs.writeFileSync(path.join(dir, 'build-flags.json'), JSON.stringify({testMocks: false}));
 assert.equal(auditWebBundle(dir, {testMocks: false}).ok, true);
 markFastIteration(path.join(dir, 'build-flags.json'));
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'build-flags.json'), 'utf8')), {testMocks: false, fastIteration: true});
 const result = auditWebBundle(dir, {testMocks: false});
 assert.equal(result.ok, false);
 assert.ok(result.errors.includes(FAST_ITERATION_ERROR));
 fs.writeFileSync(path.join(dir, 'build-flags.json'), JSON.stringify({testMocks: false, fastIteration: 'yes'}));
 assert.ok(auditWebBundle(dir, {testMocks: false}).errors.includes('build-flags.json is malformed.'));
});

test('a test-mocks payload is never marked as a fast build', t => {
 const file = path.join(tmp(t), 'build-flags.json');
 fs.writeFileSync(file, JSON.stringify({testMocks: true}));
 assert.throws(() => markFastIteration(file), /testMocks=true/);
});

test('--install refuses to replace the image system app unless explicitly allowed', () => {
 const id = 'ai.alphacompute.alphaphone';
 // `pm list packages -s` lists system apps, including ones already carrying a /data update.
 assert.equal(systemPackageInstalled('package:ai.alphacompute.alphaphone\r\n', id), true);
 assert.equal(systemPackageInstalled('package:ai.alphacompute.alphaphone.test\npackage:ai.alphacompute.alphaphone.imagecapabilities\n', id), false);
 assert.equal(systemPackageInstalled('', id), false);
 const refusal = systemUpdateRefusal(id, true, false);
 assert.match(refusal, /system app on this device/);
 assert.match(refusal, /Phone and Messages roles/);
 assert.match(refusal, /--allow-system-update/);
 assert.match(refusal, /pm uninstall-system-updates ai\.alphacompute\.alphaphone/);
 assert.equal(systemUpdateRefusal(id, true, true), null);
 assert.equal(systemUpdateRefusal(id, false, false), null);
});
