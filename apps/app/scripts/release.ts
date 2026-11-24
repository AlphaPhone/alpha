#!/usr/bin/env node
// spec/release/index.md, "Story: Build a candidate"; spec/release/index.md, "Story: Sign a release"; spec/release/index.md, "Story: Qualify and publish a release"; spec/release/index.md, "A build is a candidate only when its verification recorded it distributable: no test mocks, the production bundle audit passed, Alpha's one signer, the runtime packaged with its notices, an on-device voice slot, and for an image its platform certificate"; spec/release/index.md, "An APK is admitted to the channel only as Alpha's launcher, first signed by Alpha's one key, at the candidate's version, not debuggable, of at most 2 GiB, and with only the entries a release may hold"; spec/release/index.md, "Phones read the launcher channel from the stable release of Alpha's repository, eliza-research/alpha, known by its permanent id; APKs kept under the repository's earlier names stay valid"; spec/release/index.md, "The anonymous download must return the exact size and digest before anything else moves"; spec/release/index.md, "The manifest is moved only after the download was verified, with the APK still in the channel's final inventory, the channel unchanged since publishing began, and the version above the floor and the published version as they are then"; spec/release/pilot.md, "Story: Update a pilot phone by cable"; spec/release/index.md, "Story: Read back a phone that updated itself"; spec/release/index.md, "The protected keys are proven to be the enrolled ones: each of the nine OS certificates, the two verified-boot keys and Alpha's app key pairs with its committed public identity, none is a test key, and no two are the same"
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { gunzipSync } from "node:zlib";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  aaptManifestTree, apkReleaseBlockers, apkUpdateAdmission, apkUpdateReceipt, integrityQuery, listAndroidArtifactEntries, manifestFacts, qaEvidenceAdmission,
  readApkBuildFlags, readApkSignerDigest, readbackInventory, snapshotAndroidArtifact,
} from "@elizaos/os/image";
import { Data, Effect } from "effect";
import * as Channel from "../gen/release.ts";
import {
  type Apk, type Blockers, type Custody, type Readback, admitted, channelManifest, channelRepository, channelRepositoryId, channelTag, clear, distributable, earlierRepositories, maxApkBytes,
  custodyProven, retiredTag, updatedItself,
} from "../gen/release.ts";
import { pilotPassed } from "../gen/app__image.ts";
import * as Pilot from "../gen/release__pilot.ts";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIGNER = join(app, "aosp/signing/release-signer.json");
const PACKAGE = "ai.alphacompute.alphaphone";
const LAUNCHER_MARK = "android.permission.READ_CONTACTS";
const KEYSTORE_PASSWORD = "ALPHA_APP_RELEASE_KEYSTORE_PASSWORD";
const PILOT_LOCKS = join(homedir(), ".local", "state", "alpha-pilot");

export class UsageError extends Data.TaggedError("UsageError")<{ readonly message: string }> {}
export class ReleaseRefused extends Data.TaggedError("ReleaseRefused")<{ readonly message: string }> {}

const USAGE = [
  "pnpm release channel",
  "pnpm release blockers --apk-manifest FILE [--platform-certificate HEX]",
  "pnpm release admit --apk FILE --version N",
  "pnpm release manifest --apk FILE --version N [--notes TEXT] --out NEW_FILE",
  "pnpm release candidate --run FILE --number N --attempt N --apk-manifest FILE [--platform-certificate HEX]",
  "pnpm release rerun|abandon --run FILE",
  "pnpm release mirror --run FILE --apk UNSIGNED --to DIR",
  "pnpm release plan --run FILE --apk UNSIGNED --out NEW_FILE",
  "pnpm release review --run FILE --plan FILE --plan-sha256 HEX",
  "pnpm release sign --run FILE --plan FILE --apk UNSIGNED --out NEW_FILE --keystore FILE --key-label LABEL [--apksigner PATH]",
  "pnpm release deliver --run FILE --apk SIGNED --apk-manifest FILE --to DIR",
  "pnpm release qualify --run FILE --apk SIGNED --evidence FILE",
  "pnpm release publish --run FILE --apk SIGNED --manifest FILE [--execute]",
  "pnpm release record --run FILE --manifest FILE",
  "pnpm release status",
  "pnpm release pilot --serial SERIAL --apk FILE --version N --record NEW_FILE [--stock-home PACKAGE/ACTIVITY]",
  "pnpm release readback --serial SERIAL --record NEW_FILE [--before FILE]",
  "pnpm release custody --out NEW_FILE [--scratch TMPFS_DIR]",
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
const sha256File = (file: string) => sha256(readFileSync(file));
const hours = () => Math.floor(Date.now() / 3_600_000);

interface SignerRecord { readonly signerSha256: string; readonly lastRelease?: { readonly versionCode: number | null }; readonly apkSigningRotation?: unknown }
const signerRecord = () => JSON.parse(readFileSync(SIGNER, "utf8")) as SignerRecord;
/** The release signer Alpha enrolled: its one key. */
const reviewedSigner = () => signerRecord().signerSha256;

/** The rules of one machine of the spec, as gen derives them. */
interface Rules<S, E> {
  readonly initial: S;
  readonly parseState: (kept: unknown) => S | undefined;
  readonly enabled: (state: S, event: E) => boolean;
  readonly step: (state: S, event: E) => S;
}

/**
 * One machine of the spec kept in `file`: the state it reached and every event taken, written as each is taken.
 * An event its rules refuse is never taken, and nothing in the file changes.
 */
export function ledger<S, E extends { readonly type: string }>(rules: Rules<S, E>, file: string) {
  const kept = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as { readonly state?: unknown; readonly taken?: readonly unknown[] } : {};
  const read = kept.state === undefined ? rules.initial : rules.parseState(kept.state);
  if (read === undefined) throw new ReleaseRefused({ message: `${file} holds no state the spec allows` });
  let state: S = read;
  const taken = [...(kept.taken ?? [])];
  return {
    get state() { return state; },
    can: (event: E) => rules.enabled(state, event),
    take(event: E) {
      if (!rules.enabled(state, event)) throw new ReleaseRefused({ message: `the spec refuses ${JSON.stringify(event)} from ${JSON.stringify(state)}` });
      state = rules.step(state, event);
      taken.push(event);
      writeFileSync(`${file}.partial`, `${JSON.stringify({ state, taken }, null, 2)}\n`);
      renameSync(`${file}.partial`, file);
      return state;
    },
  };
}

/**
 * Each reason eliza's judgement of a verify row gives, as the blocker the release spec names. An unsigned candidate is
 * not yet signed or recorded distributable; those two are judged once it is signed.
 */
export function blockersOf(reasons: readonly string[], signed: boolean): Blockers {
  const any = (...names: string[]) => reasons.some((reason) => names.includes(reason));
  return {
    mocks: any("TestMocksBuild"),
    audit: any("BundleNotAudited") || (signed && any("NotRecordedDistributable")),
    signer: any("SignerNotReviewed") || (signed && any("Unsigned")),
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

const whole = (text: string, name: string) => {
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number <= 0) throw new UsageError({ message: `--${name} must be a positive whole number` });
  return number;
};

/** What every row of the verification's APK manifest blocks, together; none at all is a blocker of its own. */
function recordedBlockers(file: string, platform: string | undefined, signed: boolean) {
  const recorded = JSON.parse(readFileSync(file, "utf8")) as { readonly apks?: readonly unknown[] };
  const review = { reviewedSigner: reviewedSigner(), ...(platform === undefined ? {} : { image: { platformCertificateSha256: platform } }) };
  const rows = (recorded.apks ?? []).map((row) => blockersOf(apkReleaseBlockers(row, review), signed));
  const all = rows.reduce<Blockers>((sum, row) => ({
    mocks: sum.mocks || row.mocks, audit: sum.audit || row.audit, signer: sum.signer || row.signer, runtime: sum.runtime || row.runtime,
    notices: sum.notices || row.notices, voice: sum.voice || row.voice, platform: sum.platform || row.platform,
  }), clear);
  return { rows: rows.length, blockers: rows.length === 0 ? { ...clear, audit: true } : all };
}

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
  return { apk, sha256: snapshot.sha256, signer, versionName: facts.versionName ?? "" };
});

const admit = (file: string, version: number) => Effect.gen(function* () {
  const read = yield* apkFacts(file);
  if (!admitted(read.apk, version)) return yield* new ReleaseRefused({ message: `${file} is not admitted to the channel as version ${version}: ${JSON.stringify(read.apk)}` });
  return read;
});

/** What `url` serves to anyone, without credentials. */
const fetched = (url: string) => Effect.tryPromise({
  try: async () => {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  },
  catch: (cause) => new ReleaseRefused({ message: cause instanceof Error ? cause.message : String(cause) }),
});

/** The version the stable manifest names now, or 0 where there is none. */
const named = Effect.map(Effect.exit(fetched(manifestUrl())), (read) =>
  read._tag === "Success" ? (JSON.parse(new TextDecoder().decode(read.value)) as { readonly versionCode?: number }).versionCode ?? 0 : 0);

const gh = (...args: string[]) => attempt(() => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const repository = `--repo=${channelRepository}`;
const listed = Effect.map(gh("release", "view", channelTag, repository, "--json", "assets", "--jq", ".assets[].name"), (names) => names.split("\n"));

/** Whether a keystore is held as the protected environment holds it: an absolute, owner-only file outside every Git tree, with its password given. */
function guardedKeystore(file: string) {
  const stat = isAbsolute(file) ? lstatSync(file, { throwIfNoEntry: false }) : undefined;
  if (stat === undefined || !stat.isFile() || (stat.mode & 0o077) !== 0 || !process.env[KEYSTORE_PASSWORD]) return false;
  for (let directory = dirname(realpathSync(file)); ; directory = dirname(directory)) {
    if (existsSync(join(directory, ".git"))) return false;
    if (dirname(directory) === directory) return true;
  }
}

/** A plan the reviewer read: the run, attempt and exact unsigned APK it signs, with Alpha's one signer. */
interface Plan { readonly number: number; readonly attempt: number; readonly unsignedSha256: string; readonly signerSha256: string; readonly packageName: string }

const runOf = (file: string) => ledger<Channel.Channel, Channel.Event>(Channel, file);

const commands = {
  channel: () => Effect.succeed({ repository: channelRepository, repositoryId: channelRepositoryId, tag: channelTag, manifestUrl: manifestUrl() }),
  blockers: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk-manifest", "platform-certificate"]));
    const [file = ""] = yield* attempt(() => found.need("apk-manifest"));
    const { rows, blockers } = yield* attempt(() => recordedBlockers(file, found.values["platform-certificate"], true));
    if (!distributable(blockers)) return yield* new ReleaseRefused({ message: `not distributable: ${JSON.stringify(blockers)}` });
    return { distributable: true, rows, blockers };
  }),
  admit: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk", "version"]));
    const [file = "", version = ""] = yield* attempt(() => found.need("apk", "version"));
    return yield* admit(file, yield* attempt(() => whole(version, "version")));
  }),
  manifest: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["apk", "version", "notes", "out"]));
    const [file = "", version = "", out = ""] = yield* attempt(() => found.need("apk", "version", "out"));
    const number = yield* attempt(() => whole(version, "version"));
    const read = yield* admit(file, number);
    const notes = found.values.notes;
    const manifest = {
      schema: "alpha-update/v1", versionCode: number, ...(read.versionName === "" ? {} : { versionName: read.versionName }), ...(notes === undefined ? {} : { notes }),
      variant: "launcher", signerSha256: reviewedSigner(), apkUrl: apkUrl(number), sha256: read.sha256, sizeBytes: read.apk.bytes,
    };
    yield* attempt(() => writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" }));
    return manifest;
  }),
  candidate: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["run", "number", "attempt", "apk-manifest", "platform-certificate"]));
    const [file = "", number = "", tried = "", recorded = ""] = yield* attempt(() => found.need("run", "number", "attempt", "apk-manifest"));
    const event = { type: "build" as const, number: yield* attempt(() => whole(number, "number")), attempt: yield* attempt(() => whole(tried, "attempt")),
      blockers: (yield* attempt(() => recordedBlockers(recorded, found.values["platform-certificate"], false))).blockers };
    const run = yield* attempt(() => runOf(file));
    const floor = (yield* attempt(() => signerRecord())).lastRelease?.versionCode ?? 0;
    if (run.can({ type: "retainElsewhere", version: floor })) yield* attempt(() => run.take({ type: "retainElsewhere", version: floor }));
    return yield* attempt(() => run.take(event));
  }),
  rerun: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = ""] = yield* attempt(() => flags(argv, ["run"]).need("run"));
    return yield* attempt(() => runOf(file).take({ type: "rerun" }));
  }),
  abandon: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = ""] = yield* attempt(() => flags(argv, ["run"]).need("run"));
    return yield* attempt(() => runOf(file).take({ type: "abandon" }));
  }),
  mirror: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", apk = "", to = ""] = yield* attempt(() => flags(argv, ["run", "apk", "to"]).need("run", "apk", "to"));
    const run = yield* attempt(() => runOf(file));
    return yield* attempt(() => {
      const target = join(to, `alpha-phone-${run.state.number}-unsigned.apk`);
      const existing = existsSync(target);
      const event = { type: "mirror" as const, existing, sameBytes: existing && sha256File(target) === sha256File(apk) };
      if (!run.can(event)) throw new ReleaseRefused({ message: `${target} already holds other bytes, or no candidate waits to be mirrored` });
      if (!existing) {
        mkdirSync(to, { recursive: true });
        copyFileSync(apk, target, constants.COPYFILE_EXCL);
        if (sha256File(target) !== sha256File(apk)) throw new ReleaseRefused({ message: `${target} did not read back as ${apk}` });
      }
      return { mirrored: target, sha256: sha256File(target), state: run.take(event) };
    });
  }),
  plan: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", apk = "", out = ""] = yield* attempt(() => flags(argv, ["run", "apk", "out"]).need("run", "apk", "out"));
    const run = yield* attempt(() => runOf(file));
    return yield* attempt(() => {
      const event = { type: "makePlan" as const, attempt: run.state.attempt };
      if (!run.can(event)) throw new ReleaseRefused({ message: "no mirrored candidate waits for a plan" });
      const plan: Plan = { number: run.state.number, attempt: run.state.attempt, unsignedSha256: sha256File(apk), signerSha256: reviewedSigner(), packageName: PACKAGE };
      writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx" });
      return { plan, planSha256: sha256File(out), state: run.take(event) };
    });
  }),
  review: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", planFile = "", approved = ""] = yield* attempt(() => flags(argv, ["run", "plan", "plan-sha256"]).need("run", "plan", "plan-sha256"));
    const run = yield* attempt(() => runOf(file));
    return yield* attempt(() => {
      const plan = JSON.parse(readFileSync(planFile, "utf8")) as Plan;
      if (sha256File(planFile) !== approved || plan.attempt !== run.state.plan || plan.number !== run.state.number)
        throw new ReleaseRefused({ message: `${planFile} is not the plan reviewed as ${approved} for run ${run.state.number} attempt ${run.state.plan}` });
      return run.take({ type: "review" });
    });
  }),
  sign: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["run", "plan", "apk", "out", "keystore", "key-label", "apksigner"]));
    const [file = "", planFile = "", apk = "", out = "", keystore = "", label = ""] = yield* attempt(() => found.need("run", "plan", "apk", "out", "keystore", "key-label"));
    const run = yield* attempt(() => runOf(file));
    const plan = yield* attempt(() => JSON.parse(readFileSync(planFile, "utf8")) as Plan);
    const guarded = yield* attempt(() => guardedKeystore(keystore));
    const rotation = yield* attempt(() => Object.hasOwn(signerRecord(), "apkSigningRotation"));
    if (!run.can({ type: "sign", guarded, signers: 1, rotation }))
      return yield* new ReleaseRefused({ message: guarded ? "signing needs the reviewed plan of this attempt" : `signing needs the protected keystore and ${KEYSTORE_PASSWORD}` });
    if (plan.attempt !== run.state.attempt || plan.unsignedSha256 !== (yield* attempt(() => sha256File(apk))) || plan.signerSha256 !== reviewedSigner())
      return yield* new ReleaseRefused({ message: `${apk} is not the APK ${planFile} plans to sign` });
    const partial = `${out}.partial`;
    const signed = spawnSync(found.values.apksigner ?? "apksigner", [
      "sign", "--ks", keystore, "--ks-type", "PKCS12", "--ks-key-alias", label, "--ks-pass", `env:${KEYSTORE_PASSWORD}`, "--key-pass", `env:${KEYSTORE_PASSWORD}`,
      "--v4-signing-enabled", "false", "--out", partial, apk,
    ], { encoding: "utf8" });
    if (signed.status !== 0) return yield* new ReleaseRefused({ message: `apksigner could not sign ${apk}: ${(signed.stderr || signed.stdout).trim().split("\n").at(-1) ?? ""}` });
    const signer = yield* Effect.option(readApkSignerDigest(partial));
    const signers = signer._tag === "Some" ? 1 : 0;
    if (signer._tag === "Some" && signer.value !== plan.signerSha256) {
      yield* attempt(() => rmSync(partial, { force: true }));
      return yield* new ReleaseRefused({ message: `${apk} was signed by ${signer.value}, not Alpha's one key ${plan.signerSha256}` });
    }
    const state = yield* attempt(() => run.take({ type: "sign", guarded, signers, rotation }));
    yield* attempt(() => state.stage === "Signed" ? renameSync(partial, out) : rmSync(partial, { force: true }));
    return { signed: state.stage === "Signed" ? out : undefined, state };
  }),
  deliver: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", apk = "", recorded = "", to = ""] = yield* attempt(() => flags(argv, ["run", "apk", "apk-manifest", "to"]).need("run", "apk", "apk-manifest", "to"));
    const run = yield* attempt(() => runOf(file));
    if (!run.can({ type: "deliver", now: hours() })) return yield* new ReleaseRefused({ message: "no signed release waits to be delivered" });
    const verified = yield* attempt(() => recordedBlockers(recorded, undefined, true).blockers);
    if (!distributable(verified)) return yield* new ReleaseRefused({ message: `the signed build is not recorded distributable: ${JSON.stringify(verified)}` });
    const read = yield* admit(apk, run.state.number);
    return yield* attempt(() => {
      mkdirSync(to, { recursive: true });
      const target = join(to, `alpha-phone-${run.state.number}.apk`);
      copyFileSync(apk, target, constants.COPYFILE_EXCL);
      const state = run.take({ type: "deliver", now: hours() });
      const receipt = { number: state.number, attempt: state.attempt, sha256: read.sha256, sizeBytes: read.apk.bytes, deliveredAt: state.deliveredAt, expiresAt: state.deliveredAt + Channel.receiptHours };
      writeFileSync(join(to, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
      return { delivered: target, receipt, state };
    });
  }),
  qualify: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", apk = "", evidence = ""] = yield* attempt(() => flags(argv, ["run", "apk", "evidence"]).need("run", "apk", "evidence"));
    const run = yield* attempt(() => runOf(file));
    return yield* attempt(() => {
      const receipt = qaEvidenceAdmission(sha256File(apk), JSON.parse(readFileSync(evidence, "utf8")), sha256File(evidence));
      const passed = receipt.tag === "QaRecorded" && receipt.outcome === "QaPassed";
      return { receipt, state: run.take({ type: "qualify", now: hours(), passed }) };
    });
  }),
  publish: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["run", "apk", "manifest"], ["execute"]));
    const [file = "", apk = "", manifestFile = ""] = yield* attempt(() => found.need("run", "apk", "manifest"));
    const run = yield* attempt(() => runOf(file));
    const number = run.state.number;
    const read = yield* admit(apk, number);
    const manifest = yield* attempt(() => JSON.parse(readFileSync(manifestFile, "utf8")) as { readonly apkUrl?: string; readonly sha256?: string; readonly sizeBytes?: number; readonly versionCode?: number });
    if (manifest.apkUrl !== apkUrl(number) || manifest.sha256 !== read.sha256 || manifest.sizeBytes !== read.apk.bytes || manifest.versionCode !== number)
      return yield* new ReleaseRefused({ message: "the manifest does not name exactly this APK" });
    const plan = { upload: `alpha-phone-${number}.apk`, verify: apkUrl(number), then: manifestUrl() };
    if (!found.on.has("execute")) return { plan, executed: false };
    const named0 = yield* named;
    if (run.can({ type: "retainElsewhere", version: named0 })) yield* attempt(() => run.take({ type: "retainElsewhere", version: named0 }));
    const existing = (yield* listed).includes(plan.upload);
    const upload = { type: "upload" as const, now: hours(), existing, apk: read.apk };
    if (!run.can(upload)) return yield* new ReleaseRefused({ message: `the spec refuses the upload of ${number}: ${JSON.stringify(run.state)}` });
    if (!existing) yield* gh("release", "upload", channelTag, `${apk}#${plan.upload}`, repository);
    yield* attempt(() => run.take(upload));
    const served = yield* fetched(apkUrl(number));
    const exact = served.length === read.apk.bytes && sha256(served) === read.sha256;
    yield* attempt(() => run.take({ type: "verifyDownload", exact }));
    if (!exact) return yield* new ReleaseRefused({ message: "the anonymous download is not the admitted APK; the manifest is not moved" });
    const move = { type: "movePointer" as const, present: (yield* listed).includes(plan.upload), unchanged: (yield* named) === named0 };
    if (!run.can(move)) return yield* new ReleaseRefused({ message: `the manifest is not moved: ${JSON.stringify(move)} at ${JSON.stringify(run.state)}` });
    yield* gh("release", "upload", channelTag, `${manifestFile}#${channelManifest}`, "--clobber", repository);
    yield* attempt(() => run.take(move));
    const after = yield* named;
    return { plan, executed: true, state: yield* attempt(() => run.take({ type: "readBack", named: after })) };
  }),
  record: (argv: readonly string[]) => Effect.gen(function* () {
    const [file = "", manifestFile = ""] = yield* attempt(() => flags(argv, ["run", "manifest"]).need("run", "manifest"));
    const run = yield* attempt(() => runOf(file));
    return yield* attempt(() => {
      const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as { readonly versionCode?: number; readonly versionName?: string };
      if (manifest.versionCode !== run.state.number) throw new ReleaseRefused({ message: `${manifestFile} names ${manifest.versionCode}, not ${run.state.number}` });
      const state = run.take({ type: "record" });
      const lastRelease = { versionCode: state.number, versionName: manifest.versionName ?? null, recordedAt: new Date().toISOString().slice(0, 10) };
      writeFileSync(SIGNER, `${JSON.stringify({ ...signerRecord(), lastRelease }, null, 2)}\n`);
      return { lastRelease, state };
    });
  }),
  status: () => Effect.gen(function* () {
    const manifest = JSON.parse(new TextDecoder().decode(yield* fetched(manifestUrl()))) as { readonly versionCode: number; readonly apkUrl: string; readonly sha256: string; readonly sizeBytes: number };
    const served = yield* fetched(manifest.apkUrl);
    return {
      versionCode: manifest.versionCode, kept: kept(manifest.apkUrl, manifest.versionCode),
      exact: served.length === manifest.sizeBytes && sha256(served) === manifest.sha256,
    };
  }),
  pilot: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["serial", "apk", "version", "record", "stock-home"]));
    const [serial = "", file = "", version = "", out = ""] = yield* attempt(() => found.need("serial", "apk", "version", "record"));
    const read = yield* admit(file, yield* attempt(() => whole(version, "version")));
    const adb: Adb = (args) => execFileSync("adb", ["-s", serial, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 });
    const scratch = yield* attempt(() => join(dirname(resolve(out)), `.installed-${randomBytes(8).toString("hex")}.apk`));
    const path = /^package:(\/\S+\.apk)$/m.exec(yield* attempt(() => adb(["shell", "pm", "path", PACKAGE])))?.[1];
    if (path === undefined) return yield* new ReleaseRefused({ message: "Alpha is not installed on this phone" });
    const installedSigner = yield* Effect.ensuring(
      Effect.flatMap(attempt(() => adb(["pull", path, scratch])), () => readApkSignerDigest(scratch)),
      Effect.sync(() => rmSync(scratch, { force: true })),
    );
    const installed = yield* attempt(() => packageFacts(adb(["shell", "dumpsys", "package", PACKAGE])));
    const problems = apkUpdateAdmission({ installedVersionCode: installed.versionCode, installedSigner, newVersionCode: read.apk.version, newSigner: read.signer });
    if (problems.length > 0) return yield* new ReleaseRefused({ message: `the pilot update is refused: ${problems.join(", ")}` });
    const update = yield* attempt(() => pilotUpdate({ adb, serial, apk: { file, sha256: read.sha256, versionCode: read.apk.version }, stockHome: found.values["stock-home"] }));
    yield* attempt(() => writeFileSync(out, `${JSON.stringify(update, null, 2)}\n`, { flag: "wx" }));
    if (!pilotPassed(update.state)) return yield* new ReleaseRefused({ message: `the pilot update did not pass; its record is ${out}` });
    return update;
  }),
  readback: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["serial", "record", "before"]));
    const [serial = "", out = ""] = yield* attempt(() => found.need("serial", "record"));
    const adb: Adb = (args) => execFileSync("adb", ["-s", serial, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 });
    const offer = yield* publicOffer;
    const before = found.values.before === undefined ? undefined : yield* attempt(() => (JSON.parse(readFileSync(found.values.before ?? "", "utf8")) as { readonly observed: Observed }).observed);
    const read = yield* attempt(() => readBack({ adb, offer, before }));
    yield* attempt(() => writeFileSync(out, `${JSON.stringify(read, null, 2)}\n`, { flag: "wx" }));
    if (read.readback !== undefined && !read.passed) return yield* new ReleaseRefused({ message: `the phone did not update itself to ${offer.versionCode}; its record is ${out}` });
    return read;
  }),
  custody: (argv: readonly string[]) => Effect.gen(function* () {
    const found = yield* attempt(() => flags(argv, ["out", "scratch"]));
    const [out = ""] = yield* attempt(() => found.need("out"));
    const secrets = Object.fromEntries(CUSTODY_SECRETS.map((name) => [name, process.env[name] ?? ""]));
    for (const name of CUSTODY_SECRETS) delete process.env[name];
    const proof = yield* attempt(() => custodyProof({ secrets, enrolled: enrolledKeys(), scratch: found.values.scratch ?? "/dev/shm" }));
    yield* attempt(() => writeFileSync(out, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" }));
    if (!custodyProven(proof.custody)) return yield* new ReleaseRefused({ message: `the protected keys are not the enrolled ones; the proof is ${out}` });
    return proof;
  }),
} as const;

/** The phone's adb shell, for one serial: a command's output, or a thrown failure. */
export type Adb = (args: readonly string[]) => string;

const HOME_ROLE = "android.app.role.HOME";
const component = /^[A-Za-z][\w.]*\/[\w.$]+$/;
const WALK = 'find . -type f ! -path "./cache/*" ! -path "./code_cache/*" -exec sha256sum {} + ; echo "READBACK_EXIT=$?"';
const AGENT_RUNNING = /Detached agent health check passed|adopting it \(no relaunch\)|Agent health restored|Detached agent health restored/;
const AGENT_REFUSED = /Private IPC recovery refused/;

/** What dumpsys says of the installed package: its version and the identity an in-place update keeps. */
export function packageFacts(dump: string) {
  const field = (name: string) => new RegExp(`${name}=([^\\s]+)`).exec(dump)?.[1];
  return { versionCode: Number(field("versionCode") ?? Number.NaN), identity: { uid: field("userId") ?? "", firstInstall: field("firstInstallTime") ?? "" } };
}

const quiet = (adb: Adb, args: readonly string[]) => { try { return adb(args); } catch (failure) { return failure instanceof Error ? failure.message : String(failure); } };

/** Who holds Home for `user`, as the pilot spec names it. */
function homeOf(adb: Adb, user: string): { readonly home: Pilot.Home; readonly holders: readonly string[]; readonly activity: string } {
  const holders = adb(["shell", "cmd", "role", "get-role-holders", "--user", user, HOME_ROLE]).trim().split(/[;\s]+/).filter(Boolean).sort();
  const activity = adb(["shell", "cmd", "package", "resolve-activity", "--user", user, "--brief", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.HOME"]).trim().split(/\r?\n/).at(-1)?.trim() ?? "";
  const [holder] = holders;
  const single = holders.length === 1 && holder !== undefined && activity.startsWith(`${holder}/`);
  return { home: !single ? "SplitHome" : holder === PACKAGE ? "AlphaHome" : "StockHome", holders, activity };
}

/** A stock Home to hand Home to while Alpha is replaced: the one asked for, or the only one installed. */
function stockHomeOf(adb: Adb, user: string, asked: string | undefined) {
  const listed = adb(["shell", "cmd", "package", "query-activities", "--brief", "--user", user, "-a", "android.intent.action.MAIN", "-c", "android.intent.category.HOME"]);
  const candidates = [...new Set(listed.split(/\r?\n/).map((line) => line.trim()).filter((line) =>
    component.test(line) && !line.startsWith(`${PACKAGE}/`) && !/^com\.android\.settings\/.*FallbackHome$/.test(line)))];
  const stock = asked ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (stock === undefined || !candidates.includes(stock)) throw new ReleaseRefused({ message: `Alpha holds Home; pass --stock-home with one of ${JSON.stringify(candidates)}` });
  return stock;
}

/** Alpha's own processes, its integrity export's aside. */
function running(adb: Adb) {
  return adb(["shell", "ps", "-A", "-o", "PID,NAME"]).split(/\r?\n/).slice(1).map((row) => row.trim().split(/\s+/)[1] ?? "")
    .filter((name) => name === PACKAGE || (name.startsWith(`${PACKAGE}:`) && name !== `${PACKAGE}:integrity`));
}

/** Starts Alpha and reads the resident agent's own log until it reports running, refusing, or neither. */
function startedAgent(adb: Adb, user: string, attempts: number): Pilot.Agent {
  const since = adb(["shell", "date", "+%s"]).trim();
  adb(["shell", "am", "start", "-W", "--user", user, "-n", `${PACKAGE}/.MainActivity`]);
  for (let tried = 0; tried < attempts; tried++) {
    const log = adb(["shell", "logcat", "-d", "-v", "epoch", "-T", `${since}.000`, "-s", "ElizaAgent:V"]);
    if (AGENT_REFUSED.test(log)) return "RefusedStart";
    if (AGENT_RUNNING.test(log)) return "Running";
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }
  return running(adb).includes(PACKAGE) && !/ElizaAgentService/.test(adb(["shell", "dumpsys", "activity", "services", PACKAGE])) ? "NotVerified" : "NotRunning";
}

/** Claims the phone named by `serial` for one run, until the returned release is called. */
function claimed(locks: string, serial: string) {
  mkdirSync(locks, { recursive: true, mode: 0o700 });
  const lock = join(locks, `${sha256(new TextEncoder().encode(serial))}.lock`);
  try { writeFileSync(lock, `${process.pid}\n`, { flag: "wx" }); }
  catch { throw new ReleaseRefused({ message: `another pilot run holds this phone (${lock})` }); }
  return () => rmSync(lock, { force: true });
}

interface PilotRequest {
  readonly adb: Adb;
  readonly serial: string;
  readonly apk: { readonly file: string; readonly sha256: string; readonly versionCode: number };
  readonly stockHome?: string | undefined;
  readonly locks?: string;
  readonly agentAttempts?: number;
}

/**
 * One pilot update of the phone `adb` reaches, every step taken through the pilot spec's rules: it claims the phone,
 * hands Home to the stock launcher while Alpha holds it, reads Alpha's data, installs in place, reads it back,
 * restores Home and starts the agent only after a clean result. Its record says what each step found.
 */
export function pilotUpdate({ adb, serial, apk, stockHome, locks = PILOT_LOCKS, agentAttempts = 150 }: PilotRequest) {
  const release = claimed(locks, serial);
  let state = Pilot.initial;
  const taken: Pilot.Event[] = [];
  const failures: string[] = [];
  const can = (event: Pilot.Event) => Pilot.enabled(state, event);
  const take = (event: Pilot.Event) => {
    if (!can(event)) throw new ReleaseRefused({ message: `the pilot spec refuses ${JSON.stringify(event)} from ${JSON.stringify(state)}` });
    state = Pilot.step(state, event);
    taken.push(event);
  };
  const failed = (failure: unknown) => failures.push(failure instanceof Error ? failure.message : String(failure));
  const nonce = randomBytes(32).toString("hex");
  const inventory = () => readbackInventory(
    quiet(adb, ["shell", "run-as", PACKAGE, "sh", "-c", `'${WALK}'`]),
    quiet(adb, Effect.runSync(integrityQuery(`${PACKAGE}.integrity`, nonce))),
  );
  let receipt: ReturnType<typeof apkUpdateReceipt> | undefined;
  try {
    const user = adb(["shell", "am", "get-current-user"]).trim();
    const original = homeOf(adb, user);
    const observe = () => { const now = homeOf(adb, user).home; if (can({ type: "observeHome", home: now })) take({ type: "observeHome", home: now }); };
    take({ type: "claim", alphaHome: original.home === "AlphaHome" });
    const before = packageFacts(adb(["shell", "dumpsys", "package", PACKAGE]));
    try {
      if (original.home === "AlphaHome") {
        const stock = stockHomeOf(adb, user, stockHome);
        try {
          adb(["shell", "cmd", "role", "add-role-holder", "--user", user, HOME_ROLE, stock.split("/")[0] ?? ""]);
          adb(["shell", "cmd", "package", "set-home-activity", "--user", user, stock]);
        } finally { take({ type: "handOff", confirmed: homeOf(adb, user).home === "StockHome" }); }
      }
      observe();
      adb(["shell", "am", "force-stop", PACKAGE]);
      if (running(adb).length > 0) throw new ReleaseRefused({ message: "Alpha kept running before its data was read" });
      const dataBefore = inventory();
      const evidence: Pilot.Evidence = dataBefore.tag === "InventoryRead" ? "Inventory" : dataBefore.tag === "InventoryUnavailable" ? "PackageOnly" : "NoEvidence";
      if (!can({ type: "readBefore", evidence })) throw new ReleaseRefused({ message: `the data could not be read before installing (${evidence}, Home ${homeOf(adb, user).home})` });
      take({ type: "readBefore", evidence });
      observe();
      if (!can({ type: "dispatch" })) throw new ReleaseRefused({ message: "the stock launcher no longer holds Home; nothing was installed" });
      take({ type: "dispatch" });
      let returned = true;
      try { adb(["install", "-r", apk.file]); } catch (failure) { returned = false; failed(failure); }
      take({ type: "installerReturned", returned });
      if (returned) {
        observe();
        const after = packageFacts(adb(["shell", "dumpsys", "package", PACKAGE]));
        const path = /^package:(\/\S+\.apk)$/m.exec(adb(["shell", "pm", "path", PACKAGE]))?.[1] ?? "";
        const installed = /^([0-9a-f]{64})\b/.exec(adb(["shell", "sha256sum", path]).trim())?.[1] ?? "";
        receipt = apkUpdateReceipt({
          candidate: { sha256: apk.sha256, versionCode: apk.versionCode }, installed: { sha256: installed, versionCode: after.versionCode },
          before: before.identity, after: after.identity, dataBefore, dataAfter: evidence === "Inventory" ? inventory() : dataBefore,
        });
        take({ type: "verifyReadback", matches: receipt.passed });
      }
    } catch (failure) {
      failed(failure);
      if (can({ type: "stopEarly" })) take({ type: "stopEarly" });
      if (can({ type: "installerReturned", returned: false })) take({ type: "installerReturned", returned: false });
      if (can({ type: "verifyReadback", matches: false })) take({ type: "verifyReadback", matches: false });
    }
    quiet(adb, ["shell", "am", "force-stop", PACKAGE]);
    take({ type: "finishStop", stopped: running(adb).length === 0 });
    if (state.moved) {
      quiet(adb, ["shell", "cmd", "role", "add-role-holder", "--user", user, HOME_ROLE, PACKAGE]);
      quiet(adb, ["shell", "cmd", "package", "set-home-activity", "--user", user, original.activity]);
    }
    const restored = homeOf(adb, user);
    take({ type: "restoreHome", restored: restored.home === "AlphaHome" && restored.activity === original.activity, home: restored.home });
    if (can({ type: "startAgent", agent: "Running" })) take({ type: "startAgent", agent: startedAgent(adb, user, agentAttempts) });
    else take({ type: "skipStart" });
    take({ type: "recordRun" });
    take({ type: "release" });
  } finally {
    release();
  }
  return { state, taken, receipt, failures };
}

/** The launcher release the channel offers anyone now, its APK's bytes read back as the offer describes them. */
export interface Offer { readonly versionCode: number; readonly sha256: string; readonly sizeBytes: number; readonly apkUrl: string; readonly signerSha256: string }

const publicOffer = Effect.gen(function* () {
  const offer = JSON.parse(new TextDecoder().decode(yield* fetched(manifestUrl()))) as Offer;
  const served = yield* fetched(offer.apkUrl);
  if (!kept(offer.apkUrl, offer.versionCode) || offer.signerSha256 !== reviewedSigner() || served.length !== offer.sizeBytes || sha256(served) !== offer.sha256)
    return yield* new ReleaseRefused({ message: `the channel's offer is not an APK of Alpha's one key served exactly as described: ${JSON.stringify(offer)}` });
  return offer;
});

/** One read of the phone and the offer, made without changing either. */
export interface Observed {
  readonly offer: Offer;
  readonly versionCode: number;
  readonly identity: { readonly uid: string; readonly firstInstall: string };
  readonly initiator: string;
  readonly sha256: string;
  readonly home: { readonly holders: readonly string[]; readonly activity: string };
}

/**
 * Reads, by cable and without changing anything, what a phone runs and who holds its Home, beside the offer. Given
 * the read made before the phone took the offer, it also judges whether the phone updated itself.
 */
export function readBack({ adb, offer, before }: { readonly adb: Adb; readonly offer: Offer; readonly before?: Observed | undefined }) {
  const user = adb(["shell", "am", "get-current-user"]).trim();
  const dump = adb(["shell", "dumpsys", "package", PACKAGE]);
  const facts = packageFacts(dump);
  const path = /^package:(\/\S+\.apk)$/m.exec(adb(["shell", "pm", "path", PACKAGE]))?.[1] ?? "";
  const home = homeOf(adb, user);
  const observed: Observed = {
    offer, versionCode: facts.versionCode, identity: facts.identity,
    initiator: /installInitiatingPackageName=([^\s,}]+)/.exec(dump)?.[1] ?? "",
    sha256: path === "" ? "" : /^([0-9a-f]{64})\b/.exec(adb(["shell", "sha256sum", path]).trim())?.[1] ?? "",
    home: { holders: home.holders, activity: home.activity },
  };
  if (before === undefined) return { observed, readback: undefined, passed: false };
  const readback: Readback = {
    sameInstall: observed.identity.uid === before.identity.uid && observed.identity.firstInstall === before.identity.firstInstall && observed.identity.uid !== "",
    advanced: before.versionCode < offer.versionCode && observed.versionCode === offer.versionCode,
    exact: observed.sha256 === offer.sha256,
    selfInitiated: observed.initiator === PACKAGE,
    homeKept: home.home === "AlphaHome" && JSON.stringify(observed.home) === JSON.stringify(before.home),
    offerKept: JSON.stringify(offer) === JSON.stringify(before.offer),
  };
  return { observed, readback, passed: updatedItself(readback) };
}

const OS_CERTIFICATES = ["releasekey", "platform", "shared", "media", "networkstack", "sdk_sandbox", "bluetooth", "nfc", "apex"] as const;
const AVB_KEYS = ["apex_payload", "avb"] as const;
const KEY_ARCHIVE = new Set(["fingerprints.json", "avb_pkmd.bin", ...OS_CERTIFICATES.flatMap((name) => [`${name}.pk8.enc`, `${name}.x509.pem`]),
  ...AVB_KEYS.flatMap((name) => [`${name}.avbpubkey`, `${name}.pem.enc`, `${name}.pub.pem`])]);
const CUSTODY_SECRETS = ["ALPHA_OS_RELEASE_KEYS_PART1_B64", "ALPHA_OS_RELEASE_KEYS_PART2_B64", "ALPHA_OS_RELEASE_KEYS_PASSPHRASE", "ALPHA_APP_RELEASE_KEYSTORE_B64", KEYSTORE_PASSWORD] as const;
const KEYSTORE_ALIAS = "alpha-release";

/** The identities Alpha enrolled: the expected digests, the app signer, each key's size, and the directory of committed public identities. */
export interface Enrolled {
  readonly certificates: Readonly<Record<string, string>>;
  readonly avbSha256: string;
  readonly appSigner: string;
  readonly bits: Readonly<Record<string, number>>;
  readonly publicDirectory: string;
}

const enrolledKeys = (): Enrolled => {
  const expected = JSON.parse(readFileSync(join(app, "aosp/signing/os-custody-expected.json"), "utf8")) as {
    readonly schemaVersion?: number; readonly osCertificateSha256: Record<string, string>; readonly avbPublicKeySha256: string; readonly appSignerSha256: string;
  };
  const manifest = JSON.parse(readFileSync(join(app, "aosp/signing/alpha-key-manifest.json"), "utf8")) as { readonly keys: readonly { readonly name: string; readonly bits: number }[] };
  if (expected.schemaVersion !== 1 || Object.keys(expected.osCertificateSha256).length !== OS_CERTIFICATES.length || expected.appSignerSha256 !== reviewedSigner())
    throw new ReleaseRefused({ message: "the custody record does not match Alpha's enrolled keys" });
  return { certificates: expected.osCertificateSha256, avbSha256: expected.avbPublicKeySha256, appSigner: expected.appSignerSha256,
    bits: Object.fromEntries(manifest.keys.map((key) => [key.name, key.bits])), publicDirectory: join(app, "aosp/signing/public") };
};

const refuse = (what: string): never => { throw new ReleaseRefused({ message: `release custody: ${what}` }); };

/** openssl over `input`, the password only in its environment. */
const openssl = (args: readonly string[], input?: Uint8Array, password?: string) => execFileSync("openssl", args, {
  ...(input === undefined ? {} : { input }), timeout: 30_000, maxBuffer: 1 << 20, stdio: ["pipe", "pipe", "pipe"],
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin", LC_ALL: "C", ...(password === undefined ? {} : { ALPHA_PROOF_PASSWORD: password }) },
});

/** The key archive's files, each named once, regular and small; anything else refuses it. */
function keyArchive(compressed: Buffer) {
  const bytes = gunzipSync(compressed, { maxOutputLength: 512 * 1024 });
  const files = new Map<string, Buffer>();
  for (let at = 0; at + 512 <= bytes.length;) {
    const header = bytes.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (from: number, to: number) => header.subarray(from, to).toString("utf8").replace(/\0.*$/s, "").trim();
    const [name, size, type] = [field(0, 100), Number.parseInt(field(124, 136) || "0", 8), String.fromCharCode(header[156] ?? 0)];
    const body = bytes.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
    if (type === "x" || type === "g") continue;
    if (!KEY_ARCHIVE.has(name) || files.has(name) || (type !== "0" && type !== "\0") || size <= 0 || size > 32 * 1024 || body.length !== size) refuse(`the key archive holds an unexpected entry ${name}`);
    files.set(name, body);
  }
  if (files.size !== KEY_ARCHIVE.size) refuse("the key archive lacks an entry");
  return files;
}

const decoded = (text: string) => {
  const bytes = Buffer.from(text, "base64");
  if (text.length === 0 || text.length > 48 * 1024 || bytes.toString("base64").replace(/=+$/, "") !== text.replace(/\s+/g, "").replace(/=+$/, "")) refuse("a secret is not base64");
  return bytes;
};

const publicOf = (privateKey: Buffer) => { openssl(["pkey", "-check", "-noout"], privateKey); return openssl(["pkey", "-pubout", "-outform", "DER"], privateKey); };
const identityOf = (certificate: Buffer) => ({
  publicKey: openssl(["pkey", "-pubin", "-outform", "DER"], openssl(["x509", "-pubkey", "-noout"], certificate)),
  sha256: sha256(openssl(["x509", "-outform", "DER"], certificate)),
});

const inverse = (value: bigint, modulus: bigint) => {
  let [a, b, x, y] = [value % modulus, modulus, 1n, 0n];
  while (b !== 0n) { const q = a / b; [a, b, x, y] = [b, a - q * b, y, x - q * y]; }
  return ((x % modulus) + modulus) % modulus;
};
const bigEndian = (value: bigint, bytes: number) => Buffer.from(value.toString(16).padStart(bytes * 2, "0"), "hex");

/** AVB's public key metadata for an RSA key of `bits`: its header, then n and R squared modulo n. */
export function avbMetadata(publicKey: Buffer, bits: number) {
  if (!/^Exponent: 65537 \(0x10001\)$/m.test(openssl(["rsa", "-pubin", "-inform", "DER", "-text", "-noout"], publicKey).toString())) refuse("a verified-boot key's exponent is not 65537");
  const n = BigInt(`0x${openssl(["rsa", "-pubin", "-inform", "DER", "-modulus", "-noout"], publicKey).toString().trim().replace(/^Modulus=/, "")}`);
  if (n.toString(2).length !== bits || ![2048, 4096, 8192].includes(bits)) refuse("a verified-boot key has another size than its manifest");
  const word = 1n << 32n;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(bits, 0);
  header.writeUInt32BE(Number((word - inverse(n, word)) % word), 4);
  return Buffer.concat([header, bigEndian(n, bits / 8), bigEndian((1n << BigInt(2 * bits)) % n, bits / 8)]);
}

/**
 * Proves the protected keys are the enrolled ones: each private key pairs with its public identity, which is the one
 * Alpha enrolled and committed, none is a test key, and no two are the same. Secrets stay in memory and in `scratch`,
 * a memory-backed directory removed at the end; the proof records only public digests.
 */
export function custodyProof({ secrets, enrolled, scratch }: { readonly secrets: Readonly<Record<string, string>>; readonly enrolled: Enrolled; readonly scratch: string }) {
  const [part1 = "", part2 = "", passphrase = "", keystore = "", password = ""] = CUSTODY_SECRETS.map((name) => secrets[name] ?? "");
  if (passphrase === "" || password === "") refuse("a key password is missing");
  const files = keyArchive(Buffer.concat([decoded(part1), decoded(part2)]));
  const fingerprints = JSON.parse((files.get("fingerprints.json") ?? Buffer.alloc(0)).toString("utf8")) as {
    readonly schemaVersion?: number; readonly testKeys?: boolean; readonly keys?: readonly { readonly name: string; readonly kind?: string; readonly certificateSha256?: string; readonly avbPublicKeySha256?: string }[];
  };
  const entries = new Map((fingerprints.keys ?? []).map((key) => [key.name, key]));
  if (entries.size !== (fingerprints.keys ?? []).length) refuse("fingerprints.json repeats a key");
  const committed = (name: string) => readFileSync(join(enrolled.publicDirectory, name));
  const directory = realpathSync(scratch);
  const stage = join(directory, `alpha-release-proof-${randomBytes(8).toString("hex")}`);
  mkdirSync(stage, { mode: 0o700 });
  const keys: { readonly name: string; readonly publicKey: Buffer; readonly enrolled: boolean }[] = [];
  try {
    const decrypted = (file: string, encoding: "DER" | "PEM") => {
      const encrypted = join(stage, file);
      writeFileSync(encrypted, files.get(file) ?? Buffer.alloc(0), { mode: 0o600 });
      return publicOf(openssl(["pkcs8", "-inform", encoding, "-in", encrypted, "-passin", "env:ALPHA_PROOF_PASSWORD"], undefined, passphrase));
    };
    for (const name of OS_CERTIFICATES) {
      const certificate = files.get(`${name}.x509.pem`) ?? Buffer.alloc(0);
      const identity = identityOf(certificate);
      const entry = entries.get(name);
      const paired = decrypted(`${name}.pk8.enc`, "DER").equals(identity.publicKey);
      keys.push({ name, publicKey: identity.publicKey, enrolled: paired && entry?.kind === "x509-pk8" && identity.sha256 === enrolled.certificates[name]
        && identity.sha256 === entry.certificateSha256 && identityOf(committed(`${name}.x509.pem`)).sha256 === identity.sha256 });
    }
    for (const name of AVB_KEYS) {
      const publicKey = openssl(["pkey", "-pubin", "-outform", "DER"], files.get(`${name}.pub.pem`));
      const metadata = avbMetadata(publicKey, enrolled.bits[name] ?? 0);
      const entry = entries.get(name);
      const pairs = decrypted(`${name}.pem.enc`, "PEM").equals(publicKey) && metadata.equals(files.get(`${name}.avbpubkey`) ?? Buffer.alloc(0));
      const known = entry?.kind === "avb-rsa" && sha256(metadata) === entry.avbPublicKeySha256
        && (name === "avb" ? metadata.equals(files.get("avb_pkmd.bin") ?? Buffer.alloc(0)) && sha256(metadata) === enrolled.avbSha256 && metadata.equals(committed("avb_pkmd.bin"))
          : metadata.equals(committed("apex_payload.avbpubkey")));
      keys.push({ name, publicKey, enrolled: pairs && known });
    }
    const store = join(stage, "app.p12");
    writeFileSync(store, decoded(keystore), { mode: 0o600 });
    const read = (...more: string[]) => openssl(["pkcs12", "-in", store, "-passin", "env:ALPHA_PROOF_PASSWORD", ...more], undefined, password);
    const [certificate, privateKey] = [read("-clcerts", "-nokeys"), read("-nocerts", "-noenc")];
    const alias = new RegExp(`^\\s*friendlyName: ${KEYSTORE_ALIAS}\\s*$`, "m");
    const single = alias.test(certificate.toString()) && alias.test(privateKey.toString())
      && certificate.toString().split("-----BEGIN CERTIFICATE-----").length === 2 && privateKey.toString().split("-----BEGIN PRIVATE KEY-----").length === 2;
    const app = identityOf(certificate);
    const appEntry = entries.get("alphaphone_app");
    keys.push({ name: "alphaphone_app", publicKey: app.publicKey, enrolled: single && app.sha256 === enrolled.appSigner
      && (appEntry === undefined || appEntry.certificateSha256 === enrolled.appSigner)
      && publicOf(privateKey).equals(app.publicKey) && identityOf(committed("alphaphone_app.x509.pem")).sha256 === app.sha256 });
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  const custody: Custody = {
    pairs: keys.length, matching: keys.filter((key) => key.enrolled).length,
    distinct: new Set(keys.map((key) => sha256(key.publicKey))).size === keys.length,
    testKeys: fingerprints.schemaVersion !== 1 || fingerprints.testKeys !== false,
  };
  return { custody, keys: keys.map((key) => ({ name: key.name, publicKeySha256: sha256(key.publicKey), enrolled: key.enrolled })), signedImageProduced: false, deviceQualified: false };
}

/** Dispatches one named command from `table` over Node's services. */
export function dispatch(table: Readonly<Record<string, (argv: readonly string[]) => Effect.Effect<unknown, unknown, NodeServices.NodeServices>>>, argv: readonly string[], usage: (message: string) => unknown) {
  return Effect.suspend(() => {
    const [command = "", ...rest] = argv[0] === "--" ? argv.slice(1) : argv;
    const handler = Object.hasOwn(table, command) ? table[command] : undefined;
    if (handler === undefined) return Effect.fail(usage(command === "" ? "a command is required" : `unknown command ${command}`));
    return handler(rest);
  }).pipe(Effect.provide(NodeServices.layer));
}

/** Runs an Effect CLI program, printing JSON on success and diagnostics on failure. */
export async function runCli(program: Effect.Effect<unknown, unknown, never>, usage: string, isUsage: (error: unknown) => boolean) {
  const outcome = await Effect.runPromiseExit(program);
  if (outcome._tag === "Success") process.stdout.write(`${JSON.stringify(outcome.value, null, 2)}\n`);
  else {
    const reason = outcome.cause.reasons[0];
    const failure: unknown = reason?._tag === "Fail" ? reason.error : outcome.cause;
    const detail = typeof failure === "object" && failure !== null && "reason" in failure && typeof failure.reason === "string" ? failure.reason
      : failure instanceof Error ? failure.message : String(failure);
    process.stderr.write(`${isUsage(failure) ? `${detail}\n\n${usage}` : detail}\n`);
    process.exitCode = isUsage(failure) ? 2 : 1;
  }
}

/** One `pnpm release` command, as an effect over Node's services. */
export const release = (argv: readonly string[]) => dispatch(commands, argv, (message) => new UsageError({ message }));

if (import.meta.main) await runCli(release(process.argv.slice(2)), USAGE, (failure) => failure instanceof UsageError);
