import {fixtureTest} from './support/fixture-build-context.mjs';
// bun run android:build:fast (scripts/build-android-fast.ts) with a stand-in for Gradle and its
// inspection step. These checks assemble no APK; they are not APK, emulator or device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildAndroidConsumer} from '../vendor/eliza/packages/app/scripts/mobile/android/build-consumer.mjs';
import {buildEnv} from '../scripts/build-android.ts';
import {FAST_OUTPUT, fastBuildOptions, markFastIteration, parseFastArgs} from '../scripts/build-android-fast.ts';
import {auditWebBundle, FAST_ITERATION_ERROR} from '../scripts/audit-production-bundle.ts';

const tmp = t => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-fast-build-'));
 t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
 return dir;
};

test('fast build options parse strictly', () => {
 assert.deepEqual(parseFastArgs([]), {restage: false, install: false, inspect: false});
 assert.deepEqual(parseFastArgs(['--restage', '--install']), {restage: true, install: true, inspect: false});
 for (const bad of [['--release'], ['--restage', '--restage'], ['--inspect', '--install']]) assert.throws(() => parseFastArgs(bad));
});

fixtureTest('a fast build assembles only the debug launcher with a warm daemon, no lint and no androidTest, into artifacts/fast', t => {
 const root = tmp(t);
 fs.copyFileSync(new URL('../app.config.json', import.meta.url), path.join(root, 'app.config.json'));
 const env = buildEnv({PATH: process.env.PATH, ELIZA_DEV_ALLOW_TEST_MOCKS: '1', VITE_ELIZA_DEV_ALLOW_TEST_MOCKS: '1'});
 const options = fastBuildOptions(env, root);
 const calls = [];
 const run = (command, args, opts) => {
  calls.push({command, args, env: opts.env});
  if (command === './gradlew') {
   const apk = path.join(root, 'android/app/build/outputs/apk/launcher/debug/app-launcher-debug.apk');
   fs.mkdirSync(path.dirname(apk), {recursive: true});
   fs.writeFileSync(apk, 'launcher:debug');
  } else fs.writeFileSync(path.join(root, FAST_OUTPUT, 'apk-manifest.json'), '{}');
 };
 buildAndroidConsumer({...options, run});
 const gradle = calls.filter(call => call.command === './gradlew');
 assert.equal(gradle.length, 1);
 assert.deepEqual(gradle[0].args, ['--daemon', ':app:assembleLauncherDebug']);
 assert.equal(gradle[0].env.ELIZA_DEV_ALLOW_TEST_MOCKS, undefined);
 assert.deepEqual(calls.filter(call => call.command === 'bun').map(call => call.args), [['scripts/build-android-fast.ts', '--inspect']]);
 const output = path.join(root, FAST_OUTPUT);
 assert.deepEqual(fs.readdirSync(output).sort(), ['apk-manifest.json', 'build-config.json', 'launcher-debug.apk']);
 const record = JSON.parse(fs.readFileSync(path.join(output, 'build-config.json'), 'utf8'));
 assert.equal(record.fastIteration, true);
 assert.equal(record.distributable, false);
 assert.equal(record.testMocks, false);
 assert.equal(record.release, false);
 // Nothing lands in artifacts/, which verify-apks, signing and release admission read.
 assert.deepEqual(fs.readdirSync(path.join(root, 'artifacts')), ['fast']);
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
