/**
 * Fast iteration build: rebuild and reinstall the launcher debug APK from an already prepared
 * checkout, without the checks a distributable build runs.
 *
 *   pnpm android:build:fast              web build, sync and :app:assembleLauncherDebug only
 *   pnpm android:build:fast -- --restage also re-run the agent prepare/stage chain first
 *   pnpm android:build:fast -- --install then `adb install -r` the APK (refused over the image's
 *                                           system app unless --allow-system-update is also given)
 *
 * It reuses what `pnpm android:build:local` already prepared and staged (the resident runtime,
 * on-device voice and embedding outputs); without them it exits 2 and names that command. It
 * skips the input preflight, upstream verification, Android lint, the instrumentation APK, the
 * release APK, verify-apks, the licence notices and the SBOM, and keeps a Gradle daemon warm.
 *
 * The result is never distributable. It goes to artifacts/fast/, apart from the top-level
 * artifacts/ files that verify-apks, signing, archives and update manifests read, and its packaged
 * build-flags.json records `fastIteration: true`, which scripts/audit-production-bundle.ts
 * (and so verify-apks, archives and every release path behind them) refuses. The build is flag-off
 * like every APK build: ELIZA_DEV_ALLOW_TEST_MOCKS never reaches it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { androidIdentity } from "./android-identity.ts";
import { ANDROID_PUBLIC } from "./android-gzip-assets.ts";
import { sha256File } from "./sha256.ts";

export const FAST_OUTPUT = "artifacts/fast";
export const FAST_APK = "launcher-debug.apk";
export const FAST_RECORD = "build-config.json";
/** The synced web payload's flags, which Gradle packages as assets/public/build-flags.json. */
export const PACKAGED_FLAGS = path.posix.join(ANDROID_PUBLIC, "build-flags.json");
/** Where PACKAGED_FLAGS and the staged runtime land inside the APK. */
export const APK_FLAGS_ENTRY = "assets/public/build-flags.json";
export const APK_RUNTIME_ENTRY = "assets/agent/agent-bundle.js";
/** What `pnpm agent:stage-android` leaves behind; the same marker the SBOM uses (build-android.ts). */
export const STAGED_RUNTIME = "android/app/src/main/assets/agent/agent-bundle.js";
/** The prepare/stage chain of `android:build:local`, without its preflight and Gradle build. */
export const RESTAGE_SCRIPTS = Object.freeze([
  "agent:build-embedding-host", "agent:bundle", "agent:stage-android", "licenses:packaged-runtime",
]);
const USAGE = "Usage: pnpm android:build:fast [-- --restage] [-- --install [--allow-system-update]]";

export function parseFastArgs(argv: readonly string[]) {
  const options = { restage: false, install: false, inspect: false, allowSystemUpdate: false };
  for (const arg of argv) {
    const key = ({ "--restage": "restage", "--install": "install", "--inspect": "inspect", "--allow-system-update": "allowSystemUpdate" } as const)[arg];
    if (!key || options[key]) throw new Error(`Unknown option ${arg}. ${USAGE}`);
    options[key] = true;
  }
  if (options.inspect && (options.restage || options.install || options.allowSystemUpdate)) throw new Error(`--inspect takes no other option. ${USAGE}`);
  if (options.allowSystemUpdate && !options.install) throw new Error(`--allow-system-update only applies with --install. ${USAGE}`);
  return options;
}

/** True when `pm list packages -s <appId>` output names exactly this package (a system app, updated or not). */
export function systemPackageInstalled(pmSystemList: string, appId: string) {
  return pmSystemList.split(/\r?\n/).some(line => line.trim() === `package:${appId}`);
}

/**
 * On an Alpha image the launcher is the image's privileged system app. A debuggable update over it
 * fails the image capability check, so Android drops Alpha's Phone and Messages roles and the update
 * outranks the image's app. --install refuses that unless the developer asks for it explicitly.
 */
export function systemUpdateRefusal(appId: string, isSystemApp: boolean, allowSystemUpdate: boolean): string | null {
  if (!isSystemApp || allowSystemUpdate) return null;
  return `${appId} is a system app on this device (the Alpha image's priv-app). Installing this debuggable developer APK over it `
    + `fails the image check and drops Alpha's Phone and Messages roles. Build and flash an image instead, or pass `
    + `--allow-system-update to replace it anyway (undo with: adb shell pm uninstall-system-updates ${appId}).`;
}

/** Mark the synced web payload as a fast iteration build, so no production audit admits the APK. */
export function markFastIteration(file: string) {
  const flags = JSON.parse(fs.readFileSync(file, "utf8"));
  if (flags?.testMocks !== false) throw new Error(`${file} records testMocks=${flags?.testMocks}; the APK packages only a flag-off bundle`);
  fs.writeFileSync(file, `${JSON.stringify({ ...flags, fastIteration: true })}\n`);
}

/**
 * What upstream's consumer build receives: debug launcher only, no lint, no androidTest APK, no
 * release or mapping, a warm daemon and a light inspection in place of verify-apks.
 */
export function fastBuildOptions(env: NodeJS.ProcessEnv, root: string) {
  return {
    root,
    environment: env,
    variants: ["launcher"],
    project: "android",
    output: FAST_OUTPUT,
    release: false,
    lint: false,
    androidTest: false,
    daemon: true,
    mappings: false,
    record: {
      name: FAST_RECORD,
      metadata: {
        createdAt: new Date().toISOString(),
        fastIteration: true,
        distributable: false,
        testMocks: false,
        release: false,
        lint: false,
        androidTest: false,
        verified: false,
        applicationId: androidIdentity(root, env.ALPHA_ANDROID_APPLICATION_ID || "").appId,
        note: "pnpm android:build:fast: a developer APK that skipped lint, tests and verify-apks. Never distribute it; build with pnpm android:build:local.",
      },
    },
    verify: { command: process.execPath, args: ["--conditions=eliza-source", "--import", "vibelang/register", "scripts/build-android-fast.ts", "--inspect"] },
    archive: null,
  };
}

/** The `verify` step: confirm the marker reached the APK and record a non-distributable manifest. */
export function inspect(root: string) {
  const apk = path.join(root, FAST_OUTPUT, FAST_APK);
  const flags = JSON.parse(execFileSync("unzip", ["-p", apk, APK_FLAGS_ENTRY], { encoding: "utf8" }));
  if (flags.testMocks !== false) throw new Error(`${apk} packages testMocks=${flags.testMocks}`);
  if (flags.fastIteration !== true) throw new Error(`${apk} does not carry the fastIteration marker`);
  // Exact entry names (`unzip -Z1`), so e.g. agent-bundle.js.map alone does not pass for the runtime.
  if (!execFileSync("unzip", ["-Z1", apk], { encoding: "utf8" }).split(/\r?\n/).includes(APK_RUNTIME_ENTRY))
    throw new Error(`${apk} does not package the staged resident runtime`);
  const row = { file: FAST_APK, variant: "launcher", mode: "debug", fastIteration: true, distributable: false, verified: false,
    sha256: sha256File(apk), bytes: fs.statSync(apk).size };
  fs.writeFileSync(path.join(root, FAST_OUTPUT, "apk-manifest.json"), `${JSON.stringify({ fastIteration: true, apks: [row] }, null, 2)}\n`);
}

/**
 * Sync the web payload into the Android project, mark it, then build. `android:sync` recopies
 * build-flags.json, so the marker has to follow the last sync and precede Gradle.
 */
export function syncMarkAndBuild(root: string, run: (cmd: string, args: string[]) => unknown, build: () => unknown) {
  run(process.execPath, ["--conditions=eliza-source", "--import", "vibelang/register", "scripts/android-host.ts"]);
  run("pnpm", ["android:sync"]);
  run(process.execPath, ["--conditions=eliza-source", "--import", "vibelang/register", "scripts/android-host.ts"]);
  markFastIteration(path.join(root, PACKAGED_FLAGS));
  return build();
}

async function main() {
  const options = parseFastArgs(process.argv.slice(2));
  const root = fs.realpathSync(path.resolve(import.meta.dirname, ".."));
  if (options.inspect) return inspect(root);
  const started = Date.now();
  const { buildEnv } = await import("./build-android.ts");
  const { androidEnv } = await import("./toolchain.ts");
  const env = buildEnv(androidEnv());
  const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: "inherit", env, cwd: root });
  // androidEnv() resolved the SDK even when ANDROID_HOME is unset, the same adb the other device scripts use.
  const adb = path.join(env.ANDROID_HOME!, "platform-tools", "adb");
  if (options.install) {
    // Checked before building, so a refusal costs nothing.
    const appId = androidIdentity(root, env.ALPHA_ANDROID_APPLICATION_ID || "").appId;
    const systemList = execFileSync(adb, ["shell", "pm", "list", "packages", "-s", appId], { encoding: "utf8", env });
    const refusal = systemUpdateRefusal(appId, systemPackageInstalled(systemList, appId), options.allowSystemUpdate);
    if (refusal) { console.error(refusal); process.exit(2); }
  }
  if (options.restage) for (const script of RESTAGE_SCRIPTS) run("pnpm", [script]);
  if (!fs.existsSync(path.join(root, STAGED_RUNTIME))) {
    console.error(`No staged resident runtime (${STAGED_RUNTIME}). Run pnpm android:build:local once, or pnpm android:build:fast -- --restage.`);
    process.exit(2);
  }
  console.log(`Android fast build: launcher debug only, no lint/tests/verify-apks, NOT distributable -> ${FAST_OUTPUT}/`);
  const { buildAndroidConsumer } = await import("../vendor/eliza/packages/os/android/build-consumer.mjs");
  syncMarkAndBuild(root, run, () => (buildAndroidConsumer as unknown as (o: ReturnType<typeof fastBuildOptions>) => unknown)(fastBuildOptions(env, root)));
  const apk = path.join(FAST_OUTPUT, FAST_APK);
  console.log(`Fast build done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${apk} (developer APK, not distributable)`);
  if (options.install) run(adb, ["install", "-r", apk]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
