// Release signing policy decisions; these are not APK build or signing evidence.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditWebBundle } from "../scripts/audit-production-bundle.ts";
import { appLinkFilters, assetLinksProblems, fingerprint, PLACEHOLDER, renderAssetLinks, TEMPLATE } from "../scripts/render-assetlinks.ts";
import { buildEnv, partialSigningProblem, readReleaseSigner, releaseAdmission, SIGNING_ENV, signingRequested, validateReleaseSigner } from "../scripts/build-android.ts";
import { releaseBlockers } from "../scripts/release-blockers.ts";
import { CLOUD_VOICE_CHECKS, cloudVoiceAdmission } from "../vendor/eliza/packages/os/scripts/android/apk-release-record.mjs";

const ALL = { ELIZAOS_KEYSTORE_PATH: "/k", ELIZAOS_KEYSTORE_PASSWORD: "p", ELIZAOS_KEY_ALIAS: "a", ELIZAOS_KEY_PASSWORD: "q" };
const SIGNER = "a".repeat(64);
const descriptor = (signerSha256 = SIGNER, versionCode = null) => ({ schema: 1, signerSha256, lastRelease: { versionCode, versionName: null, recordedAt: null } });

test("a partial ELIZAOS_ signing set is refused by name, never by value", () => {
  assert.equal(partialSigningProblem({}), null);
  assert.equal(partialSigningProblem(ALL), null);
  const { ELIZAOS_KEY_PASSWORD, ...partial } = ALL;
  const problem = partialSigningProblem(partial);
  assert.match(problem, /missing ELIZAOS_KEY_PASSWORD/);
  assert.ok(!problem.includes("/k") && !problem.includes("\"p\""));
  assert.match(partialSigningProblem({ ...ALL, ELIZAOS_KEY_ALIAS: "  " }), /missing ELIZAOS_KEY_ALIAS/, "blank counts as missing, as in Gradle");
  assert.equal(signingRequested({ ...ALL, ELIZAOS_KEY_ALIAS: " " }), false);
  // The generated host reads the names android/consumer-host.json declares.
  const { signing } = JSON.parse(fs.readFileSync("android/consumer-host.json", "utf8")).profile;
  assert.deepEqual(signing, { storeFile: "ELIZAOS_KEYSTORE_PATH", storePassword: "ELIZAOS_KEYSTORE_PASSWORD", keyAlias: "ELIZAOS_KEY_ALIAS", keyPassword: "ELIZAOS_KEY_PASSWORD" });
  assert.deepEqual(SIGNING_ENV, Object.keys(ALL));
});

test("the committed descriptor is valid and unset fixtures remain supported", () => {
  const committed = readReleaseSigner();
  assert.equal(validateReleaseSigner(committed), committed);
  assert.equal(validateReleaseSigner(descriptor("unset")).signerSha256, "unset");
  assert.throws(() => validateReleaseSigner({ ...descriptor(), signerSha256: "ABC" }), /signerSha256/);
  assert.throws(() => validateReleaseSigner({ ...descriptor(), lastRelease: { versionCode: 0 } }), /versionCode/);
  assert.throws(() => validateReleaseSigner({ ...descriptor(), schema: 2 }), /schema/);
});

test("only a release signed by the recorded signer with an advancing versionCode is admitted", () => {
  const ok = releaseAdmission({ signed: true, signerSha256: SIGNER, versionCode: 3 }, descriptor(SIGNER, 2));
  assert.deepEqual(ok, { failures: [], blockers: [], signerMatches: true });
  const unsigned = releaseAdmission({ signed: false, signerSha256: null, versionCode: 3 }, descriptor());
  assert.deepEqual(unsigned.failures, []);
  assert.deepEqual(unsigned.blockers, ["unsigned release"]);
  assert.equal(unsigned.signerMatches, false);
  const unset = releaseAdmission({ signed: true, signerSha256: SIGNER, versionCode: 3 }, descriptor("unset"));
  assert.equal(unset.signerMatches, false);
  assert.match(unset.blockers.join(), /signer is unset/);
  const mismatch = releaseAdmission({ signed: true, signerSha256: "b".repeat(64), versionCode: 3 }, descriptor());
  assert.match(mismatch.failures.join(), /does not match/);
  const stale = releaseAdmission({ signed: true, signerSha256: SIGNER, versionCode: 2 }, descriptor(SIGNER, 2));
  assert.match(stale.failures.join(), /not greater than the last recorded release 2/);
  const staleUnsigned = releaseAdmission({ signed: false, signerSha256: null, versionCode: 1 }, descriptor(SIGNER, 2));
  assert.deepEqual(staleUnsigned.failures, []);
  assert.match(staleUnsigned.blockers.join(), /not greater/);
});

// Every fact verify-apks records on a distributable native release row; each case below breaks one.
// verify-apks records distributable = releaseBlockers(row) is empty (scripts/release-blockers.ts).
const SHA = "b".repeat(64);
const DISTRIBUTABLE = {
  mode: "release", sha256: SHA, runtimeProfile: "native", distributable: true, testMocks: false, bundleAudit: "passed", signed: true,
  releaseAdmission: { signerMatches: true, blockers: [], failures: [] }, runtime: "PACKAGED", runtimeNotices: true,
  voiceHost: { packaged: true, asr: true, differences: [], qualified: true }, licenceBlockers: [],
};

test("a release is distributable only when releaseBlockers names nothing", () => {
  assert.deepEqual(releaseBlockers(DISTRIBUTABLE), []);
  assert.deepEqual(releaseBlockers({...DISTRIBUTABLE, voiceHost: {...DISTRIBUTABLE.voiceHost, qualified: false}}), [], "device approval flags are separate from build integrity");
  const broken = {
    "unsigned": [{ signed: false }, /unsigned release/],
    "signed is not exactly true": [{ signed: "true" }, /unsigned release/],
    "signer does not match the descriptor": [{ releaseAdmission: { ...DISTRIBUTABLE.releaseAdmission, signerMatches: false } }, /does not match android\/release-signer\.json/],
    "admission blocker": [{ releaseAdmission: { ...DISTRIBUTABLE.releaseAdmission, blockers: ["versionCode not greater"] } }, /versionCode not greater/],
    "admission failure": [{ releaseAdmission: { ...DISTRIBUTABLE.releaseAdmission, failures: ["test-mocks APK signed with the release key"] } }, /test-mocks APK signed/],
    "no packaged runtime": [{ runtime: "UNPACKAGED" }, /unpackaged runtime/],
    // A PACKAGED distribution must ship the regenerated runtime notices (Bun and bundled packages).
    "notices lack the runtime": [{ runtimeNotices: false }, /notices lack the packaged runtime/],
    "no on-device voice": [{ voiceHost: { ...DISTRIBUTABLE.voiceHost, packaged: false } }, /no on-device voice packaged/],
    "no on-device ASR": [{ voiceHost: { ...DISTRIBUTABLE.voiceHost, asr: false } }, /^on-device voice has no ASR$/],
    "voice bytes differ from the record": [{ voiceHost: { ...DISTRIBUTABLE.voiceHost, differences: ["x"] } }, /bytes differ from the voice-host record/],
    "test mocks": [{ testMocks: true }, /test-mocks build/],
    "bundle audit failed": [{ bundleAudit: "failed" }, /flag-off bundle audit/],
    "licence check not recorded": [{ licenceBlockers: undefined }, /font licence check was not recorded/],
  };
  for (const [name, [change, expected]] of Object.entries(broken))
    assert.match(releaseBlockers({ ...DISTRIBUTABLE, ...change }).join("\n"), expected, name);
  // A recorded row that verify-apks did not mark distributable is never admitted.
  assert.deepEqual(releaseBlockers({ ...DISTRIBUTABLE, distributable: false }), ["verify-apks did not record this release as distributable"]);
  assert.deepEqual(releaseBlockers({ ...DISTRIBUTABLE, distributable: false, voiceHost: { ...DISTRIBUTABLE.voiceHost, asr: false } }), ["on-device voice has no ASR"]);
  // The image path also requires a reviewed platform certificate.
  assert.match(releaseBlockers(DISTRIBUTABLE, { image: { platformCertificateSha256: "unset" } }).join(), /not a reviewed release certificate/);
});

test("supplied Cartesia evidence is recorded on a native release but does not decide distributable", () => {
  const checks = Object.fromEntries(CLOUD_VOICE_CHECKS.map(name => [name, true]));
  const evidence = {format: "alpha-cloud-voice-qualification-v1", results: [{ apkSha256: SHA, provider: "cartesia", outcome: "passed", checks }]};
  const withVoice = input => ({ ...DISTRIBUTABLE, cloudVoice: cloudVoiceAdmission(SHA, input, "d".repeat(64)) });
  assert.deepEqual(releaseBlockers(withVoice(evidence)), []);
  // release.yml admits the receipt itself (scripts/ci/qualified-app-update.py) before verify-apks runs.
  assert.deepEqual(releaseBlockers(withVoice({ ...evidence, results: [{ ...evidence.results[0], outcome: "failed" }] })), []);
  assert.deepEqual(releaseBlockers(withVoice(null)), []);
  // On-device voice with ASR is still required of the same row.
  assert.match(releaseBlockers({ ...withVoice(evidence), voiceHost: { packaged: false, asr: false, differences: [] } }).join(), /no on-device voice packaged/);
  assert.match(releaseBlockers({ ...withVoice(evidence), voiceHost: { packaged: true, asr: false, differences: [], qualified: true } }).join(), /on-device voice has no ASR/);
});

test("assetlinks.json is rendered only from the recorded release signer, never unset, a placeholder or a debug key", () => {
  const template = fs.readFileSync(TEMPLATE, "utf8");
  const packageName = JSON.parse(fs.readFileSync("app.config.json", "utf8")).appId;
  const text = renderAssetLinks({ template, signerSha256: SIGNER, packageName });
  const [statement] = JSON.parse(text);
  assert.deepEqual(statement.relation, ["delegate_permission/common.handle_all_urls"]);
  assert.equal(statement.target.package_name, "ai.alphacompute.alphaphone");
  assert.deepEqual(statement.target.sha256_cert_fingerprints, [fingerprint(SIGNER)]);
  assert.match(statement.target.sha256_cert_fingerprints[0], /^(AA:){31}AA$/);
  assert.doesNotMatch(text, new RegExp(PLACEHOLDER));
  assert.deepEqual(assetLinksProblems(text), []);
  // An unset descriptor is refused until its release key exists (A-06).
  assert.throws(() => renderAssetLinks({ template, signerSha256: "unset", packageName }), /"unset"/);
  assert.throws(() => renderAssetLinks({ template, signerSha256: PLACEHOLDER, packageName }), /placeholder/);
  assert.throws(() => renderAssetLinks({ template, signerSha256: "ABC", packageName }), /64 lower-case hex/);
  assert.throws(() => renderAssetLinks({ template, signerSha256: SIGNER, packageName: "other.app" }), /not other\.app/);
  const debugKey = "d".repeat(64);
  assert.throws(() => renderAssetLinks({ template, signerSha256: debugKey, packageName, debugFingerprints: [fingerprint(debugKey)] }), /debug signing certificate/);
  // The checker refuses a published file that kept the template placeholder or names a debug key.
  assert.match(assetLinksProblems(template).join(), /still contains RELEASE_CERT_SHA256_PLACEHOLDER/);
  const debugFile = text.replace(fingerprint(SIGNER), fingerprint(debugKey));
  assert.match(assetLinksProblems(debugFile, { debugFingerprints: [debugKey] }).join(), /is a debug signing certificate/);
  assert.match(assetLinksProblems(text.replace(fingerprint(SIGNER), "unset")).join(), /unset release signer/);
  // The CLI exits non-zero on an isolated unset descriptor and writes nothing.
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "alpha-assetlinks-")), "assetlinks.json");
  const fixtureRoot = path.dirname(out);
  for (const file of ["scripts/render-assetlinks.ts", TEMPLATE, "app.config.json"]) {
    fs.mkdirSync(path.dirname(path.join(fixtureRoot, file)), {recursive:true});
    fs.copyFileSync(file, path.join(fixtureRoot, file));
  }
  fs.writeFileSync(path.join(fixtureRoot, "android/release-signer.json"), JSON.stringify(descriptor("unset")));
  const run = spawnSync(process.execPath, ["scripts/render-assetlinks.ts", "--out", out], { cwd:fixtureRoot, encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /signerSha256 is "unset"/);
  assert.equal(fs.existsSync(out), false);
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
});

test("the bundle audit fails an assetlinks.json with a placeholder or debug fingerprint", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-assetlinks-audit-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, ".well-known"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html>");
  fs.writeFileSync(path.join(dir, "build-flags.json"), JSON.stringify({ testMocks: false }));
  fs.writeFileSync(path.join(dir, ".well-known/assetlinks.json"), fs.readFileSync(TEMPLATE));
  assert.deepEqual(auditWebBundle(dir).findings.map(row => row.rule), ["assetlinks.json still contains RELEASE_CERT_SHA256_PLACEHOLDER"]);
  const packageName = JSON.parse(fs.readFileSync("app.config.json", "utf8")).appId;
  fs.writeFileSync(path.join(dir, ".well-known/assetlinks.json"), renderAssetLinks({ template: fs.readFileSync(TEMPLATE, "utf8"), signerSha256: SIGNER, packageName }));
  assert.equal(auditWebBundle(dir).ok, true);
  assert.equal(auditWebBundle(dir, { debugFingerprints: [SIGNER] }).ok, false);
});

test("the https autoVerify filters are the two returns on the configured host and are read back from the APK manifest", () => {
  // verify-apks records the filter from `aapt dump xmltree` of the packaged manifest.
  const filter = scheme => [
    "      E: intent-filter (line=40)",
    "        A: http://schemas.android.com/apk/res/android:autoVerify(0x010104ee)=(type 0x12)0xffffffff",
    "        E: action (line=41)",
    "          A: http://schemas.android.com/apk/res/android:name(0x01010003)=\"android.intent.action.VIEW\" (Raw: \"android.intent.action.VIEW\")",
    "        E: data (line=44)",
    `          A: http://schemas.android.com/apk/res/android:scheme(0x01010027)="${scheme}" (Raw: "${scheme}")`,
    "          A: http://schemas.android.com/apk/res/android:host(0x01010028)=\"links.example.com\" (Raw: \"links.example.com\")",
  ];
  const custom = ["      E: intent-filter (line=30)", "        E: data (line=31)",
    "          A: http://schemas.android.com/apk/res/android:scheme(0x01010027)=\"alphaphone\" (Raw: \"alphaphone\")",
    "          A: http://schemas.android.com/apk/res/android:host(0x01010028)=\"cloud-delegation\" (Raw: \"cloud-delegation\")"];
  assert.deepEqual(appLinkFilters([...custom, ...filter("https"), "    E: activity (line=50)"].join("\n")), { present: true, hosts: ["links.example.com"] });
  assert.deepEqual(appLinkFilters(custom.join("\n")), { present: false, hosts: [] }, "a custom scheme alone is no App Link");
  assert.deepEqual(appLinkFilters(filter("http").join("\n")), { present: false, hosts: [] });
});
