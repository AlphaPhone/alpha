/**
 * Fast iteration build: rebuild and reinstall the launcher debug APK from an already prepared
 * checkout, without the checks a distributable build runs.
 *
 *   bun run android:build:fast              web build, sync and :app:assembleLauncherDebug only
 *   bun run android:build:fast -- --restage also re-run the agent prepare/stage chain first
 *   bun run android:build:fast -- --install then `adb install -r` the APK
 *
 * It reuses what `bun run android:build:local` already prepared and staged (the resident runtime,
 * on-device voice and embedding outputs); without them it exits 2 and names that command. It
 * skips the input preflight, upstream verification, Android lint, the instrumentation APK, the
 * release APK, verify-apks, the licence notices and the SBOM, and keeps a Gradle daemon warm.
 *
 * The result is never distributable. It goes to artifacts/fast/, apart from the artifacts/ that
 * verify-apks, signing, archives and update manifests read, and its packaged
 * build-flags.json records `fastIteration: true`, which scripts/audit-production-bundle.ts
 * (and so verify-apks, archives and every release path behind them) refuses. The build is flag-off
 * like every APK build: ELIZA_DEV_ALLOW_TEST_MOCKS never reaches it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { androidIdentity } from "./android-identity.ts";
import { sha256File } from "./sha256.ts";

export const FAST_OUTPUT = "artifacts/fast";
export const FAST_APK = "launcher-debug.apk";
export const FAST_RECORD = "build-config.json";
/** The packaged web payload Gradle copies into the APK (scripts/android-gzip-assets.ts ANDROID_PUBLIC). */
const PACKAGED_FLAGS = "android/app/src/main/assets/public/build-flags.json";
/** What `bun run agent:stage-android` leaves behind; the same marker the SBOM uses (build-android.ts). */
export const STAGED_RUNTIME = "android/app/src/main/assets/agent/agent-bundle.js";
/** The prepare/stage chain of `android:build:local`, without its preflight and Gradle build. */
export const RESTAGE_SCRIPTS = Object.freeze([
  "agent:build-embedding-host", "agent:prepare", "agent:build-workflow-worker", "agent:stage-android", "licenses:packaged-runtime",
]);
const USAGE = "Usage: bun run android:build:fast [-- --restage] [-- --install]";

export function parseFastArgs(argv: readonly string[]) {
  const options = { restage: false, install: false, inspect: false };
  for (const arg of argv) {
    const key = ({ "--restage": "restage", "--install": "install", "--inspect": "inspect" } as const)[arg];
    if (!key || options[key]) throw new Error(`Unknown option ${arg}. ${USAGE}`);
    options[key] = true;
  }
  if (options.inspect && (options.restage || options.install)) throw new Error(`--inspect takes no other option. ${USAGE}`);
  return options;
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
        note: "bun run android:build:fast: a developer APK that skipped lint, tests and verify-apks. Never distribute it; build with bun run android:build:local.",
      },
    },
    verify: { command: "bun", args: ["scripts/build-android-fast.ts", "--inspect"] },
    archive: null,
  };
}

/** The `verify` step: confirm the marker reached the APK and record a non-distributable manifest. */
function inspect(root: string) {
  const apk = path.join(root, FAST_OUTPUT, FAST_APK);
  const flags = JSON.parse(execFileSync("unzip", ["-p", apk, "assets/public/build-flags.json"], { encoding: "utf8" }));
  if (flags.testMocks !== false) throw new Error(`${apk} packages testMocks=${flags.testMocks}`);
  if (flags.fastIteration !== true) throw new Error(`${apk} does not carry the fastIteration marker`);
  if (!execFileSync("unzip", ["-l", apk], { encoding: "utf8" }).includes("assets/agent/agent-bundle.js"))
    throw new Error(`${apk} does not package the staged resident runtime`);
  const row = { file: FAST_APK, variant: "launcher", mode: "debug", fastIteration: true, distributable: false, verified: false,
    sha256: sha256File(apk), bytes: fs.statSync(apk).size };
  fs.writeFileSync(path.join(root, FAST_OUTPUT, "apk-manifest.json"), `${JSON.stringify({ fastIteration: true, apks: [row] }, null, 2)}\n`);
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
  if (options.restage) for (const script of RESTAGE_SCRIPTS) run("bun", ["run", script]);
  if (!fs.existsSync(path.join(root, STAGED_RUNTIME))) {
    console.error(`No staged resident runtime (${STAGED_RUNTIME}). Run bun run android:build:local once, or bun run android:build:fast -- --restage.`);
    process.exit(2);
  }
  console.log(`Android fast build: launcher debug only, no lint/tests/verify-apks, NOT distributable -> ${FAST_OUTPUT}/`);
  run("bun", ["scripts/android-host.ts"]);
  run("bun", ["run", "android:sync"]);
  run("bun", ["scripts/android-host.ts"]);
  markFastIteration(path.join(root, PACKAGED_FLAGS));
  const { buildAndroidConsumer } = await import("../vendor/eliza/packages/app/scripts/mobile/android/build-consumer.mjs");
  (buildAndroidConsumer as unknown as (o: ReturnType<typeof fastBuildOptions>) => unknown)(fastBuildOptions(env, root));
  const apk = path.join(FAST_OUTPUT, FAST_APK);
  console.log(`Fast build done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${apk} (developer APK, not distributable)`);
  if (options.install) run(path.join(env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT ?? "", "platform-tools", "adb"), ["install", "-r", apk]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
