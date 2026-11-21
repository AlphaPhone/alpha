// Alpha's always-on listener APK (android/sense): Alpha owns its consent screen, notifications,
// Quick Settings tile, components and their glue; the pure policy classes stay shared. Ported from
// the elizaOS sense tests (packages/app/test/android/sense.test.mjs and sense-fixtures) onto
// Alpha's copies. Host-JVM checks with stubs: not Android, image or device evidence.
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {javaBinary, jvmSkip} from './fixtures/jvm-tools.mjs';
import {FORKED, SHARED, alphaManifest, alphaSense, alphaSource, alphaSources, androidJar, fixtures, root, systemuiChip,
  vendorSense, vendorSenseModule, vendorSource, writeStubs} from './fixtures/sense-jvm/sources.mjs';

const read = file => fs.readFileSync(file, 'utf8');
const skip = jvmSkip('javac');
const androidSkip = skip || (fs.existsSync(androidJar) ? false : 'Android 36 platform required');
const files = dir => fs.readdirSync(dir, {recursive: true}).filter(name => name.endsWith('.java')).map(name => path.join(dir, name));

function compileAndRun(sources, mains, {android = false} = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-sense-'));
  try {
    const stubs = path.join(temp, 'stubs'), out = path.join(temp, 'out');
    fs.mkdirSync(stubs);
    const classpath = android ? ['-cp', androidJar] : [];
    execFileSync(javaBinary('javac'), ['--release', android ? '21' : '11', ...classpath, '-d', out, ...writeStubs(stubs, {speech: android}), ...sources],
      {timeout: scaledTimeout(60000)});
    return mains.map(main => execFileSync(javaBinary('java'), ['-cp', android ? `${out}${path.delimiter}${androidJar}` : out, main],
      {encoding: 'utf8', timeout: scaledTimeout(15000)}));
  } finally {fs.rmSync(temp, {recursive: true, force: true});}
}

test('every Alpha listener class compiles against Android 36 with only the shared policy classes', {skip: androidSkip}, () => {
  const [contract, labels] = compileAndRun([...alphaSources(), ...SHARED.map(vendorSource), path.join(systemuiChip, 'SenseListeningPolicy.java'),
    path.join(fixtures, 'ListenerActionContractTest.java'), path.join(fixtures, 'ListenerLabelsTest.java')],
  ['ai.alphacompute.alphaphone.sense.ListenerActionContractTest', 'ai.alphacompute.alphaphone.sense.ListenerLabelsTest'], {android: true});
  assert.match(contract, /^PASS Alpha listener pause contract with SystemUI$/m);
  assert.match(labels, /^PASS Alpha listener labels \(18 states\)$/m);
});

test('stop, resume and stale queued invocation (Alpha ListeningEpoch)', {skip}, () => {
  assert.match(compileAndRun([alphaSource('ListeningEpoch'), path.join(fixtures, 'ListeningEpochTest.java')],
    ['ai.alphacompute.alphaphone.sense.ListeningEpochTest'])[0], /PASS listener session authority/);
});

test('persistence failure and restart cannot revive stale consent (Alpha ListenerStore)', {skip}, () => {
  assert.match(compileAndRun([...files(path.join(fixtures, 'store')), ...['ListenerStore', 'ListeningEpoch', 'SenseConfig'].map(alphaSource),
    ...['ListenerPolicy', 'CrashLoopBreaker'].map(vendorSource)], ['ai.alphacompute.alphaphone.sense.ListenerStoreFailureTest'])[0],
  /PASS listener persistence failures and restart consent/);
});

test('exact Alpha listener foreground start and self-stop transitions settle refusal', {skip}, () => {
  const service = read(alphaSource('ListeningService'));
  const start = service.match(/@Override public int onStartCommand\(Intent intent,int flags,int startId\)\{[^\n]+\}/)?.[0];
  const from = service.indexOf(' private void applyUnderConsentLock(){'), to = service.indexOf('\n private void loadEngine(){', from);
  assert.ok(start && from >= 0 && to > from, 'exact lifecycle methods are present');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-sense-lifecycle-'));
  try {
    const file = path.join(temp, 'ListeningServiceLifecycleTest.java');
    fs.writeFileSync(file, read(path.join(fixtures, 'ListeningServiceLifecycleTest.java.txt'))
      .replace('/* ACTUAL_START */', start).replace('/* ACTUAL_APPLY */', service.slice(from, to)));
    assert.match(compileAndRun([file, vendorSource('ListenerPolicy')], ['ai.alphacompute.alphaphone.sense.ListeningServiceLifecycleTest'])[0],
      /^PASS exact listening service foreground lifecycle \(6 scenarios\)$/m);
  } finally {fs.rmSync(temp, {recursive: true, force: true});}
});

/** Java source with comments removed, string literals emptied and whitespace collapsed. */
function shape(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    if (text.startsWith('//', i)) {i = text.indexOf('\n', i); if (i < 0) break; continue;}
    if (text.startsWith('/*', i)) {i = text.indexOf('*/', i + 2) + 2; continue;}
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i++];
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
      i++; out += quote === '"' ? '""' : "''"; continue;
    }
    out += text[i++];
  }
  return out.replace(/^\s*(?:package|import)\s[^;]+;/gm, '').replace(/""(?:\s*\+\s*"")+/g, '""').replace(/\s+/g, ' ').trim();
}
/** Alpha's copy as the same shape: its own labels and final component classes are its only code changes. */
const alphaShape = text => shape(text.replace(/ListenerLabels\.label\(ListenerPolicy\.State\.OFF\)/g, '""')
  .replace(/ListenerLabels\.label\(/g, 'ListenerPolicy.label(').replace(/public final class /g, 'public class '));

test('Alpha’s listener copies behave exactly like the shared listener apart from wording', () => {
  assert.deepEqual(fs.readdirSync(alphaSense).filter(file => file.endsWith('.java')).map(file => file.slice(0, -5)).sort(),
    [...FORKED, 'ListenerLabels'].sort(), 'Alpha listener sources');
  for (const name of FORKED) {
    assert.equal(alphaShape(read(alphaSource(name))), shape(read(vendorSource(name))),
      `${name}: Alpha's copy changed code, not only wording. Port the pinned elizaOS change, or record the reviewed difference here.`);
  }
  // The pinned module contains nothing else: a new upstream class needs a decision before it ships.
  assert.deepEqual(fs.readdirSync(vendorSense).filter(file => file.endsWith('.java')).map(file => file.slice(0, -5)).sort(),
    [...FORKED, ...SHARED].sort(), 'pinned elizaOS listener classes');
});

test('Alpha’s listener imports only shared policy, BuildConfig and R from the shared package', () => {
  for (const file of alphaSources()) {
    const text = read(file).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const [, name] of text.matchAll(/^import ai\.eliza\.sense\.(\w+)/gm))
      assert.ok([...SHARED, 'BuildConfig', 'R'].includes(name), `${path.basename(file)} imports ai.eliza.sense.${name}`);
    assert.doesNotMatch(text.replace(/^import .*$/gm, ''), /ai\.eliza\.sense\./, `${path.basename(file)} names a shared listener class inline`);
    assert.doesNotMatch(text, /ListenerPolicy\.label\(/, `${path.basename(file)} shows the shared label`);
  }
});

test('notification, tile and action identities stay installed', () => {
  const notices = read(alphaSource('ListenerNotifications')), tile = read(alphaSource('ListenerTileService'));
  const receiver = read(alphaSource('ListenerActionReceiver')), contract = read(alphaSource('ListenerActionContract'));
  assert.match(notices, /CHANNEL_ACTIVE="listening-indicator",CHANNEL_STATUS="listener-status",CHANNEL_RETIRED="listening"/);
  assert.match(notices, /manager\.deleteNotificationChannel\(CHANNEL_RETIRED\)/);
  assert.match(notices, /ACTIVE_ID=1,STATUS_ID=2/);
  for (const [action, code] of [['RESUME', 3], ['PAUSE', 1], ['STOP', 2], ['DISMISSED', 4]])
    assert.match(notices, new RegExp(`ListenerActionReceiver\\.${action},${code}\\b`), `${action} request code ${code}`);
  assert.match(notices, /PendingIntent\.getActivity\(context,10,intent,PendingIntent\.FLAG_IMMUTABLE\|PendingIntent\.FLAG_UPDATE_CURRENT\)/);
  assert.match(notices, /PendingIntent\.getBroadcast\(context,code,intent,PendingIntent\.FLAG_IMMUTABLE\|PendingIntent\.FLAG_UPDATE_CURRENT\)/);
  assert.match(notices, /setAuthenticationRequired\(needsUnlock\)/);
  assert.match(notices, /"Resume",ListenerActionReceiver\.RESUME,3,ListenerPolicy\.resumeRequiresUnlock\(\)/);
  assert.match(tile, /PendingIntent\.getActivity\(this,20,settings,PendingIntent\.FLAG_IMMUTABLE\)/);
  assert.match(tile, /tile\.setLabel\("Listening"\)/);
  for (const action of ['PAUSE', 'RESUME', 'STOP', 'DISMISSED'])
    assert.match(receiver, new RegExp(`static final String ${action}=BuildConfig\\.APPLICATION_ID\\+"\\.action\\.${action}";`));
  assert.match(contract, /KEY=BuildConfig\.APPLICATION_ID\+"\.SYSTEMUI_ACTION_V1"/);
  const consent = read(alphaSource('ConsentActivity'));
  assert.match(consent, /PENDING_GENERATION="pendingConsentGeneration"/);
  assert.match(consent, /PENDING_PROCESS="pendingConsentProcess",DENIED_PERMISSION="deniedPermission"/);
  assert.match(consent, /new ListenerStore\(this\)\.grantConsent\(System\.currentTimeMillis\(\),generation\)/);
  assert.match(consent, /“"\+BuildConfig\.SENSE_WAKE_LABEL\+"”/, 'the consent text names the configured wake label');
  assert.match(consent, /People near you may be heard\./);
  assert.match(read(alphaSource('ListenerStore')), /FILE=BuildConfig\.SENSE_STORAGE_NAME/);
  assert.match(read(alphaSource('Listener')), /CONTROL_PERMISSION=BuildConfig\.APPLICATION_ID\+"\.permission\.LISTENER_CONTROL"/);
});

test('Alpha’s listener manifest keeps the network and capability boundaries and every bound identity', () => {
  const manifest = read(alphaManifest).replace(/<!--[\s\S]*?-->/g, '');
  const requested = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"(?![^>]*tools:node="remove")/g)].map(row => row[1]).sort();
  assert.deepEqual(requested, ['CAPTURE_AUDIO_HOTWORD', 'START_ACTIVITIES_FROM_BACKGROUND', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MICROPHONE',
    'RECORD_AUDIO', 'POST_NOTIFICATIONS', 'HIDE_OVERLAY_WINDOWS'].map(name => `android.permission.${name}`).sort());
  assert.match(manifest, /INTERNET" tools:node="remove"/);
  assert.match(manifest, /ACCESS_NETWORK_STATE" tools:node="remove"/);
  assert.match(manifest, /<permission android:name="\$\{applicationId\}\.permission\.LISTENER_CONTROL"\s+android:protectionLevel="signature"/);
  assert.match(manifest, /android:authorities="\$\{applicationId\}\.control"\s+android:permission="\$\{applicationId\}\.permission\.LISTENER_CONTROL"/);
  assert.match(manifest, /android:authorities="\$\{applicationId\}\.indicator"\s+android:permission="android\.permission\.STATUS_BAR_SERVICE"/);
  assert.match(manifest, /<meta-data android:name="ai\.eliza\.sense\.SETTINGS_ACTIVITY" android:value="\$\{senseComponentPackage\}\.ConsentActivity" \/>/);
  // The same elements, attributes and values as the pinned shared manifest; only labels are Alpha's to word.
  const elements = text => [...text.replace(/<!--[\s\S]*?-->/g, '').replace(/android:label="[^"]*"/g, 'android:label=""')
    .matchAll(/<[^!?][^>]*>/g)].map(([tag]) => tag.replace(/\s+/g, ' '));
  assert.deepEqual(elements(read(alphaManifest)), elements(read(path.join(vendorSenseModule, 'src/main/AndroidManifest.xml'))));
  assert.deepEqual(read(path.join(root, 'android/sense/src/main/res/drawable/ic_listening.xml')),
    read(path.join(vendorSenseModule, 'src/main/res/drawable/ic_listening.xml')));
  const service = read(alphaSource('ListeningService'));
  assert.match(service, /VoiceAssets.install\(this\).openAsr\(\)/);
  assert.doesNotMatch(service, /SpeechRecognizer|sherpa|onnx/i);
  assert.match(service, /active.cancel\(\)/);
  assert.match(service, /Listener.epoch.invalidate\(\)/);
  assert.match(service, /Arrays.fill\(samples,0f\)/);
  assert.match(service, /ListenerPolicy.mayInvokeAssistant\(keyguard==null\|\|keyguard.isKeyguardLocked\(\)\)/);
});
