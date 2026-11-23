/**
 * Generate Alpha's Android build files with the upstream host generator (@elizaos/os/build generateAndroidHost).
 *
 *   node --conditions=eliza-source --import vibelang/register scripts/android-host.ts   write the generated host into android/
 *   node scripts/android-host.ts --check-identity                                       verify the projected identity only
 *
 * android/consumer-host.json (schema 2) is the only authored Gradle setup: identity comes from app.config.json;
 * os modules, consumer modules, dependencies, variants, signing and version environment names and admission come
 * from the descriptor. The generator at the pinned upstream commit owns the Gradle scripts, toolchain, wrapper
 * and variant policy; the generated files are build outputs (git-ignored), regenerated before every Android build.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {androidIdentity, readHostDescriptor, HOST_DESCRIPTOR, verifyAndroidIdentity} from './android-identity.ts';
export {readHostDescriptor, HOST_DESCRIPTOR};

const OWNER_ROUTE_ASSET = '.eliza/generated-android/owner-routes.json';
const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Product identity for the generator: package, label and version from app.config.json. */
export function hostIdentity(root = ROOT) {
 const {appId, appName, version, versionCode} = androidIdentity(root);
 return {appId, appName, version, versionCode};
}

/** The schema-2 profile with the app's orientation placeholder. */
export function hostProfile(root = ROOT) {
 const {profile} = readHostDescriptor(root);
 const app = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8')) as {orientation: string};
 return {...profile, manifestPlaceholders: {appOrientation: app.orientation}};
}

/**
 * The owner route table the native connection policy reads, staged outside the authored tree. The renderer's
 * platform area publishes it as apps/app/src/platform/owner-routes.json.
 */
export function stageOwnerRouteAsset(root = ROOT) {
 const source = path.join(root, 'apps/app/src/platform/owner-routes.json');
 if (!fs.existsSync(source)) throw new Error(`${path.relative(root, source)} is missing: the platform area publishes the owner route table`);
 JSON.parse(fs.readFileSync(source, 'utf8'));
 const file = path.join(root, OWNER_ROUTE_ASSET);
 fs.mkdirSync(path.dirname(file), {recursive: true});
 fs.copyFileSync(source, file);
 return file;
}

/** Every option the upstream generator receives for this checkout. */
export function hostOptions(root = ROOT, runtime?: string) {
 stageOwnerRouteAsset(root);
 return {
  consumerRoot: root,
  dependencyRoot: path.join(root, 'node_modules'),
  output: path.join(root, 'android'),
  identity: hostIdentity(root),
  profile: hostProfile(root),
  ...(runtime ? {runtime} : {}),
 };
}

/** The upstream generator's ownership marker; it lists the files the last generation wrote (git-ignored). */
export const HOST_MARKER = 'android/.eliza-consumer-host.json';

/**
 * android/ also holds Alpha's authored sources, so before the first generation in a checkout Alpha claims it for the
 * generator with an empty file list. The generator still refuses to write over any file it did not write itself
 * (vendor/eliza packages/os/src/build/android-host.vibe claimOutput), so an authored or stale file is never replaced.
 */
export function claimHostOutput(root = ROOT) {
 const marker = path.join(root, HOST_MARKER);
 if (fs.existsSync(marker)) return false;
 const {appId} = hostIdentity(root);
 fs.writeFileSync(marker, `${JSON.stringify({schema: 2, output: 'android', appId, files: []}, null, 2)}\n`);
 return true;
}

/** Write the generated host into android/. */
export async function generateAlphaAndroidHost(root = ROOT, runtime?: string) {
 const {generateAndroidHost} = await import('./upstream-os.ts');
 claimHostOutput(root);
 return generateAndroidHost(hostOptions(root, runtime));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 if (process.argv.length === 3 && process.argv[2] === '--check-identity') {
  console.log(`Verified the ${verifyAndroidIdentity()} Android identity`);
 } else if (process.argv.length > 2) {
  console.error('Usage: node --conditions=eliza-source --import vibelang/register scripts/android-host.ts [--check-identity]');
  process.exit(2);
 } else {
  const result = await generateAlphaAndroidHost();
  console.log(`Generated the ${result.appId} Android host (${result.files.length} files, Gradle ${result.toolchain}) in ${path.relative(process.cwd(), result.directory) || '.'}`);
 }
}
