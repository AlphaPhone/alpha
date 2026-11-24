#!/usr/bin/env node
// spec/release/index.md, "Story: Build a candidate"; spec/release/index.md, "Story: Qualify and publish a release"; spec/release/index.md, "A build is a candidate only when its verification recorded it distributable: no test mocks, the production bundle audit passed, Alpha's one signer, the runtime packaged with its notices, an on-device voice slot, and for an image its platform certificate"; spec/release/index.md, "An APK is admitted to the channel only as Alpha's launcher, first signed by Alpha's one key, at the candidate's version, not debuggable, of at most 2 GiB, and with only the entries a release may hold"; spec/release/index.md, "Phones read the launcher channel from the stable release of Alpha's repository, eliza-research/alpha, known by its permanent id; APKs kept under the repository's earlier names stay valid"; spec/release/index.md, "The anonymous download must return the exact size and digest before anything else moves"; spec/release/index.md, "The manifest is moved only after the download was verified, with the APK still in the channel's final inventory, the channel unchanged since publishing began, and the version above the floor and the published version as they are then"
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { aaptManifestTree, apkReleaseBlockers, listAndroidArtifactEntries, manifestFacts, readApkBuildFlags, readApkSignerDigest, snapshotAndroidArtifact } from "@elizaos/os/image";
import { Data, Effect } from "effect";
import {
  type Apk, type Blockers, admitted, channelManifest, channelRepository, channelRepositoryId, channelTag, clear, distributable, earlierRepositories, maxApkBytes, retiredTag,
} from "../gen/release.ts";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIGNER = join(app, "aosp/signing/release-signer.json");
const PACKAGE = "ai.alphacompute.alphaphone";
const LAUNCHER_MARK = "android.permission.READ_CONTACTS";

export class UsageError extends Data.TaggedError("UsageError")<{ readonly message: string }> {}
export class ReleaseRefused extends Data.TaggedError("ReleaseRefused")<{ readonly message: string }> {}

const USAGE = [
  "pnpm release channel",
  "pnpm release blockers --apk-manifest FILE [--platform-certificate HEX]",
  "pnpm release admit --apk FILE --version N",
  "pnpm release manifest --apk FILE --version N [--notes TEXT] --out NEW_FILE",
  "pnpm release deliver --apk FILE --manifest FILE --version N [--execute]",
  "pnpm release status",
].join("\n");

/** The manifest phones read, at the release of the channel's tag. */
export const manifestUrl = (tag: string = channelTag) => `https://github.com/${channelRepository}/releases/download/${tag}/${channelManifest}`;
/** Where the APK of `version` is kept on the channel. */
export const apkUrl = (version: number, repository: string = channelRepository, tag: string = channelTag) =>
  `https://github.com/${repository}/releases/download/${tag}/alpha-phone-${version}.apk`;
/** Whether `url` is an APK of `version` that the channel or an earlier name of its repository keeps. */
export const kept = (url: string, version: number) =>
  [channelRepository, ...earlierRepositories].some((repository) => [channelTag, retiredTag].some((tag) => url === apkUrl(version, repository, tag)));

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** The release signer Alpha enrolled: its one key. */
const reviewedSigner = () => (JSON.parse(readFileSync(SIGNER, "utf8")) as { readonly signerSha256: string }).signerSha256;

/** Each reason eliza's judgement of a verify row gives, as the blocker the release spec names. */
export function blockersOf(reasons: readonly string[]): Blockers {
  const any = (...names: string[]) => reasons.some((reason) => names.includes(reason));
  return {
    mocks: any("TestMocksBuild"),
    audit: any("BundleNotAudited", "NotRecordedDistributable"),
    signer: any("Unsigned", "SignerNotReviewed"),
    runtime: any("RuntimeNotPackaged", "ProfileUnknown"),
    notices: any("RuntimeNoticesMissing", "LicenceUnrecorded", "LicenceBlocks"),
    voice: any("VoiceNotRecorded", "OnDeviceVoiceMissing", "VoiceAssetsUnverified", "VoiceUnqualified", "CloudPackagesVoice", "QaReceiptNotPassed"),
    platform: any("ImageCertificateUnreviewed"),
  };
}

function flags(argv: readonly string[], valued: readonly string[], switches: readonly string[] = []) {
  const values: Record<string, string> = {};
  const on = new Set<string>();
  for (let index = 0; index < argv.length; index++) {
    const name = (argv[index] ?? "").replace(/^--/, "");
    if (argv[index] === "--") continue;
    if (switches.includes(name)) { on.add(name); continue; }
    const value = argv[index + 1];
    if (!valued.includes(name) || value === undefined || value.startsWith("--")) throw new UsageError({ message: `unknown or empty argument ${argv[index]}` });
    values[name] = value;
    index++;
  }
  const need = (...names: string[]) => names.map((name) => {
    const value = values[name];
    if (value === undefined) throw new UsageError({ message: `--${name} required` });
    return value;
  });
  return { values, on, need };
}

const attempt = <A>(read: () => A) => Effect.try({ try: read, catch: (cause) => cause instanceof UsageError || cause instanceof ReleaseRefused ? cause : new ReleaseRefused({ message: cause instanceof Error ? cause.message : String(cause) }) });

/** The facts the admission rule reads from the APK's own bytes, never from a record of it. */
const apkFacts = (file: string) => Effect.gen(function* () {
  const snapshot = yield* snapshotAndroidArtifact(file, { maxArtifactBytes: maxApkBytes });
  const facts = manifestFacts(yield* aaptManifestTree(file));
  const signer = yield* readApkSignerDigest(file);
  const entries = yield* Effect.exit(listAndroidArtifactEntries(file, { artifactBytes: snapshot.bytes }));
  const flagged = yield* readApkBuildFlags(file, { artifactBytes: snapshot.bytes });
  const apk: Apk = {
    launcher: facts.packageName === PACKAGE && facts.permissions.includes(LAUNCHER_MARK),
    signer: signer === reviewedSigner(),
    version: facts.versionCode ?? 0,
    debuggable: facts.application.debuggable !== null,
    bytes: snapshot.sizeBytes,
    entries: entries._tag === "Success" && flagged === "MocksOff",
  };
  return { apk, sha256: snapshot.sha256, versionName: facts.versionName ?? "" };
});

const admit = (file: string, version: number) => Effect.gen(function* () {
  const read = yield* apkFacts(file);
  if (!admitted(read.apk, version)) return yield* new ReleaseRefused({ message: `${file} is not admitted to the channel as version ${version}: ${JSON.stringify(read.apk)}` });
  return read;
});

const versionOf = (text: string) => {
  const version = Number(text);
  if (!Number.isSafeInteger(version) || version <= 0) throw new UsageError({ message: "--version must be a positive whole number" });
  return version;
};

/** What `url` serves to anyone, without credentials. */
const fetched = (url: string) => Effect.tryPromise({
  try: async () => {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  },
  catch: (cause) => new ReleaseRefused({ message: cause instanceof Error ? cause.message : String(cause) }),
});

const gh = (...args: string[]) => attempt(() => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));

const commands = {
  channel: () => Effect.succeed({ repository: channelRepository, repositoryId: channelRepositoryId, tag: channelTag, manifestUrl: manifestUrl() }),
  blockers: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk-manifest", "platform-certificate"]));
    const [file = ""] = yield* attempt(() => found.need("apk-manifest"));
    const recorded = yield* attempt(() => JSON.parse(readFileSync(file, "utf8")) as { readonly apks?: readonly unknown[] });
    const platform = found.values["platform-certificate"];
    const review = { reviewedSigner: reviewedSigner(), ...(platform === undefined ? {} : { image: { platformCertificateSha256: platform } }) };
    const rows = (recorded.apks ?? []).map((row) => ({ row, blockers: blockersOf(apkReleaseBlockers(row, review)) }));
    if (rows.length === 0 || rows.some(({ blockers }) => !distributable(blockers))) return yield* new ReleaseRefused({ message: `not distributable: ${JSON.stringify(rows.map(({ blockers }) => blockers))}` });
    return { distributable: true, rows: rows.length, clear };
  }),
  admit: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk", "version"]));
    const [file = "", version = ""] = yield* attempt(() => found.need("apk", "version"));
    return yield* admit(file, yield* attempt(() => versionOf(version)));
  }),
  manifest: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk", "version", "notes", "out"]));
    const [file = "", version = "", out = ""] = yield* attempt(() => found.need("apk", "version", "out"));
    const number = yield* attempt(() => versionOf(version));
    const read = yield* admit(file, number);
    const notes = found.values.notes;
    const manifest = {
      schema: "alpha-update/v1", versionCode: number, ...(read.versionName === "" ? {} : { versionName: read.versionName }), ...(notes === undefined ? {} : { notes }),
      variant: "launcher", signerSha256: reviewedSigner(), apkUrl: apkUrl(number), sha256: read.sha256, sizeBytes: read.apk.bytes,
    };
    yield* attempt(() => writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" }));
    return manifest;
  }),
  deliver: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk", "manifest", "version"], ["execute"]));
    const [file = "", manifestFile = "", version = ""] = yield* attempt(() => found.need("apk", "manifest", "version"));
    const number = yield* attempt(() => versionOf(version));
    const read = yield* admit(file, number);
    const manifest = yield* attempt(() => JSON.parse(readFileSync(manifestFile, "utf8")) as { readonly apkUrl?: string; readonly sha256?: string; readonly sizeBytes?: number; readonly versionCode?: number });
    if (manifest.apkUrl !== apkUrl(number) || manifest.sha256 !== read.sha256 || manifest.sizeBytes !== read.apk.bytes || manifest.versionCode !== number)
      return yield* new ReleaseRefused({ message: "the manifest does not name exactly this APK" });
    const plan = { upload: `alpha-phone-${number}.apk`, verify: apkUrl(number), then: manifestUrl() };
    if (!found.on.has("execute")) return { plan, executed: false };
    const repository = `--repo=${channelRepository}`;
    const listed = yield* gh("release", "view", channelTag, repository, "--json", "assets", "--jq", ".assets[].name");
    if (!listed.split("\n").includes(plan.upload)) yield* gh("release", "upload", channelTag, `${file}#${plan.upload}`, repository);
    const served = yield* fetched(apkUrl(number));
    if (served.length !== read.apk.bytes || sha256(served) !== read.sha256) return yield* new ReleaseRefused({ message: "the anonymous download is not the admitted APK; the manifest is not moved" });
    const before = yield* Effect.exit(fetched(manifestUrl()));
    const named = before._tag === "Success" ? (JSON.parse(new TextDecoder().decode(before.value)) as { readonly versionCode?: number }).versionCode ?? 0 : 0;
    if (named >= number) return yield* new ReleaseRefused({ message: `the channel already names version ${named}` });
    yield* gh("release", "upload", channelTag, `${manifestFile}#${channelManifest}`, "--clobber", repository);
    const after = JSON.parse(new TextDecoder().decode(yield* fetched(manifestUrl()))) as { readonly versionCode?: number };
    return { plan, executed: true, readBack: after.versionCode === number ? "names this release" : `names ${after.versionCode}` };
  }),
  status: () => Effect.gen(function* () {
    const manifest = JSON.parse(new TextDecoder().decode(yield* fetched(manifestUrl()))) as { readonly versionCode: number; readonly apkUrl: string; readonly sha256: string; readonly sizeBytes: number };
    const served = yield* fetched(manifest.apkUrl);
    return {
      versionCode: manifest.versionCode, kept: kept(manifest.apkUrl, manifest.versionCode),
      exact: served.length === manifest.sizeBytes && sha256(served) === manifest.sha256,
    };
  }),
} as const;

/** One `pnpm release` command, as an effect over Node's services. */
export const release = (argv: readonly string[]) => Effect.suspend(() => {
  const [command = "", ...rest] = argv[0] === "--" ? argv.slice(1) : argv;
  if (!Object.hasOwn(commands, command)) return Effect.fail(new UsageError({ message: command === "" ? "a command is required" : `unknown command ${command}` }));
  return (commands[command as keyof typeof commands] as (argv: readonly string[]) => Effect.Effect<unknown, unknown, never>)(rest);
}).pipe(Effect.provide(NodeServices.layer));

if (import.meta.main) {
  const outcome = await Effect.runPromiseExit(release(process.argv.slice(2)));
  if (outcome._tag === "Success") console.log(JSON.stringify(outcome.value, null, 2));
  else {
    const reason = outcome.cause.reasons[0];
    const failure: unknown = reason?._tag === "Fail" ? reason.error : outcome.cause;
    const detail = failure instanceof Error ? failure.message : String(failure);
    console.error(failure instanceof UsageError ? `${detail}\n\n${USAGE}` : detail);
    process.exitCode = failure instanceof UsageError ? 2 : 1;
  }
}
