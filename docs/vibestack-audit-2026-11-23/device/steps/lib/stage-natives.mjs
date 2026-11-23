// stage-natives.mjs <ALPHA_DIR> <signed.apk> <stage-output-dir> <launcher-descriptor.json>
//
// Runs the checkout's OWN Pixel native staging on a launcher overlay that
// vendor/eliza/packages/os/aosp/stage-launcher-overlay.ts has just written into <stage-output-dir>:
// the same two calls scripts/aosp-pixel10a.ts writePixel10aProduct makes (stageAndroidNative, then
// finalizeAndroidNative), without composePixel10aProduct and without the AOSP source contract.
// It verifies the APK's packaged runtime against this checkout's pin (alpha-source.json, node.lock.json),
// extracts lib/arm64-v8a/*.so into native-arm64/, and writes native-libraries.json, config.fs and the
// Soong Android.bp (prebuilt_priv_app_native modules, launcher under priv-app).
//
// UNTESTED: written from reading alpha vibestack 7c2338706. Run it from <ALPHA_DIR> as
//   node --conditions=eliza-source --import vibelang/register <this file> ...
// so the checkout's own module resolution applies.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [root, apk, output, descriptor] = process.argv.slice(2).map(value => path.resolve(value));
if (!root || !apk || !output || !descriptor) throw new Error('usage: stage-natives.mjs ALPHA_DIR APK OUTPUT DESCRIPTOR');
process.chdir(root);
const load = relative => import(pathToFileURL(path.join(root, relative)).href);
const {alphaNativeOptions} = await load('scripts/aosp-native-admission.ts');
const {stageAndroidNative, finalizeAndroidNative} = await load('scripts/os-ported/os/android-native-admission.mjs');

const launcher = JSON.parse(fs.readFileSync(descriptor, 'utf8'));
if (launcher.packageName !== 'ai.alphacompute.alphaphone') throw new Error(`descriptor names ${launcher.packageName}`);
if (!Array.isArray(launcher.privilegedPermissions)) throw new Error('descriptor must name privilegedPermissions: the launcher is a priv-app on this image');

const options = alphaNativeOptions({root, output, apk, moduleName: launcher.moduleName, launcher, target: 'stallion'});
const staged = stageAndroidNative(options);
const finalized = finalizeAndroidNative(options);
console.log(JSON.stringify({staged, finalized}, null, 2));
