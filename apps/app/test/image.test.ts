import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { alphaPrivileged, firstBootGrants } from "../gen/app__image.ts";
import { aosp, otaArguments, place } from "../scripts/aosp.ts";
import { inventory, licences } from "../scripts/licences.ts";
import { kept, release } from "../scripts/release.ts";

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
    const missing = await released("deliver", "--apk", join(directory, "alpha-phone-122.apk"), "--manifest", write(directory, "m.json", {}), "--version", "122", "--execute");
    expect([missing.ok, missing.tag !== "UsageError"]).toEqual([false, true]);
    expect((await released("deliver", "--apk", "x", "--manifest", "y", "--version", "0")).tag).toBe("UsageError");
  });
});
