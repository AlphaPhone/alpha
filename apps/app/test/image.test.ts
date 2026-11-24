import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { alphaPrivileged, firstBootGrants } from "../gen/app__image.ts";
import { aosp, otaArguments, place } from "../scripts/aosp.ts";
import { inventory, licences } from "../scripts/licences.ts";
import { type Adb, type Offer, kept, pilotUpdate, readBack, release } from "../scripts/release.ts";

const scratches: string[] = [];
afterEach(() => { for (const directory of scratches.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const scratch = () => { const directory = mkdtempSync(join(tmpdir(), "alpha-release-")); scratches.push(directory); return directory; };
const write = (directory: string, name: string, value: unknown) => { const file = join(directory, name); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); return file; };
const digest = (seed: string) => createHash("sha256").update(seed).digest("hex");

/** What a `pnpm aosp` command answered: its result, or the tag and words of the failure it ended with. */
async function run(...argv: string[]) {
  const exit = await Effect.runPromiseExit(aosp(argv));
  if (Exit.isSuccess(exit)) return { ok: true as const, value: exit.value as Record<string, unknown> };
  const failure = Cause.squash(exit.cause) as { _tag?: string; message?: string; reason?: string; problems?: readonly string[] };
  return { ok: false as const, tag: failure._tag, said: failure.reason ?? failure.message ?? "", problems: failure.problems };
}

const descriptor = (overrides: Record<string, unknown>) => ({
  schemaVersion: 1, brand: "alpha", moduleName: "AlphaPhone", packageName: "ai.alphacompute.alphaphone",
  apkSha256: digest("launcher"), certificateSha256: digest("signer"), ...overrides,
});

describe("Stage Alpha into an image (spec/app/image/index.md, \"Story: Stage Alpha into an image\")", () => {
  const stage = (...argv: string[]) => run("stage", "--apk", "launcher.apk", "--aosp-source", "aosp", "--output", "staged", ...argv);

  it("refuses an unreviewed or half-configured stage, naming every problem, before it reads any APK or source", async () => {
    // spec/app/image/index.md, "A production stage, and every listener image, needs a reviewed launcher descriptor and a product with no field unset": the Cuttlefish product's host packages are still UNSET.
    expect(await stage("--target", "cuttlefish")).toMatchObject({ ok: false, tag: "StageRefused", problems: ["NoReviewedDescriptor", "ProductIncomplete"] });
    // spec/app/image/index.md, "Owner telephony is for a development stage of either target, and never for a listener image"
    expect(await stage("--target", "cuttlefish", "--owner-telephony", "--descriptor", "reviewed.json")).toMatchObject({ ok: false, problems: ["ProductIncomplete", "OwnerTelephonyOutsideDevelopment"] });
    // spec/app/image/index.md, "A listener image is a Pixel 10a stage with the listener, its qualification record and the chip, ops, protected power and Sense policy patches"
    expect(await stage("--target", "pixel10a", "--factory-image", "factory.zip", "--development", "--listener-apk", "sense.apk", "--listener-qualification", "q.json", "--patch", "chip"))
      .toMatchObject({ ok: false, problems: ["NoReviewedDescriptor", "ListenerImageIncomplete"] });
    // spec/app/image/index.md, "The Sense policy patch belongs only to a listener image, and the protected power and generic assist patches never come together"
    expect(await stage("--target", "pixel10a", "--factory-image", "factory.zip", "--development", "--patch", "protected-power", "--patch", "assist", "--patch", "sense-policy"))
      .toMatchObject({ ok: false, problems: ["SensePolicyWithoutAListenerImage", "PowerAndAssistTogether"] });
    expect(await stage("--target", "pixel10a", "--development")).toMatchObject({ ok: false, tag: "UsageError", said: "--target pixel10a needs --factory-image" });
  });

  it("stages Alpha's launcher only with Alpha's first-boot grants and its two privileged permissions, or none", async () => {
    const directory = scratch();
    const grants = firstBootGrants;
    const stageWith = (overrides: Record<string, unknown>) => run("stage", "--target", "cuttlefish", "--development", "--apk", "launcher.apk", "--aosp-source", "aosp", "--output", "staged",
      "--descriptor", write(directory, `${Object.keys(overrides).join("-")}.json`, descriptor(overrides)));
    // spec/app/image/index.md, "The first-boot grants are exactly the startup walkthrough's, Contacts and phone state, each revocable, and never messages, calls or call history"
    expect(await stageWith({ defaultPermissions: [...grants, "android.permission.READ_SMS"] }))
      .toMatchObject({ ok: false, tag: "StageRefused", problems: [expect.stringContaining("first-boot grants")] });
    // spec/app/image/index.md, "On an image the launcher holds exactly two privileged permissions, its phone's own identifiers and the install of its own updates, or none": the identifiers alone are not Alpha's set.
    expect(await stageWith({ defaultPermissions: grants, privilegedPermissions: alphaPrivileged.slice(0, 1) }))
      .toMatchObject({ ok: false, tag: "StageRefused", problems: [expect.stringContaining("privileged permissions")] });
    expect(await stageWith({ packageName: "com.example.launcher", defaultPermissions: grants }))
      .toMatchObject({ ok: false, tag: "StageRefused", problems: [expect.stringContaining("not Alpha's launcher")] });
  });
});

describe("Update an Alpha Pixel by cable, and get back (spec/app/image/index.md, \"Story: Update an Alpha Pixel by cable, and get back\"; spec/release/os.md, \"Story: Update an image by hand\")", () => {
  const channel = JSON.parse(readFileSync(place("aosp/pixel10a-ota-channel.json"), "utf8")) as { otaCertificateSha256: string; avbPublicKeySha256: string };
  const fingerprint = (build: number) => `Alpha/alpha_stallion_phone/stallion:17/CP2A.${build}/${build}:user/release-keys`;
  const release = (build: number, rollbackIndex: number) => ({
    schema: 1, kind: "aosp-release-compatibility", product: "alpha_stallion_phone", device: "stallion", channel: "stable",
    build: { fingerprint: fingerprint(build), securityPatch: `2026-${String(build).padStart(2, "0")}-05`, dateUtc: String(1790000000 + build) },
    artifacts: { signedTargetFiles: { file: `signed-target_files-${build}.zip`, sha256: digest(`target files ${build}`) }, ota: { file: `ota-${build}.zip`, sha256: digest(`ota ${build}`), type: "full", incrementalFrom: null } },
    verifiedBoot: { publicKeySha256: channel.avbPublicKeySha256, rollbackIndexes: [{ partition: "vbmeta", location: 0, index: String(rollbackIndex) }] },
    payload: { metadata: { "post-build": fingerprint(build), "post-timestamp": String(1790000000 + build) } },
    certificates: { releasekey: channel.otaCertificateSha256 },
    problems: [], imageBooted: false, signedUpdateApplied: false, releaseQualified: false, deviceAcceptanceVerified: false,
  });

  it("admits a newer signed release of Alpha's one channel and refuses one that would lower the rollback index", async () => {
    const directory = scratch();
    const installed = write(directory, "installed.json", release(9, 3));
    // spec/app/image/index.md, "Alpha has one update channel, stable, for alpha_stallion_phone on stallion, and refuses downgrades": the check reads Alpha's channel without being told to.
    expect(await run("ota", "check", "--from", installed, "--to", write(directory, "candidate.json", release(10, 3))))
      .toMatchObject({ ok: true, value: { admitted: true, executed: false } });
    expect(await run("ota", "check", "--from", installed, "--to", write(directory, "lower.json", release(10, 2))))
      .toMatchObject({ ok: false, tag: "OtaRefused", said: "A rollback index decreased or disappeared" });
    expect(await run("ota", "check", "--from", installed, "--to", write(directory, "foreign.json", { ...release(10, 3), product: "alpha_cf_x86_64_phone" })))
      .toMatchObject({ ok: false, tag: "SigningRefused", said: "The release belongs to another channel, product, or device" });
  });

  it("gives each operator command Alpha's channel and stock source lock only where it reads them", () => {
    // spec/app/image/index.md, "Each operator command reads Alpha's channel and the stallion stock source lock where it reads one and the operator named none"
    const named = (argv: string[]) => [argv.includes("--channel"), argv.includes("--source-lock")];
    expect(["check", "apply", "status", "fallback", "stock-archive", "verify-stock", "retain-known-good"].map((command) => named(otaArguments([command]))))
      .toEqual([[true, false], [true, false], [false, false], [false, false], [true, true], [false, true], [true, false]]);
    expect(otaArguments(["check", "--channel", "other.json"])).toEqual(["check", "--channel", "other.json"]);
  });

  it("keeps the image's updater off until every gate passed, and records a drill only once it was run (spec/release/os.md, \"Story: Enrol the image's updater\"; spec/release/os.md, \"Story: Run the drills\")", async () => {
    const directory = scratch();
    const os = (...argv: string[]) => run("os", "--ledger", join(directory, "os.json"), ...argv);
    // spec/release/os.md, "A drill's result is recorded by the release owner only once that drill has been run, and a failed drill takes back physical recovery and turns the updater off"
    expect(await os("drill", "--drill", "signed-update", "--passed")).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    // spec/release/os.md, "Enrolment is staged only with exactly the pinned profile, and staged disabled"
    expect(await os("stage")).toMatchObject({ ok: true, value: { staged: true, enabled: false } });
    // spec/release/os.md, "The updater is enabled only when every gate has passed"
    expect(await os("enable")).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    // spec/release/os.md, "Two release records are compatible only from the installed build to a newer one of the pinned product, device and keys that wipes nothing"
    expect(await os("check", "--from", "stock", "--to", write(directory, "wiping.json", { ...release(10, 3), payload: { metadata: { "ota-wipe": "yes" } } }))).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    expect(await os("check", "--from", "stock", "--to", write(directory, "candidate.json", release(10, 3)))).toMatchObject({ ok: true, value: { apply: "Checked" } });
    // spec/release/os.md, "A checked update is applied with a journal, can be interrupted, and resumes from the journal"
    for (const step of ["start", "interrupt", "resume", "finish"]) expect((await os(step)).ok).toBe(true);
    expect(await os("drill", "--drill", "interrupted-update", "--passed")).toMatchObject({ ok: true, value: { drills: { signedUpdate: "NotRun", interruptedUpdate: "Passed" } } });
    // spec/release/os.md, "A gate passes once, and physical recovery only after all four drills passed"
    expect(await os("pass", "--gate", "physical-recovery")).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    // spec/release/os.md, "A phone falls back, when steady or interrupted, to the pinned stock factory image or to the known-good release": only the pinned factory archive is flashed.
    writeFileSync(join(directory, "factory.zip"), "another archive");
    expect(await os("fallback", "--to", "stock", "--image", join(directory, "factory.zip"))).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    expect(await os("retain-known-good")).toMatchObject({ ok: true, value: { knownGood: 1790000010 } });
    expect(await os("fallback", "--to", "known-good")).toMatchObject({ ok: true, value: { seen: { rollbackRan: true } } });
  });
});

describe("Ship what Alpha is built from, with its licences (spec/app/image/licences.md, \"Story: Ship what Alpha is built from, with its licences\")", () => {
  it("lists every shipped part with its licence and flags, keeps the committed notices current, and writes the same inventory as a bill of materials", () => {
    const found = inventory();
    const entry = (name: string) => found.notices.find((notice) => notice.name === name);
    // spec/app/image/licences.md, "An open-source licence never blocks a release; a bundled font blocks it only when its check could not run, or, on the owner's word, when it has no licence recorded"
    expect(found.fontCheck).toBe("FontResolved");
    expect(entry("Denton typeface")).toMatchObject({ license: "LicenseRef-Commercial-Font", flags: ["proprietary-licence-held-outside-repo"] });
    expect(entry("Public Sans")).toMatchObject({ license: "OFL-1.1", flags: [] });
    expect(entry("react")).toMatchObject({ license: "MIT", flags: [] });
    expect(entry("elizaOS (@elizaos/agent, @elizaos/os, @elizaos/cloud)")).toMatchObject({ license: "MIT" });
    expect(found.notices.some((notice) => notice.name.startsWith("@elizaos/") || notice.name.startsWith("@repo/"))).toBe(false);
    // spec/app/image/licences.md, "A licence identifier belongs to one family, and each family has its flags": what the Android classpath cannot name is flagged unknown, never dropped.
    expect(entry("com.google.android.gms:play-services-auth")).toMatchObject({ license: "UNKNOWN", flags: ["unknown-licence"] });
    expect(licences(["--check"])).toMatchObject({ current: true, entries: found.notices.length });
    const sbom = join(scratch(), "sbom.json");
    licences(["--sbom", sbom]);
    const bill = JSON.parse(readFileSync(sbom, "utf8")) as { bomFormat: string; components: { name: string; properties: unknown[] }[] };
    expect([bill.bomFormat, bill.components.length]).toEqual(["CycloneDX", found.notices.length]);
    expect(bill.components.find((component) => component.name === "Denton typeface")?.properties).toEqual([{ name: "alpha:licence-flag", value: "proprietary-licence-held-outside-repo" }]);
  });
});

/** What a `pnpm release` command answered: its result, or the tag and words of the failure it ended with. */
async function released(...argv: string[]) {
  const exit = await Effect.runPromiseExit(release(argv));
  if (Exit.isSuccess(exit)) return { ok: true as const, value: exit.value as Record<string, unknown> };
  const failure = Cause.squash(exit.cause) as { _tag?: string; message?: string };
  return { ok: false as const, tag: failure._tag, said: failure.message ?? "" };
}

describe("Qualify and publish a release (spec/release/index.md, \"Story: Qualify and publish a release\")", () => {
  it("names the one launcher channel, and keeps the APKs of the repository's earlier names (spec/release/index.md, \"Phones read the launcher channel from the stable release of Alpha's repository, eliza-research/alpha, known by its permanent id; APKs kept under the repository's earlier names stay valid\")", async () => {
    expect(await released("channel")).toEqual({ ok: true, value: {
      repository: "eliza-research/alpha", repositoryId: 1396333361, tag: "app-stable-alphacompute",
      manifestUrl: "https://github.com/eliza-research/alpha/releases/download/app-stable-alphacompute/alpha-update-stable.json",
    } });
    expect([
      kept("https://github.com/alphacompute/alpha/releases/download/app-stable/alpha-phone-80.apk", 80),
      kept("https://github.com/someone/alpha/releases/download/app-stable-alphacompute/alpha-phone-80.apk", 80),
      kept("https://github.com/eliza-research/alpha/releases/download/app-stable-alphacompute/alpha-phone-80.apk", 81),
    ]).toEqual([true, false, false]);
  });

  it("refuses a build its verification recorded with test mocks, and one with no row at all (spec/release/index.md, \"A build is a candidate only when its verification recorded it distributable: no test mocks, the production bundle audit passed, Alpha's one signer, the runtime packaged with its notices, an on-device voice slot, and for an image its platform certificate\")", async () => {
    const directory = scratch();
    const mocked = await released("blockers", "--apk-manifest", write(directory, "mocked.json", { apks: [{ variant: "launcher", build: "release", testMocks: true }] }));
    const empty = await released("blockers", "--apk-manifest", write(directory, "empty.json", { apks: [] }));
    expect([mocked.ok, mocked.ok ? "" : mocked.said.includes("\"mocks\":true"), empty.ok]).toEqual([false, true, false]);
  });

  it("moves nothing for an APK it cannot admit (spec/release/index.md, \"An APK is admitted to the channel only as Alpha's launcher, first signed by Alpha's one key, at the candidate's version, not debuggable, of at most 2 GiB, and with only the entries a release may hold\")", async () => {
    const directory = scratch();
    const missing = await released("publish", "--run", join(directory, "run.json"), "--apk", join(directory, "alpha-phone-122.apk"), "--manifest", write(directory, "m.json", {}), "--execute");
    expect([missing.ok, missing.tag !== "UsageError"]).toEqual([false, true]);
    expect((await released("publish", "--apk", "x", "--manifest", "y")).tag).toBe("UsageError");
  });
});

/** A verify row of an unsigned release candidate with nothing else to block it, as eliza's verification records one. */
const candidateRow = (overrides: Record<string, unknown> = {}) => ({
  mode: "release", sha256: digest("candidate"), testMocks: false, bundleAudit: "passed", signed: false, runtime: "PACKAGED", runtimeNotices: true,
  runtimeProfile: "native", voiceHost: { packaged: true, differences: [], qualified: true }, licenceBlockers: [], distributable: false, ...overrides,
});

describe("Build a candidate and sign it (spec/release/index.md, \"Story: Build a candidate\"; spec/release/index.md, \"Story: Sign a release\")", () => {
  it("numbers each candidate above the floor, mirrors it once, and signs only from the reviewed plan of its own attempt", async () => {
    const directory = scratch();
    const run = join(directory, "run.json");
    const unsigned = join(directory, "launcher-release-unsigned.apk");
    writeFileSync(unsigned, "unsigned candidate bytes");
    const verified = write(directory, "apk-manifest.json", { apks: [candidateRow()] });
    const stage = () => (JSON.parse(readFileSync(run, "utf8")) as { state: { stage: string; attempt: number; reviewed: boolean } }).state;
    // spec/release/index.md, "A build is a candidate only when its verification recorded it distributable: no test mocks, the production bundle audit passed, Alpha's one signer, the runtime packaged with its notices, an on-device voice slot, and for an image its platform certificate"
    expect(await released("candidate", "--run", run, "--number", "122", "--attempt", "1", "--apk-manifest", write(directory, "mocked.json", { apks: [candidateRow({ testMocks: true })] }))).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    // spec/release/index.md, "A candidate is built only when none is in flight, numbered by a run above every run before it, the floor and the published version"
    expect(await released("candidate", "--run", run, "--number", "74", "--attempt", "1", "--apk-manifest", verified)).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    expect(await released("candidate", "--run", run, "--number", "122", "--attempt", "1", "--apk-manifest", verified)).toMatchObject({ ok: true, value: { stage: "Built", number: 122 } });
    expect(await released("candidate", "--run", run, "--number", "123", "--attempt", "1", "--apk-manifest", verified)).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    // spec/release/index.md, "The candidate is mirrored privately, creating the object only if it is absent, or reusing one whose bytes read back the same"
    const mirror = join(directory, "private");
    expect(await released("mirror", "--run", run, "--apk", unsigned, "--to", mirror)).toMatchObject({ ok: true, value: { mirrored: join(mirror, "alpha-phone-122-unsigned.apk") } });
    // spec/release/index.md, "A signing plan names the attempt it was made from, and is reviewed before use"
    const planned = await released("plan", "--run", run, "--apk", unsigned, "--out", join(directory, "plan.json"));
    const planSha256 = planned.ok ? String(planned.value.planSha256) : "";
    expect(await released("review", "--run", run, "--plan", join(directory, "plan.json"), "--plan-sha256", digest("another plan"))).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    expect(await released("review", "--run", run, "--plan", join(directory, "plan.json"), "--plan-sha256", planSha256)).toMatchObject({ ok: true, value: { stage: "Planned", reviewed: true, plan: 1 } });
    // spec/release/index.md, "Signing happens only in the protected environment, from the reviewed plan of the same attempt, with one signer and no key rotation": a keystore inside the working tree is not the protected one.
    const sign = (keystore: string) => released("sign", "--run", run, "--plan", join(directory, "plan.json"), "--apk", unsigned, "--out", join(directory, "signed.apk"), "--keystore", keystore, "--key-label", "alpha-release");
    expect(await sign(place("aosp/signing/release-signer.json"))).toMatchObject({ ok: false, said: expect.stringContaining("protected keystore") });
    // spec/release/index.md, "A rerun keeps its number and takes a new attempt, before signing only": the plan reviewed for the first attempt no longer signs.
    expect(await released("rerun", "--run", run)).toMatchObject({ ok: true, value: { number: 122, attempt: 2 } });
    const keystore = join(directory, "release.p12");
    writeFileSync(keystore, "keystore", { mode: 0o600 });
    process.env.ALPHA_APP_RELEASE_KEYSTORE_PASSWORD = "test";
    try {
      expect(await sign(keystore)).toMatchObject({ ok: false, said: "signing needs the reviewed plan of this attempt" });
    } finally {
      delete process.env.ALPHA_APP_RELEASE_KEYSTORE_PASSWORD;
    }
    expect([stage().stage, stage().attempt]).toEqual(["Planned", 2]);
    // spec/release/index.md, "A candidate can be abandoned before it is published": its number stays spent.
    expect(await released("abandon", "--run", run)).toMatchObject({ ok: true, value: { stage: "Abandoned" } });
    expect(await released("candidate", "--run", run, "--number", "122", "--attempt", "1", "--apk-manifest", verified)).toMatchObject({ ok: false, tag: "ReleaseRefused" });
    expect(await released("candidate", "--run", run, "--number", "123", "--attempt", "1", "--apk-manifest", verified)).toMatchObject({ ok: true, value: { stage: "Built", number: 123 } });
  });
});

const PACKAGE = "ai.alphacompute.alphaphone";
const STOCK = "com.android.launcher3/.Launcher";

/** A pilot phone at the other end of adb: Home's holder, Alpha's installed version and data, and every command it was sent. */
function pilotPhone({ install = (): void => undefined } = {}) {
  const apk = digest("alpha 122");
  const phone = { holders: [PACKAGE], activity: `${PACKAGE}/.MainActivity`, version: 121, sent: [] as string[] };
  const adb: Adb = (args) => {
    const line = args.join(" ");
    phone.sent.push(line);
    const home = /^shell cmd role add-role-holder --user 0 android\.app\.role\.HOME (\S+)$/.exec(line);
    if (home?.[1] !== undefined) { phone.holders = [home[1]]; return ""; }
    const activity = /^shell cmd package set-home-activity --user 0 (\S+)$/.exec(line);
    if (activity?.[1] !== undefined) { phone.activity = activity[1]; return ""; }
    if (line.startsWith("install -r ")) { install(); phone.version = 122; return "Success"; }
    const answers: [RegExp, () => string][] = [
      [/^shell am get-current-user$/, () => "0"],
      [/^shell cmd role get-role-holders /, () => phone.holders.join(";")],
      [/^shell cmd package resolve-activity /, () => `priority=0 preferredOrder=0\n${phone.activity}`],
      [/^shell cmd package query-activities /, () => `${STOCK}\n${PACKAGE}/.MainActivity`],
      [/^shell dumpsys package /, () => `versionCode=${phone.version} minSdk=35\n  userId=10234\n  firstInstallTime=2026-11-01 10:00:00`],
      [/^shell am force-stop /, () => ""],
      [/^shell ps -A -o PID,NAME$/, () => "PID NAME\n1 init"],
      [/^shell run-as /, () => `${digest("notes")}  ./files/notes.db\nREADBACK_EXIT=0`],
      [/^shell content query /, () => "No content provider found"],
      [/^shell pm path /, () => "package:/data/app/alpha/base.apk"],
      [/^shell sha256sum /, () => `${apk}  /data/app/alpha/base.apk`],
      [/^shell date \+%s$/, () => "1790000000"],
      [/^shell am start /, () => ""],
      [/^shell logcat /, () => "1790000003.000 ElizaAgent: Detached agent health check passed"],
    ];
    const answer = answers.find(([pattern]) => pattern.test(line));
    if (answer === undefined) throw new Error(`the phone does not answer adb ${line}`);
    return answer[1]();
  };
  return { phone, adb, apk: { file: "alpha-phone-122.apk", sha256: apk, versionCode: 122 } };
}

describe("Update a pilot phone by cable (spec/release/pilot.md, \"Story: Update a pilot phone by cable\")", () => {
  it("hands Home to the stock launcher, installs in place, checks Alpha's data, gives Home back and starts the agent, holding the phone throughout", () => {
    const locks = scratch();
    let second: unknown;
    const { phone, adb, apk } = pilotPhone({ install: () => {
      // spec/release/pilot.md, "A run claims the phone's lock, and no other run can start until it is released"
      try { pilotUpdate({ adb, serial: "pilot-1", apk, locks }); } catch (failure) { second = failure; }
    } });
    const update = pilotUpdate({ adb, serial: "pilot-1", apk, locks, agentAttempts: 1 });
    expect(second).toMatchObject({ _tag: "ReleaseRefused", message: expect.stringContaining("another pilot run holds this phone") });
    // spec/release/pilot.md, "A pilot update claims the phone, reads its data, installs, checks, restores Home and starts the agent, in that order"
    expect(update.state).toMatchObject({ leg: "Done", locked: false, moved: true, restoration: "Restored", before: "Inventory", verified: true, stopped: true, agent: "Running", passed: true, home: "AlphaHome" });
    expect(update.receipt).toEqual({ packageMatches: true, data: "DataPreserved", passed: true });
    const at = (prefix: string) => phone.sent.findIndex((line) => line.startsWith(prefix));
    // spec/release/pilot.md, "When Alpha is Home, Home is handed to the stock launcher first, and a handoff Android did not confirm leaves Home split"; spec/release/pilot.md, "Cleaning up records whether the agent stopped, then Home is restored if the run moved it"
    expect([at("shell cmd role add-role-holder --user 0 android.app.role.HOME com.android.launcher3") < at("shell run-as"), at("shell run-as") < at("install -r"),
      at("install -r") < at(`shell cmd role add-role-holder --user 0 android.app.role.HOME ${PACKAGE}`), at(`shell cmd role add-role-holder --user 0 android.app.role.HOME ${PACKAGE}`) < at("shell am start")])
      .toEqual([true, true, true, true]);
    expect(pilotUpdate({ adb: pilotPhone().adb, serial: "pilot-1", apk, locks, agentAttempts: 1 }).state.leg).toBe("Done");
  });

  it("never takes an installer that did not return as installed, and then gives Home back without starting the agent", () => {
    const { phone, adb, apk } = pilotPhone({ install: () => { throw new Error("adb: device offline"); } });
    const update = pilotUpdate({ adb, serial: "pilot-2", apk, locks: scratch(), agentAttempts: 1 });
    // spec/release/pilot.md, "An installer that does not return is never taken as installed"; spec/release/pilot.md, "The agent is started only after a verified install, a clean stop and Home restored or never moved"
    expect(update.state).toMatchObject({ leg: "Done", dispatched: true, returned: false, verified: false, agent: "Unstarted", passed: false, restoration: "Restored" });
    expect([update.failures, phone.sent.some((line) => line.startsWith("shell am start"))]).toEqual([["adb: device offline"], false]);
  });
});

describe("Read back a phone that updated itself (spec/release/index.md, \"Story: Read back a phone that updated itself\")", () => {
  it("passes a phone that took the offer in place with Alpha as the installer, and not one another program installed", () => {
    const offer: Offer = { versionCode: 122, sha256: digest("alpha 122"), sizeBytes: 4096, apkUrl: "https://github.com/eliza-research/alpha/releases/download/app-stable-alphacompute/alpha-phone-122.apk", signerSha256: digest("signer") };
    const phone = { version: 121, apk: digest("alpha 121"), initiator: "com.android.shell", sent: [] as string[] };
    const adb: Adb = (args) => {
      const line = args.join(" ");
      phone.sent.push(line);
      const answers: [RegExp, () => string][] = [
        [/^shell am get-current-user$/, () => "0"],
        [/^shell dumpsys package /, () => `versionCode=${phone.version} minSdk=35\n  userId=10234\n  firstInstallTime=2026-11-01 10:00:00\n  installInitiatingPackageName=${phone.initiator}`],
        [/^shell pm path /, () => "package:/data/app/alpha/base.apk"],
        [/^shell sha256sum /, () => `${phone.apk}  /data/app/alpha/base.apk`],
        [/^shell cmd role get-role-holders /, () => PACKAGE],
        [/^shell cmd package resolve-activity /, () => `priority=0\n${PACKAGE}/.MainActivity`],
      ];
      const answer = answers.find(([pattern]) => pattern.test(line));
      if (answer === undefined) throw new Error(`the phone does not answer adb ${line}`);
      return answer[1]();
    };
    const before = readBack({ adb, offer });
    Object.assign(phone, { version: 122, apk: offer.sha256, initiator: PACKAGE });
    // spec/release/index.md, "A phone updated itself only when it kept its install, runs the offered version with the offered APK's exact bytes, Alpha started the install, and Home and the offer did not change"
    expect(readBack({ adb, offer, before: before.observed })).toMatchObject({ passed: true, readback: { sameInstall: true, advanced: true, exact: true, selfInitiated: true, homeKept: true, offerKept: true } });
    phone.initiator = "com.android.shell";
    expect(readBack({ adb, offer, before: before.observed })).toMatchObject({ passed: false, readback: { selfInitiated: false } });
    expect(phone.sent.every((line) => !/install|role add|set-home|am start|force-stop/.test(line))).toBe(true);
  });
});
