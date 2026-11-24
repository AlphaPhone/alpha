/** Record build input identities without capturing file contents or private state. */
import fs from 'node:fs';
import path from 'node:path';
import {sha256, sha256File} from './sha256.ts';
import {verifyAndroidIdentity} from './android-identity.ts';
const roots=['apps/app/src','apps/app/spec','apps/app/public','apps/app/package.json','apps/app/vite.config.ts','cloud/src','cloud/deployment.json','cloud/generated','android/app/src/main/java','android/app/src/main/res','android/app/src/androidTest','android/app/manifests/main/AndroidManifest.xml','android/app/build.gradle','android/settings.gradle','capacitor.config.ts','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','app.config.json'];
// Record flavor manifests and build policy as well as renderer/bridge sources.
// Generated web assets and Gradle output remain outputs, not source inputs.
roots.push('android/app/src/launcher','android/app/src/release',
 // The Gradle host the pinned upstream generator writes from android/consumer-host.json.
 'android/consumer-host.json','android/app/product.gradle','scripts/android-host.ts','scripts/android-identity.ts',
 'android/app/cloud-deployment.generated.gradle','scripts/cloud-deployment-policy.ts','scripts/upstream-os.ts',
 'android/.eliza-consumer-profile.json','android/eliza-consumer-host',
 'vendor/eliza/packages/os/src/build','vendor/eliza/packages/os/android/host-templates',
 'android/build.gradle','android/gradle.properties',
 // Which dependency and plugin artifacts Gradle accepts (SHA-256); absent means unverified.
 'android/gradle/verification-metadata.xml',
 'android/gradle/wrapper/gradle-wrapper.properties','android/gradle/wrapper/gradle-wrapper.jar',
 'android/gradlew','android/gradlew.bat','android/app/proguard-rules.pro',
 'android/notification-fixture/build.gradle','android/notification-fixture/src',
 'scripts/build-android.ts','scripts/android-abis.ts','scripts/update-channel.ts','scripts/android-build-preflight.ts','scripts/toolchain.ts','scripts/verify-upstream.ts',
 'scripts/pinned-upstream-source.ts','scripts/upstream-pin.ts','scripts/sha256.ts','scripts/verify-apks.ts','scripts/verify-packaged-runtime.py','scripts/apk.ts','scripts/source-snapshot.ts');
// The on-device voice record and its staging/verification code are APK inputs. The staged voice
// outputs and their record are streamed into the freeze so large model files do not require large buffers.
roots.push('android/voice-host','android/embedding-host','android/paradee-voice','android/local-speech/build.gradle',
 '.eliza/native-inputs/receipt.json',
 'scripts/native-build-inputs.ts','scripts/build-embedding-host.ts',
 'scripts/embedding-native-contract.ts','scripts/embedding-build-remap.ts','scripts/copy-file-clone.ts',
 '.eliza/paradee-voice/native',
 'scripts/stage-embedding-host.ts','scripts/prepare-embedding-host.ts',
 'scripts/android-stage-voice-models.ts','scripts/voice-host.ts','scripts/paradee-runtime.ts');
// Resident payload and generated Java are consumed directly by Gradle. Capture
// their exact bytes, provenance and reproduction inputs, excluding web assets/dependencies.
roots.push('android/app/src/main/assets/agent','android/app/src/main/jniLibs',
 'android/app/build/generated/local-agent/java',
 'android/app/build/generated/local-agent/source-manifest.json',
 'upstream.lock.json',
 'scripts/build-agent-bundle.ts','scripts/stage-agent-runtime.ts','scripts/native-view-policy.ts','scripts/upstream-native-source.ts',
 'vendor/eliza/packages/agent-host/src/bundle','vendor/eliza/packages/os/src/build/runtime-payload.vibe',
 'vendor/eliza/packages/os/android/browser-surface/src/main/java/ai/eliza/plugins/browsersurface/ChromiumBrowserIdentity.java');
const files: string[]=[];
const profileFile = 'android/.eliza-consumer-profile.json';
if (fs.existsSync(profileFile)) {
 const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
 const asset = profile.assetFiles?.find((file: {name: string}) => file.name === 'android-identity.json');
 if (asset) {
  verifyAndroidIdentity(process.cwd());
  const directory = path.dirname(fs.realpathSync(asset.source));
  if (!directory.startsWith(path.resolve('.eliza/android-identity') + path.sep)) throw new Error('Android identity source is outside its generated directory');
  roots.push(path.relative(process.cwd(), directory));
 }
}
function walk(entry: string){if(!fs.existsSync(entry))return;const stat=fs.lstatSync(entry);if(stat.isDirectory())for(const name of fs.readdirSync(entry).sort())walk(path.join(entry,name));else if(stat.isFile())files.push(entry);}
roots.forEach(walk);
const hashes=Object.fromEntries(files.sort().map(file=>[file,sha256File(file)]));
const digest=sha256(JSON.stringify(hashes));
console.log(JSON.stringify({schemaVersion:5,digest,files:hashes},null,2));
