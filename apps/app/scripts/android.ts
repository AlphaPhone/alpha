#!/usr/bin/env node
// spec/app/image/index.md, "Story: Stage Alpha into an image"; spec/agent/index.md, "Story: Build the pack only from the pinned eliza"
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { generateAndroidHost, stageRuntimePayload } from "@elizaos/os";
import { prepared } from "@repo/eliza-harness";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { androidPaths, identity, production, signInCallbackPath } from "../capacitor.config.ts";

export const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const android = join(app, androidPaths.project);
const artifacts = join(app, "artifacts");
const agentPack = join(root, "apps/agent");
const variant = "launcher";
const abis = ["arm64-v8a", "x86_64"] as const;
const voiceAssets = "assets/paradee-voice/v1/";
const mockSwitches = ["ELIZA_DEV_ALLOW_TEST_MOCKS", "VITE_ELIZA_DEV_ALLOW_TEST_MOCKS", "ALPHA_FAKES"];
const signingNames = ["ELIZAOS_KEYSTORE_PATH", "ELIZAOS_KEYSTORE_PASSWORD", "ELIZAOS_KEY_ALIAS", "ELIZAOS_KEY_PASSWORD"];
const usage = "Usage: node scripts/android.ts <inputs|pack|stage|web|host|build [--release]|verify|audit DIR>";

const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const record = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const writeJson = (file: string, value: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** The environment every build step runs in: never the test mocks, Java and the Android SDK found. */
export function environment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  for (const name of mockSwitches) delete env[name];
  env.ANDROID_HOME = base.ANDROID_HOME ?? base.ANDROID_SDK_ROOT ?? join(process.env.HOME ?? "", "Android/Sdk");
  env.JAVA_HOME = base.JAVA_HOME ?? "/usr/lib/jvm/java-21-openjdk";
  env.ANDROID_USER_HOME = join(android, ".android-user");
  return env;
}

function run(command: string, args: readonly string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const result = spawnSync(command, [...args], { cwd: options.cwd ?? app, env: options.env ?? environment(), stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
}

const platform = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);
const runEffect = <A>(program: Effect.Effect<A, unknown, unknown>): Promise<A> =>
  Effect.runPromise(Effect.provide(program, platform) as Effect.Effect<A, unknown, never>);

interface Problem { readonly input: string; readonly problem: string; readonly fix: string }

/** eliza.lock.json pins a commit of eliza's develop line, built and linked as `.eliza`, with no edit in its source. */
export function pinProblems(): Problem[] {
  const lock = record(readJson(join(root, "eliza.lock.json")));
  const commit = String(lock.commit ?? "");
  const problems: Problem[] = [];
  if (lock.branch !== "develop") problems.push({ input: "eliza.lock.json", problem: `branch is ${String(lock.branch)}, not develop`, fix: "Pin a reviewed commit of eliza develop" });
  let checkout: string;
  try {
    checkout = prepared().root;
  } catch (refused) {
    return [...problems, { input: ".eliza", problem: refused instanceof Error ? refused.message : String(refused), fix: "pnpm eliza" }];
  }
  const head = git(checkout, "rev-parse", "HEAD");
  if (head !== commit) problems.push({ input: ".eliza", problem: `the checkout is at ${head}, the lock pins ${commit}`, fix: "pnpm eliza" });
  if (git(checkout, "status", "--porcelain", "--untracked-files=no") !== "") problems.push({ input: ".eliza", problem: "the pinned checkout has edits", fix: "Never edit the pinned checkout; land the change upstream and repin" });
  try {
    git(checkout, "merge-base", "--is-ancestor", commit, "refs/remotes/origin/develop");
  } catch {
    problems.push({ input: "eliza.lock.json", problem: `${commit} is not on eliza's origin/develop in ${checkout}`, fix: `git -C ${checkout} fetch origin develop, then pin a commit it holds` });
  }
  return problems;
}

/** Everything the APK build needs before Gradle runs, with the command that supplies what is missing. */
export function inputProblems(env: NodeJS.ProcessEnv = environment()): Problem[] {
  const problems = pinProblems();
  const sdk = env.ANDROID_HOME ?? "";
  if (!existsSync(join(env.JAVA_HOME ?? "", "bin/java"))) problems.push({ input: "JDK 21", problem: `no java under JAVA_HOME ${env.JAVA_HOME}`, fix: "Set JAVA_HOME to a JDK 21" });
  for (const tool of ["build-tools/36.0.0/apksigner", "build-tools/36.0.0/aapt", "build-tools/36.0.0/zipalign", "platforms/android-36/android.jar"])
    if (!existsSync(join(sdk, tool))) problems.push({ input: "Android SDK", problem: `${tool} is missing under ${sdk}`, fix: "sdkmanager 'build-tools;36.0.0' 'platforms;android-36'" });
  if (!existsSync(join(sdk, "ndk/28.2.13676358/source.properties")) || !existsSync(join(sdk, "cmake/3.22.1/bin/cmake")))
    problems.push({ input: "Local speech toolchain", problem: "the pinned NDK or CMake is missing", fix: "sdkmanager 'ndk;28.2.13676358' 'cmake;3.22.1'" });
  if (env.ELIZA_INFERENCE_ENGINE_DIR && !existsSync(join(env.ELIZA_INFERENCE_ENGINE_DIR, "tools/omnivoice/CMakeLists.txt")))
    problems.push({ input: "Local speech engine", problem: "the supplied engine checkout does not exist", fix: "Unset ELIZA_INFERENCE_ENGINE_DIR or point it at the engine in .eliza/packages/os/android/local-inference/engine.lock.json" });
  const set = signingNames.filter((name) => (env[name] ?? "").trim() !== "");
  if (set.length > 0 && set.length < signingNames.length) problems.push({ input: "release signing", problem: `only ${set.join(", ")} are set`, fix: `Set all of ${signingNames.join(", ")} or none` });
  return problems;
}

function refuseOn(problems: readonly Problem[]) {
  if (problems.length === 0) return;
  for (const { input, problem, fix } of problems) console.error(`MISSING ${input}: ${problem}. Run: ${fix}`);
  process.exitCode = 2;
  throw new Error(`${problems.length} Android build input(s) missing`);
}

function voiceDirectory() {
  return join(android, ".cache", "voice", prepared().commit);
}

function voiceRecord(directory: string) {
  const at = prepared();
  const module = join(at.root, "packages/os/android/local-inference");
  const expectedEngine = record(record(readJson(join(module, "engine.lock.json"))).engine).commit;
  const receipt = record(readJson(join(directory, "build-record.json")));
  if (receipt.sourceCommit !== at.commit || receipt.nativeCommit !== expectedEngine || !Array.isArray(receipt.files)) {
    throw new Error("The local speech build receipt differs from the pinned Eliza source and engine");
  }
  return receipt.files.map(record);
}

function stageVoice(env: NodeJS.ProcessEnv) {
  const at = prepared();
  const module = join(at.root, "packages/os/android/local-inference");
  const engineLock = record(record(readJson(join(module, "engine.lock.json"))).engine);
  const expectedEngine = String(engineLock.commit);
  const engine = resolve(env.ELIZA_INFERENCE_ENGINE_DIR ?? join(android, ".cache", "voice-engine", expectedEngine));
  if (!env.ELIZA_INFERENCE_ENGINE_DIR && !existsSync(join(engine, "tools/omnivoice/CMakeLists.txt"))) {
    mkdirSync(engine, { recursive: true });
    run("git", ["init", "--quiet", engine], { env });
    run("git", ["fetch", "--no-tags", "--depth=1", String(engineLock.repository), expectedEngine], { cwd: engine, env });
    run("git", ["checkout", "--detach", expectedEngine], { cwd: engine, env });
  }
  if (git(engine, "rev-parse", "HEAD") !== expectedEngine || git(engine, "status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Local speech needs the clean engine revision recorded in Eliza's engine.lock.json");
  }
  const directory = voiceDirectory();
  if (!existsSync(join(directory, "build-record.json"))) {
    run(process.execPath, [
      join(module, "scripts/build-native.ts"), "--workspace", join(android, ".cache", "voice-work", expectedEngine), "--out", directory,
    ], { env: { ...env, ELIZA_INFERENCE_ENGINE_DIR: engine } });
  }
  voiceRecord(directory);
  return [
    "-PelizaSpeechBridgeCapacitor=true",
    `-PelizaInferenceEngineDir=${engine}`,
    `-PelizaParadeeNativeDir=${directory}`,
  ];
}

/** Alpha's agent pack (apps/agent), built from the pinned eliza for the production cloud. */
export function buildPack() {
  run(process.execPath, [join(root, "vibestack/spec.ts"), "tasks", "@repo/agent#build"], { cwd: root });
}

const packBundle = () => join(agentPack, "dist/bundle");
const packHost = () => join(agentPack, "dist/host");

/** The staged runtime payload: libeliza_node.so per ABI, agent.mjs, its manifest and inventory, for the bundle the pack built. */
export async function stageRuntime(): Promise<string> {
  const bundle = packBundle();
  const entry = join(bundle, "agent.mjs");
  if (!existsSync(entry) || !existsSync(join(bundle, "manifest.json"))) throw new Error("The agent pack is not built: node scripts/android.ts pack");
  const digest = sha256(readFileSync(entry)).slice(0, 16);
  const runtimes = join(android, "runtime");
  const output = join(runtimes, digest);
  if (!existsSync(join(output, "android/app/src/main/assets/agent/inventory.json"))) {
    rmSync(output, { recursive: true, force: true });
    await runEffect(stageRuntimePayload({ abi: [...abis], bundleDir: bundle, output }));
  }
  if (existsSync(runtimes)) for (const other of readdirSync(runtimes)) if (other !== digest) rmSync(join(runtimes, other), { recursive: true, force: true });
  const data = join(android, "agent");
  mkdirSync(data, { recursive: true });
  for (const file of ["host.json", "character.json", "policy.json"]) copyFileSync(join(packHost(), file), join(data, file));
  return output;
}

/** The page, built with the test mocks off, and the record that says so. */
export function buildWeb() {
  run(process.execPath, [join(root, "vibestack/spec.ts"), "tasks", "@repo/app#build"], { cwd: root });
  writeJson(join(app, androidPaths.web, "build-flags.json"), { testMocks: false });
}

const REQUIRED_POLICY = ["default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "object-src 'none'", "base-uri 'none'"];
const DEVELOPMENT_TEXT = ["10.0.2.2", "127.0.0.1:", "http://localhost:", "ALPHA_FAKES", "/test/fakes/", "api-staging.eliza.app", "cloud-staging.eliza.app", "staging.alphacompute.cc",
  "Maya Chen", "Ben Ortiz", "Harbour Cafe", "Harbour Gallery"];
const TEST_ONLY_PATH = /(?:^|\/)(?:fixtures?(?:[.-][^/]*)?\.(?:js|mjs|css|json)|[^/]+\.meta(?:[.-][^/]*)?\.js|[^/]+\.stories(?:[.-][^/]*)?\.js|storybook-static\/|mockServiceWorker\.js$)/i;
const ENGINE_PATH = /\.(?:onnx|ort|gguf|tflite|safetensors|pte)$|onnxruntime|ort-wasm|sherpa|k2fsa/i;
const TEXT_FILE = /\.(?:html?|js|mjs|cjs|css|json|txt|svg|xml|webmanifest)$/i;

function regularFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: "utf8" }).filter((name) => statSync(join(directory, name)).isFile()).map((name) => name.split("\\").join("/"));
}

/** What in a built page shows a mock, fixture or developer surface: the production bundle audit. */
export function auditBundle(directory: string): string[] {
  if (!existsSync(join(directory, "index.html"))) return [`${directory} holds no index.html`];
  const findings: string[] = [];
  const flags = existsSync(join(directory, "build-flags.json")) ? record(readJson(join(directory, "build-flags.json"))) : undefined;
  if (flags?.testMocks !== false) findings.push("build-flags.json does not record testMocks:false");
  const html = readFileSync(join(directory, "index.html"), "utf8");
  const policy = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html)?.[1]?.replaceAll("&#39;", "'");
  if (policy === undefined) findings.push("index.html carries no Content-Security-Policy");
  else {
    for (const directive of REQUIRED_POLICY) if (!policy.includes(directive)) findings.push(`the Content-Security-Policy lacks ${directive}`);
    if (policy.includes("'unsafe-eval'")) findings.push("the Content-Security-Policy allows 'unsafe-eval'");
  }
  for (const file of regularFiles(directory)) {
    if (file.endsWith(".map")) findings.push(`${file}: source map`);
    if (TEST_ONLY_PATH.test(file)) findings.push(`${file}: test-only module`);
    if (ENGINE_PATH.test(file)) findings.push(`${file}: on-device inference engine or model`);
    if (!TEXT_FILE.test(file)) continue;
    const text = readFileSync(join(directory, file), "utf8");
    for (const marker of DEVELOPMENT_TEXT) if (text.includes(marker)) findings.push(`${file}: ${marker}`);
  }
  return findings;
}

/** android/host.json with this checkout's identity, cloud and App Link host. */
export function hostProfile() {
  const profile = record(readJson(join(android, "host.json")));
  const placeholders = record(profile.manifestPlaceholders);
  const fields = Array.isArray(profile.buildConfigFields) ? profile.buildConfigFields : [];
  return {
    ...profile,
    manifestPlaceholders: { ...placeholders, appLinkHost: production.appLinkHost, signInCallbackPath },
    buildConfigFields: [...fields, { name: "CLOUD_API_ORIGIN", type: "String", value: production.cloud }],
  };
}

const MARKER = ".eliza-consumer-host.json";

/** Writes the Gradle host eliza's generator owns beside Alpha's authored sources in android/. */
export async function generateHost(runtime: string) {
  const marker = join(android, MARKER);
  if (!existsSync(marker)) writeJson(marker, { schema: 2, output: androidPaths.project, appId: identity.appId, files: [] });
  const version = String(record(readJson(join(app, "package.json"))).version);
  return runEffect(generateAndroidHost({
    consumerRoot: app,
    dependencyRoot: join(app, "node_modules"),
    output: android,
    identity: { appId: identity.appId, appName: identity.appName, version, versionCode: 1 },
    profile: hostProfile(),
    runtime,
  }));
}

interface BuildConsumer {
  buildAndroidConsumer(options: Record<string, unknown>): { files: readonly string[] };
}

const consumerModule: string = "@elizaos/os/android/build-consumer.mjs";

/** Both distributions of the launcher: the debug APK, its instrumentation APK and, with `release`, the unsigned release APK and its mapping. */
export async function build(release: boolean) {
  const env = environment();
  refuseOn(inputProblems(env));
  const voiceGradle = stageVoice(env);
  buildPack();
  const runtime = await stageRuntime();
  buildWeb();
  const findings = auditBundle(join(app, androidPaths.web));
  if (findings.length > 0) throw new Error(`The production bundle audit failed:\n${findings.join("\n")}`);
  const host = await generateHost(runtime);
  console.log(`Generated the ${host.appId} Android host (${host.files.length} files, Gradle ${host.toolchain})`);
  const { buildAndroidConsumer } = (await import(consumerModule)) as BuildConsumer;
  buildAndroidConsumer({
    root: app,
    environment: env,
    variants: [variant],
    release,
    lint: false,
    androidTest: true,
    daemon: false,
    project: androidPaths.project,
    output: "artifacts",
    androidTestOutput: "instrumentation",
    mappings: release,
    signing: { environment: signingNames },
    gradleArguments: voiceGradle,
    prepare: [{ command: join(app, "node_modules/.bin/cap"), args: ["copy", "android"] }],
    record: {
      name: "build-config.json",
      metadata: {
        createdAt: new Date().toISOString(), testMocks: false, release, applicationId: identity.appId, variant,
        cloud: production.cloud, versionOverride: { code: env.ELIZAOS_VERSION_CODE ?? null, name: env.ELIZAOS_VERSION_NAME ?? null },
        alphaCommit: git(root, "rev-parse", "HEAD"), elizaCommit: String(record(readJson(join(root, "eliza.lock.json"))).commit),
      },
    },
    verify: { command: process.execPath, args: [fileURLToPath(import.meta.url), "verify"] },
  });
  if (!release) for (const name of [`${variant}-release.apk`, `${variant}-release-unsigned.apk`, `mapping/${variant}-release-mapping.txt`]) rmSync(join(artifacts, name), { force: true });
  mkdirSync(join(artifacts, "sbom"), { recursive: true });
  rmSync(join(artifacts, "sbom/alpha.cdx.json"), { force: true });
  run(process.execPath, [join(app, "scripts/licences.ts"), "--sbom", join(artifacts, "sbom/alpha.cdx.json")], { env });
}

function buildTool(name: string, env: NodeJS.ProcessEnv): string {
  const tool = join(env.ANDROID_HOME ?? "", "build-tools/36.0.0", name);
  if (!existsSync(tool)) throw new Error(`Missing ${name}: install Android SDK build-tools;36.0.0`);
  return tool;
}

const INFERENCE_ENTRY = /\.(gguf|onnx|ort|tflite|safetensors|pte|task)$|(^|\/)lib[^/]*(llama|ggml|mtmd|onnxruntime|sherpa|whisper|piper|executorch|elizainference|omnivoice)[^/]*\.so|(^|\/)llama(-omnivoice)?-server$|^assets\/([^/]+\/)*models?\//i;
const REQUIRED_CLASSES = ["AlphaDevicePlugin", "AlphaCloudSpeechPlugin", "AlphaLocalSpeechPlugin", "AlphaBrowserPlugin", "AlphaCarrierSetupPlugin", "AlphaCallStatePlugin", "AlphaOngoingCallPlugin", "AlphaAgentService", "AlphaCalendarPlugin", "AlphaTelephonyPlugin", "AlphaResetPlugin", "AlphaActionJournalPlugin"]
  .map((name) => `Lai/alphacompute/alphaphone/${name};`);

interface Row {
  readonly mode: "debug" | "release";
  readonly variant: string;
  readonly flavor: string;
  readonly file: string;
  readonly name: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly signed: boolean;
  readonly signer: string | null;
  readonly debuggable: boolean;
  readonly versionCode: number;
  readonly versionName: string;
  readonly abis: readonly string[];
  readonly testMocks: false;
  readonly bundleAudit: "passed";
  readonly runtime: "PACKAGED";
  readonly distributable: boolean;
  readonly blockers: readonly string[];
}

/** One APK, checked: identity, version, payload, page audit and classes. Throws on the first broken rule. */
export function checkApk(file: string, mode: "debug" | "release", env: NodeJS.ProcessEnv = environment()): Row {
  const name = relative(artifacts, file);
  const bytes = readFileSync(file);
  const aapt = buildTool("aapt", env);
  const badging = execFileSync(aapt, ["dump", "badging", file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const packageLine = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/m.exec(badging);
  if (packageLine === null || packageLine[1] !== identity.appId) throw new Error(`${name} is not ${identity.appId}`);
  const versionCode = Number(packageLine[2]);
  const expected = env.ELIZAOS_VERSION_CODE;
  if (expected !== undefined && expected !== "" && versionCode !== Number(expected)) throw new Error(`${name} has versionCode ${versionCode}, not ELIZAOS_VERSION_CODE ${expected}`);
  const debuggable = badging.includes("application-debuggable");
  if (debuggable !== (mode === "debug")) throw new Error(`${name} is ${debuggable ? "" : "not "}debuggable`);
  const entries = execFileSync(aapt, ["list", file], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\n").filter((entry) => entry !== "");
  const abiList = entries.flatMap((entry) => /^lib\/([^/]+)\/libeliza_node\.so$/.exec(entry)?.slice(1) ?? []);
  const wantedAbis = mode === "release" ? ["arm64-v8a"] : [...abis];
  if (abiList.slice().sort().join() !== wantedAbis.slice().sort().join()) throw new Error(`${name} carries libeliza_node.so for ${abiList.join(", ") || "no ABI"}, not ${wantedAbis.join(", ")}`);
  const read = (entry: string, limit = 1024 * 1024 * 1024) => execFileSync("unzip", ["-p", file, entry], { maxBuffer: limit });
  const voiceFiles = new Set<string>();
  for (const row of voiceRecord(voiceDirectory())) {
    const source = String(row.path);
    const library = /^jniLibs\/([^/]+)\/libelizainference\.so$/.exec(source);
    if (library && !wantedAbis.includes(library[1] ?? "")) continue;
    if (!source.startsWith(voiceAssets) && library === null) continue;
    const path = library ? source.replace(/^jniLibs\//, "lib/") : source;
    if (path.split("/").some((part) => part === "" || part === "." || part === "..") || voiceFiles.has(path)) {
      throw new Error(`The local speech build receipt lists an invalid or duplicate path: ${path}`);
    }
    voiceFiles.add(path);
    if (!entries.includes(path) || sha256(read(path)) !== row.sha256) throw new Error(`${name}'s ${path} differs from its local speech receipt`);
  }
  if (!voiceFiles.has(`${voiceAssets}manifest.json`) || ![...voiceFiles].some((path) => path.startsWith(`${voiceAssets}asr/`) && path.endsWith(".gguf"))
      || ![...voiceFiles].some((path) => path.startsWith(`${voiceAssets}tts/`) && path.endsWith(".gguf"))
      || wantedAbis.some((abi) => !voiceFiles.has(`lib/${abi}/libelizainference.so`) || !entries.includes(`lib/${abi}/libparadeevoicejni.so`))) {
    throw new Error(`${name} lacks the packaged local speech engine or models`);
  }
  const unexpected = entries.filter((entry) => INFERENCE_ENTRY.test(entry) && !voiceFiles.has(entry));
  if (unexpected.length > 0) throw new Error(`${name} carries unrecorded inference files: ${unexpected.join(", ")}`);
  const inventory = record(JSON.parse(read("assets/agent/inventory.json").toString("utf8")));
  const listed = Array.isArray(inventory.files) ? inventory.files.map(record) : [];
  for (const required of ["assets/agent/agent.mjs", "assets/agent/manifest.json"]) if (!listed.some((row) => row.path === required)) throw new Error(`${name}'s inventory lists no ${required}`);
  for (const row of listed) {
    const path = String(row.path);
    if (path.startsWith("lib/") && !wantedAbis.some((abi) => path.startsWith(`lib/${abi}/`))) continue;
    if (!entries.includes(path)) throw new Error(`${name} lacks its inventoried ${path}`);
    if (sha256(read(path)) !== row.sha256) throw new Error(`${name}'s ${path} differs from its inventory`);
  }
  for (const data of ["host.json", "character.json", "policy.json"]) if (!entries.includes(`assets/agent/${data}`)) throw new Error(`${name} carries no agent ${data}`);
  const capacitor = record(JSON.parse(read("assets/capacitor.config.json").toString("utf8")));
  const signIn = record(record(capacitor.plugins).ElizaSignIn);
  if (signIn.testEnvironments !== false) throw new Error(`${name} registers test cloud environments`);
  const page = mkdtempSync(join(tmpdir(), "alpha-apk-page-"));
  try {
    execFileSync("unzip", ["-q", file, "assets/public/*", "-d", page]);
    const findings = auditBundle(join(page, "assets/public"));
    if (findings.length > 0) throw new Error(`${name}'s page fails the production bundle audit:\n${findings.join("\n")}`);
  } finally {
    rmSync(page, { recursive: true, force: true });
  }
  const classes = execFileSync(buildTool("dexdump", env), [file], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const missing = REQUIRED_CLASSES.filter((descriptor) => !classes.includes(`Class descriptor  : '${descriptor}'`));
  if (missing.length > 0) throw new Error(`${name} lacks ${missing.join(", ")}`);
  const signed = !name.endsWith("-unsigned.apk");
  const signer = signed ? /Signer #1 certificate SHA-256 digest: ([0-9a-f]{64})/.exec(execFileSync(buildTool("apksigner", env), ["verify", "--print-certs", file], { encoding: "utf8" }))?.[1] ?? null : null;
  if (signed && signer === null) throw new Error(`${name} has no verifiable signer`);
  const blockers = [...(mode === "debug" ? ["debug build"] : []), ...(signed ? [] : ["unsigned release"])];
  return {
    mode, variant, flavor: variant, file: name, name, sha256: sha256(bytes), bytes: bytes.byteLength, signed, signer, debuggable, versionCode, versionName: packageLine[3] ?? "",
    abis: abiList, testMocks: false, bundleAudit: "passed", runtime: "PACKAGED", distributable: mode === "release" && signed, blockers,
  };
}

/** Checks both APKs in artifacts/ and writes artifacts/apk-manifest.json: one debug and one release row of the launcher. */
export function verify(env: NodeJS.ProcessEnv = environment()) {
  const debug = join(artifacts, `${variant}-debug.apk`);
  const release = [`${variant}-release.apk`, `${variant}-release-unsigned.apk`].map((name) => join(artifacts, name)).filter((file) => existsSync(file));
  if (!existsSync(debug)) throw new Error(`artifacts/${variant}-debug.apk is missing`);
  if (release.length !== 1) throw new Error(`artifacts/ must hold exactly one ${variant} release APK, holds ${release.length}`);
  const results = [checkApk(debug, "debug", env), checkApk(release[0] ?? "", "release", env)];
  if (new Set(results.map((row) => row.versionCode)).size !== 1) throw new Error("The debug and release APKs have different version codes");
  const tests = join(artifacts, "instrumentation", `${variant}-androidTest.apk`);
  const manifest = {
    schema: 1, applicationId: identity.appId, variant, testMocks: false,
    version: { code: results[0]?.versionCode ?? 0, name: results[0]?.versionName ?? "" },
    instrumentation: existsSync(tests) ? { file: relative(artifacts, tests), sha256: sha256(readFileSync(tests)) } : null,
    results,
  };
  writeJson(join(artifacts, "apk-manifest.json"), manifest);
  for (const row of results) console.log(`${row.mode} ${row.file} versionCode ${row.versionCode} ${row.abis.join(",")} ${row.signed ? `signed ${row.signer}` : "unsigned"}, page audit passed, runtime packaged`);
  return manifest;
}

async function main(argv: readonly string[]) {
  const [command, ...rest] = argv;
  switch (command) {
    case "inputs": {
      const problems = inputProblems();
      for (const { input, problem, fix } of problems) console.log(`MISSING ${input}: ${problem}. Run: ${fix}`);
      if (problems.length === 0) console.log(`Every Android build input is present for eliza ${String(record(readJson(join(root, "eliza.lock.json"))).commit)}`);
      return problems.length === 0 ? 0 : 2;
    }
    case "pack":
      refuseOn(pinProblems());
      buildPack();
      return 0;
    case "stage":
      console.log(`Staged the agent runtime in ${relative(app, await stageRuntime())}`);
      return 0;
    case "web":
      buildWeb();
      return auditOutcome(join(app, androidPaths.web));
    case "audit":
      return auditOutcome(resolve(rest[0] ?? join(app, androidPaths.web)));
    case "host": {
      const host = await generateHost(await stageRuntime());
      console.log(`Generated the ${host.appId} Android host (${host.files.length} files, Gradle ${host.toolchain})`);
      return 0;
    }
    case "build":
      if (rest.some((arg) => arg !== "--release")) throw new Error(usage);
      await build(rest.includes("--release"));
      return 0;
    case "verify":
      verify();
      return 0;
    default:
      console.error(usage);
      return 2;
  }
}

function auditOutcome(directory: string) {
  const findings = auditBundle(directory);
  for (const finding of findings) console.error(`DENY ${finding}`);
  if (findings.length === 0) console.log(`PASS ${relative(app, directory) || "."}: no mock, fixture or developer surface`);
  return findings.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  try {
    process.exitCode = await main(process.argv.slice(2)) || process.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode ||= 1;
  }
}
