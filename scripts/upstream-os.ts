// Node entry points into the pinned upstream @elizaos/os and @elizaos/agent packages for Alpha's build tools.
// Their operations are Effect programs (VibeLang); each wrapper here runs one with the Node platform layer and
// returns a Promise. Scripts that import this module run as
//   node --conditions=eliza-source --import vibelang/register scripts/<tool>.ts
// so the workspace packages resolve to their VibeLang sources at the pin.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Effect} from 'effect';
import * as NodeServices from '@effect/platform-node/NodeServices';
import * as osBuild from '@elizaos/os';
import * as osImage from '@elizaos/os';
import {buildAgentBundle as upstreamBuildAgentBundle, readBundleManifest, residentLoadList} from '@elizaos/agent-host';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The upstream checkout the workspace links its @elizaos packages from. */
export const UPSTREAM = path.join(ROOT, 'vendor/eliza');
/** The upstream os package: Android native modules (android/<module>), AOSP sources (aosp/) and the build and image programs. */
export const OS_PACKAGE = path.join(UPSTREAM, 'packages/os');
/** The upstream os command line (stage-launcher, qualify-device, ota, keys, chromium). */
export const OS_CLI = path.join(OS_PACKAGE, 'src/cli.vibe');

type Program<A> = Effect.Effect<A, unknown, never> | Effect.Effect<A, unknown, unknown>;

/** Run one upstream Effect program with the Node platform services. */
export function run<A>(program: Program<A>): Promise<A> {
  return Effect.runPromise(Effect.provide(program as Effect.Effect<A, unknown, NodeServices.NodeServices>, NodeServices.layer) as Effect.Effect<A, unknown, never>);
}

/** Run the upstream os command line with the given arguments, inheriting output. */
export function osCli(args: readonly string[], options: {cwd?: string; env?: NodeJS.ProcessEnv} = {}) {
  execFileSync(process.execPath, ['--conditions=eliza-source', '--import', 'vibelang/register', OS_CLI, ...args], {cwd: options.cwd ?? ROOT, env: options.env ?? process.env, stdio: 'inherit'});
}

export const verifyCommittedWorkspace = (directory: string, commit: string, allowances?: Parameters<typeof osBuild.verifyCommittedWorkspace>[2]) =>
  run(osBuild.verifyCommittedWorkspace(directory, commit, allowances));
export const exportCommittedSources = (source: string, commit: string, into: string, paths: readonly string[]) =>
  run(osBuild.exportCommittedSources(source, commit, into, paths));
export const generateAndroidHost = (options: Parameters<typeof osBuild.generateAndroidHost>[0]) => run(osBuild.generateAndroidHost(options));
export const buildAndroid = (options: Parameters<typeof osBuild.buildAndroid>[0]) => run(osBuild.buildAndroid(options));
export const stageRuntimePayload = (options: Parameters<typeof osBuild.stageRuntimePayload>[0]) => run(osBuild.stageRuntimePayload(options));

export const resolveAndroidSdkRoot = () => run(osImage.resolveAndroidSdkRoot());
export const resolveJavaHome = () => run(osImage.resolveJavaHome());
export const javaMajorVersion = (javaHome: string) => run(osImage.javaMajorVersion(javaHome));
export const admitImageApk = (request: Parameters<typeof osImage.admitImageApk>[0]) => run(osImage.admitImageApk(request));
export const requireInstrumentationSuccess = (output: string, classes: readonly string[]) => run(osImage.requireInstrumentationSuccess(output, classes));
export const acquireDeviceLease = (deviceKey: string, options?: Parameters<typeof osImage.acquireDeviceLease>[1]) => run(osImage.acquireDeviceLease(deviceKey, options));
export const runIsolatedAndroidTest = (options: Parameters<typeof osImage.runIsolatedAndroidTest>[0]) => run(osImage.runIsolatedAndroidTest(options));
export const stageLauncher = (options: Parameters<typeof osImage.stageLauncher>[0]) => run(osImage.stageLauncher(options));
export const signRelease = (options: Parameters<typeof osImage.signRelease>[0]) => run(osImage.signRelease(options));
export const verifyImage = (options: Parameters<typeof osImage.verifyImage>[0]) => run(osImage.verifyImage(options));
export const writeImageCapability = (output: string, packageName: string) => run(osImage.writeImageCapability(output, packageName));
export const otaMain = (argv: readonly string[]) => run(osImage.otaMain(argv));
export const {aaptManifestTree, apkReleaseBlockers, apkUpdateAdmission, cloudVoiceAdmission, compareDomains, manifestFacts, parseXmlTree,
  readApkBuildFlags, readbackInventory, provisioningComponents, releaseDescriptorProblems, releaseRecordProblems, loadProfile,
  verifyDeviceSource, verifySource, assertStockVendorApi, readNativeLibraries, NATIVE_TARGETS, NATIVE_INSTALLS} = osImage;

/** Build the resident agent's mobile bundle from the pinned upstream source (@elizaos/agent/bundle). */
export const buildAgentBundle = (options: Parameters<typeof upstreamBuildAgentBundle>[0]) => upstreamBuildAgentBundle(options);
export {readBundleManifest, residentLoadList};
