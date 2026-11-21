// Where Alpha's always-on listener sources live and which classes stay shared. Alpha owns every
// listener component, its notifications, tile, consent screen and their glue (android/sense);
// the pure policy classes below are compiled from the pinned elizaOS source unchanged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '../../..');
export const alphaSense = path.join(root, 'android/sense/src/main/java/ai/alphacompute/alphaphone/sense');
export const alphaManifest = path.join(root, 'android/sense/src/main/AndroidManifest.xml');
export const vendorSenseModule = path.join(root, 'vendor/eliza/packages/app/platforms/android/sense');
export const vendorSense = path.join(vendorSenseModule, 'src/main/java/ai/eliza/sense');
export const systemuiChip = path.join(root, 'vendor/eliza/packages/os/android/sense/systemui/chip/source');
export const fixtures = import.meta.dirname;
export const androidJar = path.join(process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Android/Sdk'), 'platforms/android-36/android.jar');

/** Public, Android-free policy classes Alpha's listener imports from ai.eliza.sense. */
export const SHARED = ['ListenerPolicy', 'CrashLoopBreaker', 'SpeechGate', 'WakePhrase', 'IndicatorLease'];
/** Alpha's copies of the elizaOS listener classes (same simple names, Alpha's package). */
export const FORKED = ['AssistantInvocation', 'ConsentActivity', 'IndicatorLeaseProvider', 'Listener', 'ListenerActionContract',
  'ListenerActionReceiver', 'ListenerControlProvider', 'ListenerNotifications', 'ListenerStore', 'ListenerTileService',
  'ListeningEpoch', 'ListeningService', 'SenseApplication', 'SenseConfig'];

export const alphaSource = name => path.join(alphaSense, `${name}.java`);
export const vendorSource = name => path.join(vendorSense, `${name}.java`);
export const alphaSources = () => fs.readdirSync(alphaSense).filter(file => file.endsWith('.java')).sort().map(file => path.join(alphaSense, file));

/** The fields android/sense's consumer.gradle generates from android/aosp/pixel10a-composition.json. */
export function buildConfig() {
  const product = JSON.parse(fs.readFileSync(path.join(root, 'android/aosp/pixel10a-composition.json'), 'utf8'));
  const host = product.launcher.packageName, sense = product.sense;
  const label = sense.wakeLabel ?? sense.wakeNames[0][0].toUpperCase() + sense.wakeNames[0].slice(1);
  const fields = {APPLICATION_ID: `${host}.sense`, SENSE_HOST_PACKAGE: host, SENSE_ASSIST_ACTIVITY: sense.assistActivity,
    SENSE_APP_NAME: sense.appName, SENSE_WAKE_LABEL: label, SENSE_WAKE_NAMES: sense.wakeNames.join(','),
    SENSE_COMPONENT_PACKAGE: sense.componentPackage, SENSE_STORAGE_NAME: sense.storageName};
  return `package ai.eliza.sense; public final class BuildConfig { public static final String ${Object.entries(fields).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(', ')}; }`;
}

/** BuildConfig, R and (for an Android compile) the shared speech engine's surface, written into dir; returns their paths. */
export function writeStubs(dir, {speech = true} = {}) {
  const stubs = {
    'BuildConfig.java': buildConfig(),
    'R.java': 'package ai.eliza.sense; public final class R { public static final class drawable { public static final int ic_listening=1; }}',
    'NativeAsr.java': 'package ai.eliza.voice; public interface NativeAsr extends AutoCloseable { String transcribe(float[] samples); void cancel(); void close(); }',
    'VoiceAssets.java': 'package ai.eliza.voice; public final class VoiceAssets { public static VoiceAssets install(android.content.Context context){return null;} public NativeAsr openAsr(){return null;} }',
  };
  if (!speech) {delete stubs['NativeAsr.java']; delete stubs['VoiceAssets.java'];}
  return Object.entries(stubs).map(([name, text]) => {const file = path.join(dir, name); fs.writeFileSync(file, text); return file;});
}
