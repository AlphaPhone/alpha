#!/usr/bin/env node
// spec/app/image/index.md, "Story: Stage Alpha into an image"; spec/app/image/index.md, "Story: Keep the phone and messages on Alpha's phone"; spec/app/image/index.md, "Story: Let a handed-over phone update its launcher on its own"; spec/app/image/index.md, "Story: Update an Alpha Pixel by cable, and get back"; spec/app/image/index.md, "Story: Sign Alpha's releases with one key"; spec/release/os.md, "Story: Enrol the image's updater"; spec/release/os.md, "Story: Update an image by hand"; spec/release/os.md, "Story: Recover an image"; spec/release/os.md, "Story: Run the drills"; spec/release/os.md, "Enrolment is staged only with exactly the pinned profile, and staged disabled"; spec/release/os.md, "A drill's result is recorded by the release owner only once that drill has been run, and a failed drill takes back physical recovery and turns the updater off"
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aaptManifestTree, composeProduct, createDevelopmentLauncherDescriptor, decrypt, enrollUpdater, generate, otaMain, parseArgs, provisioningComponents,
  requireClockProduct, signRelease, signReleaseRequest, stageLauncher, stageListener, validateDescriptor, verifyDeviceSource, verifyImage, verifySecureCameraSource,
  verifySource, writeImageCapability, writeImageProvisioningOverlay, writeReleaseRecord, writeRoleOverrides, writeSecureCameraOverlay,
} from "@elizaos/os";
import { Data, Effect } from "effect";
import {
  alphaChannel, alphaPrivileged, channelIsAlphas, firstBootGrants, grantsAdmitted, imageTelephony, listenerImage, privilegedAdmitted, provisionsHome, readsChannel,
  readsSourceLock, signerRecordAdmitted, stageProblems, type OtaCommand, type Patch, type Stage, type Target,
} from "../gen/app__image.ts";
import * as Os from "../gen/release__os.ts";
import { ReleaseRefused, dispatch, ledger, runCli } from "./release.ts";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A path of this package, or of eliza's os package when it starts with `@elizaos/os/`. */
export const place = (relative: string) => relative.startsWith("@elizaos/os/") ? fileURLToPath(import.meta.resolve(relative)) : join(app, relative);
const sha256File = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const json = (relative: string): unknown => JSON.parse(readFileSync(place(relative), "utf8"));

export class UsageError extends Data.TaggedError("UsageError")<{ readonly message: string }> {}
export class StageRefused extends Data.TaggedError("StageRefused")<{ readonly problems: readonly string[]; readonly message: string }> {}
export class InputUnreadable extends Data.TaggedError("InputUnreadable")<{ readonly message: string }> {}

/** Reads and checks done before any tool runs, as the failure they are. */
const attempt = <A>(read: () => A) => Effect.try({
  try: read,
  catch: (cause) => cause instanceof UsageError || cause instanceof StageRefused || cause instanceof ReleaseRefused ? cause : new InputUnreadable({ message: cause instanceof Error ? cause.message : String(cause) }),
});

const PRODUCTS: Readonly<Record<Target, string>> = { Cuttlefish: "aosp/cuttlefish.json", Pixel10a: "aosp/pixel10a.json" };
const RELEASE = "aosp/pixel10a-release.json";
const CHANNEL = "aosp/pixel10a-ota-channel.json";
const KEY_MANIFEST = "aosp/signing/alpha-key-manifest.json";
const ENROLLMENT = "aosp/pilot-system-update-enrollment.json";
const RELEASE_SIGNER = "aosp/signing/release-signer.json";
const CAPABILITY_VALUES = "android/app/src/main/res/values/aosp-capabilities.xml";
const STOCK_SOURCE_LOCK = "@elizaos/os/aosp/sources/pixel10a-stallion.json";
const SHARED_SOURCE_LOCK = "@elizaos/os/aosp/aosp.lock.json";
const LISTENER_CERTIFICATE = "aosp/signing/public/alphaphone_app.x509.pem";
const IMAGE_PROVISIONING = { module: "AlphaImageCapabilityOverlay", overlayable: "AlphaImageProvisioning", resource: "alpha_aosp_image_capability" };
const SENSE = { moduleName: "AlphaSense", componentPackage: "ai.alphacompute.alphaphone.sense", wakeNames: ["alpha"] };
const NATIVE_ABI: Readonly<Record<Target, "x86_64" | "arm64-v8a">> = { Cuttlefish: "x86_64", Pixel10a: "arm64-v8a" };
const PLACEHOLDER = /^(unset|todo|tbd)$|placeholder/i;

const PATCHES: Readonly<Record<string, { readonly patch: Patch; readonly manifest: string; readonly file: string }>> = {
  "chip": { patch: "Chip", manifest: "@elizaos/os/aosp/sense/systemui/chip/manifest.json", file: "@elizaos/os/aosp/sense/systemui/chip/listening-chip.patch" },
  "ops": { patch: "Ops", manifest: "@elizaos/os/aosp/sense/systemui/manifest.json", file: "@elizaos/os/aosp/sense/systemui/microphone-ops.patch" },
  "assist": { patch: "Assist", manifest: "@elizaos/os/aosp/sense/systemui/assist/manifest.json", file: "@elizaos/os/aosp/sense/systemui/assist/assist-identity.patch" },
  "protected-power": { patch: "ProtectedPower", manifest: "aosp/branding/power-voice/manifest.json", file: "aosp/branding/power-voice/alpha-protected-power-voice.patch" },
  "soong-memory": { patch: "SoongMemory", manifest: "aosp/build-host/manifest.json", file: "aosp/build-host/soong-memory.patch" },
  "sense-policy": { patch: "SensePolicy", manifest: "aosp/branding/sense-policy/manifest.json", file: "aosp/branding/sense-policy/alpha-sense-policy.patch" },
};
const SOONG_APP_NATIVE = { manifest: "@elizaos/os/aosp/patches/soong-app-native/manifest.json", file: "@elizaos/os/aosp/patches/soong-app-native/soong-app-native.patch" };

const OTA_COMMANDS: Readonly<Record<string, OtaCommand>> = {
  "check": "Check", "apply": "Apply", "status": "Status", "fallback": "Fallback", "stock-archive": "StockArchive", "verify-stock": "VerifyStock", "retain-known-good": "RetainKnownGood",
};

const USAGE = [
  "pnpm aosp stage --target cuttlefish|pixel10a --apk FILE --aosp-source DIR --output NEW_DIR [--development [--owner-telephony]] [--descriptor FILE] [--factory-image FILE (pixel10a)] [--listener-apk FILE --listener-descriptor FILE [--listener-qualification FILE]] [--patch chip|ops|assist|protected-power|soong-memory|sense-policy ...] [--aapt PATH] [--apksigner PATH]",
  "pnpm aosp ota check|apply|status|fallback|stock-archive|verify-stock|retain-known-good [eliza's operator options]",
  "pnpm aosp verify --target pixel10a|cuttlefish --serial SERIAL --user N --expected FILE [--adb PATH] [--out NEW_FILE]",
  "pnpm aosp sign --request FILE [--dry-run]",
  "pnpm aosp record --request FILE",
  "pnpm aosp keys generate --output NEW_DIR --passphrase-file FILE [--organization NAME] [--only a,b] | keys decrypt --input DIR --output NEW_DIR --passphrase-file FILE [--only a,b]",
  "pnpm aosp enroll --checkout DIR --certificate PEM --product-makefile-sha256 HEX --receipt NEW_FILE [--execute]",
  "pnpm aosp os --ledger FILE stage | pass --gate GATE | enable | check --from RECORD|stock --to RECORD | start | interrupt | resume | finish | retain-known-good | fallback --to stock --image FILE | fallback --to known-good | drill --drill DRILL --passed|--failed",
].join("\n");

interface Flags {
  readonly values: Readonly<Record<string, string>>;
  readonly switches: ReadonlySet<string>;
  readonly repeated: Readonly<Record<string, readonly string[]>>;
}

function flags(argv: readonly string[], spec: { readonly valued: readonly string[]; readonly switches?: readonly string[]; readonly repeated?: readonly string[] }): Flags {
  const values: Record<string, string> = {};
  const switches = new Set<string>();
  const repeated: Record<string, string[]> = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index] ?? "";
    const name = argument.startsWith("--") ? argument.slice(2) : "";
    if (spec.switches?.includes(name)) {
      if (switches.has(name)) throw new UsageError({ message: `${argument} is given twice` });
      switches.add(name);
      continue;
    }
    const value = argv[index + 1];
    if (!spec.valued.includes(name) && !spec.repeated?.includes(name)) throw new UsageError({ message: `unknown argument ${argument}` });
    if (value === undefined || value === "" || value.startsWith("--")) throw new UsageError({ message: `${argument} needs a value` });
    index++;
    if (spec.repeated?.includes(name)) repeated[name] = [...(repeated[name] ?? []), value];
    else if (Object.hasOwn(values, name)) throw new UsageError({ message: `${argument} is given twice` });
    else values[name] = value;
  }
  return { values, switches, repeated };
}

function required(found: Flags, ...names: string[]): string[] {
  const missing = names.filter((name) => found.values[name] === undefined);
  if (missing.length) throw new UsageError({ message: `${missing.map((name) => `--${name}`).join(", ")} required` });
  return names.map((name) => found.values[name] ?? "");
}

function placeholders(value: unknown): number {
  if (typeof value === "string") return PLACEHOLDER.test(value.trim()) ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((total: number, item: unknown) => total + placeholders(item), 0);
  if (typeof value === "object" && value !== null) return Object.entries(value).reduce((total, [key, item]) => total + (key === "description" ? 0 : placeholders(item)), 0);
  return 0;
}

/** Whether the target's product, with Pixel's release descriptor, has no field unset. */
const productComplete = (target: Target) =>
  (target === "Pixel10a" ? [PRODUCTS.Pixel10a, RELEASE] : [PRODUCTS.Cuttlefish]).every((relative) => placeholders(json(relative)) === 0);

const patchReference = (name: string, manifest: string, file: string) =>
  ({ name, manifestFile: place(manifest), manifestSha256: sha256File(place(manifest)), patchFile: place(file) });

/** The stage a command line asks for, read before any APK, descriptor or source. */
export function stageRequest(argv: readonly string[]) {
  const found = flags(argv, {
    valued: ["target", "apk", "aosp-source", "output", "descriptor", "factory-image", "listener-apk", "listener-descriptor", "listener-qualification", "aapt", "apksigner"],
    switches: ["development", "owner-telephony"],
    repeated: ["patch"],
  });
  const [targetName = "", apk = "", source = "", output = ""] = required(found, "target", "apk", "aosp-source", "output");
  if (targetName !== "cuttlefish" && targetName !== "pixel10a") throw new UsageError({ message: "--target must be cuttlefish or pixel10a" });
  const target: Target = targetName === "pixel10a" ? "Pixel10a" : "Cuttlefish";
  if (found.values["factory-image"] !== undefined && target !== "Pixel10a") throw new UsageError({ message: "--factory-image belongs to --target pixel10a" });
  if (target === "Pixel10a" && found.values["factory-image"] === undefined) throw new UsageError({ message: "--target pixel10a needs --factory-image" });
  if (found.values["listener-descriptor"] !== undefined && found.values["listener-apk"] === undefined) throw new UsageError({ message: "--listener-descriptor needs --listener-apk" });
  const named = found.repeated.patch ?? [];
  const unknown = named.filter((name) => !Object.hasOwn(PATCHES, name));
  if (unknown.length) throw new UsageError({ message: `--patch takes ${Object.keys(PATCHES).join(", ")}, not ${unknown.join(", ")}` });
  if (new Set(named).size !== named.length) throw new UsageError({ message: "a --patch is given twice" });
  const stage: Stage = {
    target,
    mode: found.switches.has("development") ? "Development" : "Production",
    descriptorReviewed: found.values.descriptor !== undefined,
    productComplete: productComplete(target),
    ownerTelephony: found.switches.has("owner-telephony"),
    listener: found.values["listener-apk"] !== undefined && found.values["listener-descriptor"] !== undefined,
    qualified: found.values["listener-qualification"] !== undefined,
    patches: named.flatMap((name) => PATCHES[name]?.patch ?? []),
    branding: false,
  };
  const problems = stageProblems(stage);
  if (problems.length) throw new StageRefused({ problems, message: `Refusing the ${stage.target} ${stage.mode} stage: ${problems.join(", ")}` });
  return { found, stage, apk, source, output };
}

interface Launcher { readonly moduleName: string; readonly packageName: string }

/** The descriptor a stage installs: the reviewed one, or one described from a development APK, held to Alpha's first-boot grants and privileges. */
const launcherDescriptor = (found: Flags, stage: Stage, apk: string, apksigner: string) => Effect.gen(function* () {
  const { launcher } = (yield* attempt(() => json(PRODUCTS[stage.target]))) as { readonly launcher: Launcher };
  const supplied = found.values.descriptor;
  const descriptor = supplied === undefined
    ? { ...(yield* createDevelopmentLauncherDescriptor({ identity: { brand: "alpha", ...launcher }, apk, apksigner, development: true })),
        defaultPermissions: firstBootGrants, privilegedPermissions: alphaPrivileged }
    : yield* validateDescriptor(yield* attempt((): unknown => JSON.parse(readFileSync(supplied, "utf8"))));
  const problems: string[] = [];
  if (descriptor.packageName !== launcher.packageName || descriptor.moduleName !== launcher.moduleName) problems.push(`the descriptor is not Alpha's launcher ${launcher.packageName} (${launcher.moduleName})`);
  if (!grantsAdmitted([...(descriptor.defaultPermissions ?? [])])) problems.push(`its first-boot grants must be exactly ${JSON.stringify(firstBootGrants)}`);
  if (!privilegedAdmitted([...(descriptor.privilegedPermissions ?? [])])) problems.push(`its privileged permissions must be exactly ${JSON.stringify(alphaPrivileged)} or none`);
  if (problems.length) return yield* new StageRefused({ problems, message: `Refusing the launcher descriptor: ${problems.join("; ")}` });
  return { descriptor, launcher };
});

const stage = (argv: readonly string[]) => Effect.gen(function* () {
  const { found, stage, apk, source, output } = yield* attempt(() => stageRequest(argv));
  const aapt = found.values.aapt ?? "aapt";
  const apksigner = found.values.apksigner ?? "apksigner";
  const { descriptor, launcher } = yield* launcherDescriptor(found, stage, apk, apksigner);
  const production = stage.mode === "Production" || listenerImage(stage);
  const lockFile = place(stage.target === "Pixel10a" ? STOCK_SOURCE_LOCK : SHARED_SOURCE_LOCK);
  const profile = { name: stage.target === "Pixel10a" ? "pixel10a" : "cuttlefish", file: lockFile, sha256: yield* attempt(() => sha256File(lockFile)) };
  const patches = yield* attempt(() => [patchReference("soong-app-native", SOONG_APP_NATIVE.manifest, SOONG_APP_NATIVE.file),
    ...(found.repeated.patch ?? []).flatMap((name) => { const known = PATCHES[name]; return known === undefined ? [] : [patchReference(name, known.manifest, known.file)]; })]);
  const factory = found.values["factory-image"];
  const sourceOptions = { profile, sourceRoot: source, ...(factory === undefined ? {} : { factory }), patches };
  const verdict = stage.target === "Pixel10a" ? yield* verifyDeviceSource(sourceOptions) : yield* verifySource(sourceOptions);
  const provisioning = {
    assistant: listenerImage(stage) ? { tag: "ListenerAssistant" as const, power: true } : { tag: "NoAssistant" as const },
    requires: { autofill: true, allFilesAccess: true },
    telephonyRoles: true,
    lockScreen: "SystemOwnsLockScreen" as const,
  };
  const scratch = yield* attempt(() => mkdtempSync(join(tmpdir(), "alpha-aosp-")));
  return yield* Effect.ensuring(Effect.gen(function* () {
    const descriptorFile = join(scratch, "launcher.json");
    yield* attempt(() => writeFileSync(descriptorFile, `${JSON.stringify(descriptor, null, 2)}\n`, { flag: "wx", mode: 0o600 }));
    const staged = yield* stageLauncher({
      descriptor: descriptorFile, apk, output, aapt, apksigner, development: !production,
      nativeAbi: NATIVE_ABI[stage.target], nativeInstall: "soong", deferSoong: true,
      ...(provisionsHome(stage) ? { provisioning } : {}),
    });
    const tree = yield* aaptManifestTree(join(output, "Launcher.apk"), { aapt });
    yield* writeImageCapability(output, launcher.packageName);
    yield* requireClockProduct(output);
    yield* writeSecureCameraOverlay(output, (yield* verifySecureCameraSource(source)).source);
    if (imageTelephony(stage)) {
      if (!provisionsHome(stage)) yield* writeRoleOverrides(output, launcher.packageName, (yield* provisioningComponents(tree, launcher.packageName, provisioning)).overrides);
      const hostValues = yield* attempt(() => readFileSync(place(CAPABILITY_VALUES), "utf8"));
      yield* writeImageProvisioningOverlay(output, launcher.packageName, { mode: production ? "StageProduction" : "StageDevelopment", hostValues, ...IMAGE_PROVISIONING });
    }
    const listenerApk = found.values["listener-apk"];
    const listenerDescriptor = found.values["listener-descriptor"];
    const qualification = found.values["listener-qualification"];
    if (listenerApk !== undefined) yield* stageListener({
      output, launcher: { apk: join(output, "Launcher.apk"), descriptor: descriptorFile }, apk: listenerApk,
      ...(listenerDescriptor === undefined ? {} : { descriptor: listenerDescriptor }),
      ...SENSE, policyCertificate: place(LISTENER_CERTIFICATE), sdkCommit: ((yield* attempt(() => json("../../eliza.lock.json"))) as { readonly commit: string }).commit,
      source: sourceOptions, production, aapt, apksigner,
      ...(qualification === undefined ? {} : { activation: provisioning, qualification: { file: qualification, sha256: yield* attempt(() => sha256File(qualification)) } }),
    });
    const product = yield* composeProduct({ output, descriptor: place(PRODUCTS[stage.target]), source: verdict.state, purpose: production ? "Production" : "Development", provisioning });
    return { staged: staged.evidence, product, imageTelephony: imageTelephony(stage), claims: "staging only: not an image build, a boot, an update or acceptance" };
  }), Effect.sync(() => rmSync(scratch, { recursive: true, force: true })));
});

/** The operator's arguments, with Alpha's channel and the stallion stock source lock where the command reads one and none was given. */
export function otaArguments(argv: readonly string[]): string[] {
  const command = OTA_COMMANDS[argv[0] ?? ""];
  const args = [...argv];
  if (command === undefined) return args;
  if (readsChannel(command) && !args.includes("--channel")) args.push("--channel", place(CHANNEL));
  if (readsSourceLock(command) && !args.includes("--source-lock")) args.push("--source-lock", place(STOCK_SOURCE_LOCK));
  return args;
}

const ota = (argv: readonly string[]) => Effect.gen(function* () {
  const channel = (yield* attempt(() => json(CHANNEL))) as { readonly channel: string; readonly product: string; readonly device: string; readonly downgradeAllowed: boolean };
  if (!channelIsAlphas({ name: channel.channel, product: channel.product, device: channel.device, downgradeAllowed: channel.downgradeAllowed }))
    return yield* new UsageError({ message: `${CHANNEL} is not Alpha's channel ${JSON.stringify(alphaChannel)}` });
  return yield* otaMain(otaArguments(argv));
});

const verify = (argv: readonly string[]) => Effect.gen(function* () {
  const found = yield* attempt(() => flags(argv, { valued: ["target", "serial", "user", "expected", "adb", "out"] }));
  const [target = "", serial = "", user = "", expectedFile = ""] = yield* attempt(() => required(found, "target", "serial", "user", "expected"));
  if (target !== "pixel10a" && target !== "cuttlefish") return yield* new UsageError({ message: "--target must be pixel10a or cuttlefish" });
  const expected = yield* attempt((): unknown => JSON.parse(readFileSync(expectedFile, "utf8")));
  const report = yield* verifyImage({ target, serial, user, expected, ...(found.values.adb === undefined ? {} : { adb: found.values.adb }) });
  const out = found.values.out;
  if (out !== undefined) yield* attempt(() => writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 }));
  return report;
});

function requestOf(argv: readonly string[], switches: readonly string[]) {
  const found = flags(argv, { valued: ["request"], switches });
  const [file = ""] = required(found, "request");
  const request: unknown = JSON.parse(readFileSync(file, "utf8"));
  return { request: typeof request === "object" && request !== null ? request : {}, switches: found.switches };
}

const sign = (argv: readonly string[]) => Effect.gen(function* () {
  const signer = yield* attempt(() => json(RELEASE_SIGNER));
  if (!signerRecordAdmitted({ rotation: typeof signer === "object" && signer !== null && Object.hasOwn(signer, "apkSigningRotation") }))
    return yield* new UsageError({ message: `${RELEASE_SIGNER} still has apkSigningRotation; Alpha signs with one key. Delete the apkSigningRotation object.` });
  const { request, switches } = yield* attempt(() => requestOf(argv, ["dry-run"]));
  const alpha = { descriptor: place(RELEASE), product: place(PRODUCTS.Pixel10a), channel: place(CHANNEL), keyManifest: place(KEY_MANIFEST) };
  return yield* signRelease(yield* signReleaseRequest({ ...alpha, ...request }, switches.has("dry-run")));
});

const record = (argv: readonly string[]) => Effect.gen(function* () {
  const { request } = yield* attempt(() => requestOf(argv, []));
  return yield* writeReleaseRecord({ channel: place(CHANNEL), ...request });
});

const keys = (argv: readonly string[]) => Effect.gen(function* () {
  const [command, ...rest] = argv;
  switch (command) {
    case "generate": {
      const options = yield* Effect.mapError(parseArgs(rest.includes("--manifest") ? rest : [...rest, "--manifest", place(KEY_MANIFEST)]), (failure) => new UsageError({ message: failure.reason }));
      return yield* generate(options);
    }
    case "decrypt": {
      const found = yield* attempt(() => flags(rest, { valued: ["input", "output", "passphrase-file", "only"] }));
      const [input = "", output = "", passphraseFile = ""] = yield* attempt(() => required(found, "input", "output", "passphrase-file"));
      return yield* decrypt({ input, output, passphraseFile, ...(found.values.only === undefined ? {} : { only: found.values.only }) });
    }
    default:
      return yield* new UsageError({ message: `keys takes generate or decrypt, not ${command ?? "nothing"}` });
  }
});

const enroll = (argv: readonly string[]) => Effect.gen(function* () {
  const found = yield* attempt(() => flags(argv, { valued: ["checkout", "certificate", "product-makefile-sha256", "receipt"], switches: ["execute"] }));
  const [checkout = "", certificate = "", productMakefileSha256 = "", receipt = ""] = yield* attempt(() => required(found, "checkout", "certificate", "product-makefile-sha256", "receipt"));
  const pilot = (yield* attempt(() => json(ENROLLMENT))) as { readonly manifestUrl: string; readonly hosts: readonly string[]; readonly product: string; readonly device: string; readonly otaCertificateSha256: string };
  const channel = { manifestUrl: pilot.manifestUrl, hosts: pilot.hosts, product: pilot.product, device: pilot.device, otaCertificateSha256: pilot.otaCertificateSha256 };
  return yield* enrollUpdater({ checkout, descriptor: place(PRODUCTS.Pixel10a), channel, certificate, productMakefileSha256, receipt, execute: found.switches.has("execute") });
});

const GATES: Readonly<Record<string, Os.Gate>> = {
  "signed-image": "SignedImage", "channel": "ChannelGate", "trust": "Trust", "selinux": "Selinux", "engine": "Engine",
  "physical-recovery": "PhysicalRecovery", "cache-retention": "CacheRetention", "candidate-recovery": "CandidateRecovery",
};
const DRILLS: Readonly<Record<string, Os.Drill>> = {
  "signed-update": "SignedUpdate", "interrupted-update": "InterruptedUpdate", "compatible-rollback": "CompatibleRollback", "stock-recovery": "StockRecovery",
};

/** The profile the image's enrolment stages: the pilot enrolment's manifest, hosts, product, device and certificate, with the channel's verified-boot key. */
function enrolledProfile(): Os.Profile {
  const pilot = json(ENROLLMENT) as { readonly manifestUrl: string; readonly hosts: readonly string[]; readonly product: string; readonly device: string; readonly otaCertificateSha256: string; readonly rotatePlatformOrAVBKeys: boolean; readonly wipeData: boolean };
  const channel = json(CHANNEL) as { readonly avbPublicKeySha256: string };
  return {
    manifest: pilot.manifestUrl, hosts: pilot.hosts.join(" "), product: pilot.product, device: pilot.device,
    certificate: pilot.otaCertificateSha256, avb: channel.avbPublicKeySha256, rotate: pilot.rotatePlatformOrAVBKeys, wipe: pilot.wipeData,
  };
}

/** A signed release record as the OS spec reads it, or the stock image. */
function imageRecord(file: string): Os.ImageRecord {
  if (file === "stock") return Os.stock;
  const record = JSON.parse(readFileSync(file, "utf8")) as {
    readonly build: { readonly dateUtc: string | number }; readonly product: string; readonly device: string;
    readonly certificates: { readonly releasekey: string }; readonly verifiedBoot: { readonly publicKeySha256: string };
    readonly payload?: { readonly metadata?: Readonly<Record<string, string>> };
  };
  return {
    build: Number(record.build.dateUtc), product: record.product, device: record.device, certificate: record.certificates.releasekey,
    avb: record.verifiedBoot.publicKeySha256, wipe: record.payload?.metadata?.["ota-wipe"] === "yes",
  };
}

/** The OS event a command line names, read before the ledger is opened. */
function osEvent(argv: readonly string[]): Os.Event {
  const [name = "", ...rest] = argv;
  switch (name) {
    case "stage": return { type: "stage", profile: enrolledProfile() };
    case "enable": case "interrupt": case "resume": case "finish": return { type: name };
    case "start": return { type: "startApply" };
    case "retain-known-good": return { type: "retainKnownGood" };
    case "pass": {
      const gate = GATES[required(flags(rest, { valued: ["gate"] }), "gate")[0] ?? ""];
      if (gate === undefined) throw new UsageError({ message: `--gate takes ${Object.keys(GATES).join(", ")}` });
      return { type: "pass", gate };
    }
    case "check": {
      const [from = "", to = ""] = required(flags(rest, { valued: ["from", "to"] }), "from", "to");
      return { type: "check", base: imageRecord(from), goal: imageRecord(to) };
    }
    case "fallback": {
      const found = flags(rest, { valued: ["to", "image"] });
      const [to = ""] = required(found, "to");
      if (to !== "stock" && to !== "known-good") throw new UsageError({ message: "--to takes stock or known-good" });
      const image = found.values.image;
      if ((to === "stock") !== (image !== undefined)) throw new UsageError({ message: "--image names the stock factory image, and only for --to stock" });
      return { type: "fallback", toStock: to === "stock", image: image === undefined ? "" : sha256File(image) };
    }
    case "drill": {
      const found = flags(rest, { valued: ["drill"], switches: ["passed", "failed"] });
      const drill = DRILLS[required(found, "drill")[0] ?? ""];
      if (drill === undefined) throw new UsageError({ message: `--drill takes ${Object.keys(DRILLS).join(", ")}` });
      if (found.switches.has("passed") === found.switches.has("failed")) throw new UsageError({ message: "say --passed or --failed" });
      return { type: "recordDrill", drill, passed: found.switches.has("passed") };
    }
    default: throw new UsageError({ message: `os takes stage, pass, enable, check, start, interrupt, resume, finish, retain-known-good, fallback or drill, not ${name || "nothing"}` });
  }
}

/** The release owner's record of the image's updater, its gates, the updates applied by hand and the drills, each step held to the OS spec. */
const os = (argv: readonly string[]) => Effect.gen(function* () {
  const [flag, file, ...rest] = argv;
  if (flag !== "--ledger" || file === undefined) return yield* new UsageError({ message: "os needs --ledger FILE first" });
  const event = yield* attempt(() => osEvent(rest));
  return yield* attempt(() => ledger<Os.Os, Os.Event>(Os, file).take(event));
});

const commands = { stage, ota, verify, sign, record, keys, enroll, os } as const;

/** One `pnpm aosp` command, as an effect over Node's services. */
export const aosp = (argv: readonly string[]) => dispatch(commands, argv, (message) => new UsageError({ message }));

if (import.meta.main) await runCli(aosp(process.argv.slice(2)), USAGE, (failure) => failure instanceof UsageError);
