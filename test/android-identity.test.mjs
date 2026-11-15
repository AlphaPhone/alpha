// Generated source and host-JVM evidence only: no APK, Android install or carrier effect.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {androidIdentity, projectAndroidPackage, stageAndroidIdentity, RETAINED_ANDROID_APP_ID} from '../scripts/android-identity.ts';
import {jsonJar, jvmSkip, javaBinary} from './fixtures/jvm-tools.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.config.json'), 'utf8')).appId;
function fixture(t) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-installed-identity-'));
 t.after(() => fs.rmSync(root, {recursive: true, force: true}));
 fs.copyFileSync(path.join(ROOT, 'app.config.json'), path.join(root, 'app.config.json'));
 fs.mkdirSync(path.join(root, 'android'), {recursive: true});
 fs.copyFileSync(path.join(ROOT, 'android/consumer-host.json'), path.join(root, 'android/consumer-host.json'));
 fs.cpSync(path.join(ROOT, 'android/app'), path.join(root, 'android/app'), {recursive: true,
  filter: file => !path.relative(path.join(ROOT, 'android/app'), file).split(path.sep).some(part => ['build', 'assets', 'jniLibs'].includes(part))});
 return root;
}

test('canonical builds keep the public identity and do not create another source view', t => {
 const root = fixture(t);
 assert.equal(androidIdentity(root, '').appId, canonical);
 assert.equal(stageAndroidIdentity(root, androidIdentity(root, canonical)), null);
 assert.equal(fs.existsSync(path.join(root, '.eliza')), false);
 assert.throws(() => androidIdentity(root, 'example.unreviewed.app'), /not a supported installed identity/);
});

test('current consumer source retains package callbacks, sockets and credential formats without editing its inputs', t => {
 const root = fixture(t), identity = androidIdentity(root, RETAINED_ANDROID_APP_ID);
 assert.equal(identity.updateManifestUrl, 'https://github.com/eliza-research/alphaphone/releases/download/app-stable/alpha-update-stable.json');
 const view = stageAndroidIdentity(root, identity);
 const read = name => fs.readFileSync(path.join(view.root, 'android/app/src/main/java', RETAINED_ANDROID_APP_ID.replaceAll('.', '/'), name), 'utf8');
 assert.match(read('AlphaTelephony.java'), /"ai\.elizaresearch\.alphaphone\.SMS_SENT", "ai\.elizaresearch\.alphaphone\.SMS_DELIVERED"/);
 assert.match(read('AlphaTelephony.java'), /"sms-send-ledger:v1:device", "alpha-sms-sends\.journal", "alpha-sms-operation:v1:"/);
 assert.match(read('AlphaTelephony.java'), /"alphaphone-sms", "operationId", "partIndex"/);
 assert.match(read('AlphaCredentialStore.java'), /"connection-credentials"\),"alpha\.connection\.aes\.v1"/);
 assert.match(fs.readFileSync(path.join(root, 'android/app/src/main/java', canonical.replaceAll('.', '/'), 'AlphaTelephony.java'), 'utf8'), new RegExp(`package ${canonical.replaceAll('.', '\\.')};`));
 assert.equal(stageAndroidIdentity(root, identity).root, view.root);
 assert.equal(projectAndroidPackage(`${canonical}.MainActivity ${canonical}2 ${canonical}`, canonical, identity.appId), `${identity.appId}.MainActivity ${canonical}2 ${identity.appId}`);
 fs.appendFileSync(path.join(view.root, 'injected.java'), '// unreviewed');
 assert.throws(() => stageAndroidIdentity(root, identity), /file inventory changed/);
});

test('retained namespace compiles and runs the actual SMS receipt binding refusal checks', {skip: jvmSkip('json')}, t => {
 const root = fixture(t), view = stageAndroidIdentity(root, androidIdentity(root, RETAINED_ANDROID_APP_ID));
 const fixtureSource = path.join(root, 'SmsActionJournalResultTest.java');
 fs.writeFileSync(fixtureSource, projectAndroidPackage(fs.readFileSync(path.join(ROOT, 'test/fixtures/SmsActionJournalResultTest.java'), 'utf8'), canonical, RETAINED_ANDROID_APP_ID));
 const classes = path.join(root, 'classes');
 execFileSync(javaBinary('javac'), ['--release', '11', '-cp', jsonJar, '-d', classes,
  path.join(ROOT, 'vendor/eliza/plugins/plugin-native-messages/android/src/main/java/ai/eliza/plugins/messages/SmsSendJournal.java'),
  path.join(view.root, 'android/app/src/main/java', RETAINED_ANDROID_APP_ID.replaceAll('.', '/'), 'SmsActionJournalResult.java'), fixtureSource]);
 assert.match(execFileSync(javaBinary('java'), ['-cp', classes + path.delimiter + jsonJar, RETAINED_ANDROID_APP_ID + '.SmsActionJournalResultTest'], {encoding: 'utf8'}), /PASS exact SMS action journal/);
});
