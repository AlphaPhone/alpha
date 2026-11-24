import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { androidEnv, tool } from "./toolchain.ts";
import {
  aaptManifestTree, assertAndroidArtifactSnapshotUnchanged, dumpAndroidArtifactBadging,
  listAndroidArtifactEntries, manifestFacts, parseXmlTree, readAndroidArtifactEntryBuffers,
  readApkSignerDigest, snapshotAndroidArtifact,
} from "@elizaos/os/image";
import { run } from "./run-os-program.ts";

export { manifestFacts, parseXmlTree };
export type ManifestNode = ReturnType<typeof parseXmlTree>;

export type ApkMode = "debug" | "release";
export type ApkVariant = "launcher";

interface DistributionInput {
  xml: string;
  home?: boolean;
  badging?: string;
  names: string[];
  dexClasses?: string[];
  removedSpeechClasses?: string[];
}
interface DistributionOptions {mode?: ApkMode; appId?: string}
interface ApkInspection extends DistributionInput {
  file: string;
  packageName: string | null;
  home: boolean;
  launcher: boolean;
  debuggable: boolean;
  webPayload: boolean;
  sha256: string;
  badging: string;
  dexClasses: string[];
  removedSpeechClasses: string[];
}

// Alpha's distribution rules for native components and archive contents.
export const DEVELOPMENT_CLASSES = Object.freeze([
  "SyntheticAutofillService",
  "DevelopmentAgentPlugin",
  "DevelopmentVoiceCapture",
  "DevelopmentChatContract",
]);
const CANONICAL_APP_ID = "ai.alphacompute.alphaphone";
const TELEPHONY_SETUP_RECEIVER = "AlphaTelephonySetupReceiver";
const MANAGE_ROLE_HOLDERS = "android.permission.MANAGE_ROLE_HOLDERS";
// Components a distribution APK may export. Each one must be guarded by the
// listed permission (null: a deliberate public entry point).
export const EXPORTED_COMPONENTS = Object.freeze({
  "ai.alphacompute.alphaphone.MainActivity": null,
  "ai.alphacompute.alphaphone.AlphaAssistActivity": null,
  // Alpha Cloud cutover only: the billing return App Link alias, declared disabled unless the cutover flag is on.
  "ai.alphacompute.alphaphone.AlphaCloudBillingReturn": null,
  // Power entry is reserved for platform status-bar callers.
  "ai.alphacompute.alphaphone.AlphaPowerVoiceActivity": "android.permission.STATUS_BAR_SERVICE",
  "ai.alphacompute.alphaphone.AlphaNotificationListener": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
  "ai.alphacompute.alphaphone.AlphaQuickSettingsTile": "android.permission.BIND_QUICK_SETTINGS_TILE",
  "ai.alphacompute.alphaphone.AlphaKeyboardDictationService": "android.permission.BIND_INPUT_METHOD",
  // Alpha's password vault as an Android Autofill provider: the shared plugin-native-passwords service under
  // its installed component name (Android keeps the selected provider by name), opening Alpha's screens.
  "ai.eliza.plugins.passwords.ElizaPasswordAutofillService": "android.permission.BIND_AUTOFILL_SERVICE",
  // Google Play services alone may notify this native sign-in revocation service.
  "com.google.android.gms.auth.api.signin.RevocationBoundService": "com.google.android.gms.auth.api.signin.permission.REVOCATION_NOTIFICATION",
  "androidx.work.impl.background.systemjob.SystemJobService": "android.permission.BIND_JOB_SERVICE",
  "androidx.work.impl.diagnostics.DiagnosticsReceiver": "android.permission.DUMP",
  "androidx.profileinstaller.ProfileInstallReceiver": "android.permission.DUMP",
  // Read-only release data integrity export for pilot updates (adb shell holds DUMP).
  "ai.alphacompute.alphaphone.release.DataIntegrityProvider": "android.permission.DUMP",
  // Launcher-only dialer role (#420), declared disabled and enabled only on the verified Alpha image:
  // Telecom alone may bind the InCallService, and ACTION_DIAL is the role's public entry point.
  "ai.alphacompute.alphaphone.AlphaInCallService": "android.permission.BIND_INCALL_SERVICE",
  "ai.alphacompute.alphaphone.AlphaDialPadActivity": null,
  // Launcher-only SMS role (#421), enabled only on the verified image: only the telephony stack may
  // deliver texts, MMS notifications and quick replies; SENDTO is the role's public compose entry.
  "ai.alphacompute.alphaphone.AlphaSmsDeliverReceiver": "android.permission.BROADCAST_SMS",
  "ai.alphacompute.alphaphone.AlphaMmsWapPushReceiver": "android.permission.BROADCAST_WAP_PUSH",
  "ai.alphacompute.alphaphone.AlphaRespondViaMessageService": "android.permission.SEND_RESPOND_VIA_MESSAGE",
  "ai.alphacompute.alphaphone.AlphaSmsComposeActivity": null,
  // The privileged image Provision app can prepare, but cannot assign roles through this receiver.
  [`${CANONICAL_APP_ID}.${TELEPHONY_SETUP_RECEIVER}`]: MANAGE_ROLE_HOLDERS,
});
// Shared elizaOS component names the APK may declare, by tag. Alpha's native screens, dialogs, tiles
// and notices are its own classes (test/native-ui-self-contained.test.mjs checks the sources); a
// shared name stays only where an installed identifier binds to it, and a shared activity name is
// only an alias of Alpha's own screen.
export const SHARED_COMPONENTS = Object.freeze({
  // Android keeps the selected Autofill provider by this name; it opens Alpha's screens below.
  "ai.eliza.plugins.passwords.ElizaPasswordAutofillService": "service",
  "ai.eliza.plugins.passwords.PasswordFillActivity": "activity-alias",
  "ai.eliza.plugins.passwords.PasswordSaveActivity": "activity-alias",
  "ai.eliza.plugins.messages.MmsFileProvider": "provider",
  "ai.eliza.plugins.filesystem.browser.ReadOnlyStorageFileProvider": "provider",
});
const SHARED_NAMESPACE = "ai.eliza.";

/** A shared component name outside SHARED_COMPONENTS, or a shared alias that opens a shared class. */
export function sharedComponentProblems(xml: string, components: readonly {tag: string; name: string}[], appId: string) {
  const problems: string[] = [];
  for (const component of components) {
    if (!component.name?.startsWith(SHARED_NAMESPACE)) continue;
    if (SHARED_COMPONENTS[component.name as keyof typeof SHARED_COMPONENTS] !== component.tag)
      problems.push(`Shared ${component.tag} ${component.name} is declared; Alpha declares its own class`);
  }
  const application = parseXmlTree(xml).children.find(node => node.name === "manifest")
    ?.children.find(node => node.name === "application");
  for (const alias of application?.children.filter(node => node.name === "activity-alias") ?? []) {
    const target = alias.attrs.targetActivity ?? "";
    const qualified = target.startsWith(".") ? appId + target : target;
    if (alias.attrs.name?.startsWith(SHARED_NAMESPACE) && !qualified.startsWith(appId + "."))
      problems.push(`Shared alias ${alias.attrs.name} must open Alpha's screen, not ${target || "nothing"}`);
  }
  return problems;
}
// On-device speech is the fused libelizainference engine only. Entries and classes of the removed
// speech runtimes (Open Neural Network Exchange models and runtimes, sherpa, ORT-Web, the former
// in-browser model directory public/browser-speech/) never ship.
export const REMOVED_SPEECH_ENTRY = /(?:\.on{2}x$|libon{2}xruntime|libsherpa|k2fsa|ort-wasm|^assets\/public\/browser-speech\/)/i;
export const REMOVED_SPEECH_CLASSES = Object.freeze(["Lcom/k2fsa/", "Lai/eliza/speech/"]);
const DEVELOPMENT_NETWORK_CONFIG = /^res\/xml\/development_network_security_config\.xml$/;
const WEB_PAYLOAD_ROOT = "assets/public/";
const WEB_PAYLOAD_INDEX = `${WEB_PAYLOAD_ROOT}index.html`;
const DEX_ENTRY = /^classes\d*\.dex$/;
const MANIFEST_FALSE = "0x0";

/**
 * Pure release-policy assessment. `apk` holds aapt dumps, zip entry names and
 * the development class names found in dex. Returns `{ facts, problems }`.
 * Apply Alpha's distribution policy to facts read by the pinned SDK.
 */
export function distributionProblems(apk: DistributionInput, { mode, appId = CANONICAL_APP_ID }: DistributionOptions = {}) {
  // The caller selects the admitted installation identity. Only product-owned names move;
  // shared/platform components keep their exact names and all permission checks remain intact.
  const exportedComponents = Object.fromEntries(Object.entries(EXPORTED_COMPONENTS).map(([name, permission]) =>
    [name.startsWith(CANONICAL_APP_ID + ".") ? appId + name.slice(CANONICAL_APP_ID.length) : name, permission]));
  const facts = manifestFacts(apk.xml, apk.badging);
  const problems: string[] = [];
  const { application } = facts;
  if (!application.declared) problems.push("APK manifest has no application");
  if (mode === "release" && application.debuggable !== null && application.debuggable !== MANIFEST_FALSE)
    problems.push("Release manifest must not allow debugging");
  if (mode === "release" && !application.networkSecurityConfig)
    problems.push("Release manifest has no networkSecurityConfig");
  if (application.allowBackup !== MANIFEST_FALSE)
    problems.push(`allowBackup must be false (found ${application.allowBackup ?? "unset"})`);
  if (application.usesCleartextTraffic !== MANIFEST_FALSE)
    problems.push(`usesCleartextTraffic must be false (found ${application.usesCleartextTraffic ?? "unset"})`);
  for (const component of facts.exported) {
    if (!Object.hasOwn(exportedComponents, component.name)) {
      problems.push(`Unexpected exported ${component.tag} ${component.name}`);
      continue;
    }
    const permission = exportedComponents[component.name];
    if (permission && component.permission !== permission)
      problems.push(`Exported ${component.name} must require ${permission}`);
  }
  for (const name of DEVELOPMENT_CLASSES)
    if (apk.xml.includes(name) || apk.dexClasses?.includes(name)) problems.push(`Development class ${name} is packaged`);
  if (apk.xml.includes("peerfixture")) problems.push("peerfixture permission or package query is packaged");
  for (const entry of apk.names.filter((name) => DEVELOPMENT_NETWORK_CONFIG.test(name)))
    problems.push(`Development entry ${entry} is packaged`);
  for (const name of [...facts.components.map((component) => component.name), ...facts.permissions, ...facts.queriedPackages])
    if (/mock|fixture/i.test(name)) problems.push(`Test-only manifest entry ${name}`);
  if (facts.permissions.includes(MANAGE_ROLE_HOLDERS)) problems.push("MANAGE_ROLE_HOLDERS is requested");
  const sourceMaps = apk.names.filter((name) => name.startsWith("assets/") && name.endsWith(".map"));
  if (sourceMaps.length) problems.push(`Source maps are packaged: ${sourceMaps.slice(0, 3).join(", ")}`);
  const removedSpeech = apk.names.filter((name) => REMOVED_SPEECH_ENTRY.test(name));
  if (removedSpeech.length) problems.push(`Removed speech runtime entries are packaged: ${removedSpeech.slice(0, 3).join(", ")}`);
  if (apk.removedSpeechClasses?.length) problems.push(`Removed speech runtime classes are packaged: ${apk.removedSpeechClasses.join(", ")}`);
  if (!apk.names.includes("assets/public/licenses/third-party-notices.json"))
    problems.push("assets/public/licenses/third-party-notices.json is missing");
  if (facts.versionCode === null) problems.push(`versionCode must be a positive integer (found ${facts.versionCodeText ?? "none"})`);
  if (!facts.versionName || facts.versionName === "0")
    problems.push(`versionName must be set (found ${facts.versionName ?? "none"})`);
  if (facts.packageName && facts.packageName !== appId)
    problems.push("APK package differs from selected application identity");
  problems.push(...legacyStorageProblems(apk.xml));
  problems.push(...sharedComponentProblems(apk.xml, facts.components, appId));
  const powerName = `${appId}.AlphaPowerVoiceActivity`;
  if (facts.exported.some(component => component.name === powerName && component.tag !== "activity"))
    problems.push("AlphaPowerVoiceActivity must be an activity");
  const tileName = `${appId}.AlphaQuickSettingsTile`;
  const assistName = `${appId}.AlphaAssistActivity`;
  // aapt prints android:enabled="false" as (type 0x12)0x0; a missing attribute means enabled.
  const enabled = (node: ManifestNode | undefined) => node && node.attrs.enabled !== "0x0" && node.attrs.enabled !== "false";
  const tile = facts.components.find(component => component.name === tileName);
  if (tile) {
    const application = parseXmlTree(apk.xml).children.find(node => node.name === "manifest")
      ?.children.find(node => node.name === "application");
    const nodes = application?.children.filter(node =>
      node.attrs.name === tileName || node.attrs.name === ".AlphaQuickSettingsTile") ?? [];
    const actions = nodes.flatMap(node => node.children.filter(child => child.name === "intent-filter")
      .flatMap(filter => filter.children.filter(child => child.name === "action").map(child => child.attrs.name)));
    if (tile.tag !== "service" || !tile.exported ||
        tile.permission !== exportedComponents[tileName] || nodes.length !== 1 ||
        actions.length !== 1 || actions[0] !== "android.service.quicksettings.action.QS_TILE")
      problems.push("Alpha Quick Settings tile must be one exported, permission-protected QS_TILE service");
    // The tile's only target is AlphaAssistActivity (AlphaQuickSettingsTile.entryIntent); a tile that
    // can be tapped while that activity is disabled or absent opens nothing.
    const assist = application?.children.find(node => node.name === "activity" &&
      (node.attrs.name === assistName || node.attrs.name === ".AlphaAssistActivity"));
    if (enabled(nodes[0]) && !enabled(assist))
      problems.push("Alpha Quick Settings tile must be disabled while AlphaAssistActivity is disabled");
  }
  const dictationName = `${appId}.AlphaKeyboardDictationService`;
  const dictation = facts.components.find(component => component.name === dictationName);
  if (dictation) {
    const application = parseXmlTree(apk.xml).children.find(node => node.name === "manifest")
      ?.children.find(node => node.name === "application");
    const nodes = application?.children.filter(node =>
      node.attrs.name === dictationName || node.attrs.name === ".AlphaKeyboardDictationService") ?? [];
    const actions = nodes.flatMap(node => node.children.filter(child => child.name === "intent-filter")
      .flatMap(filter => filter.children.filter(child => child.name === "action").map(child => child.attrs.name)));
    const metadata = nodes.flatMap(node => node.children.filter(child => child.name === "meta-data" && child.attrs.name === "android.view.im"));
    if (!apk.home || dictation.tag !== "service" || !dictation.exported ||
        dictation.permission !== exportedComponents[dictationName] || nodes.length !== 1 ||
        actions.length !== 1 || actions[0] !== "android.view.InputMethod" ||
        metadata.length !== 1 || !metadata[0].attrs.resource)
      problems.push("Alpha voice typing must be one launcher-only, Android-bound input-method service with subtype metadata");
  }
  return { facts, problems };
}

/**
 * Files' Android 10 legacy storage: WRITE_EXTERNAL_STORAGE may be requested only with
 * maxSdkVersion 29 or lower (never on API 30+, where all-files access is used), and READ_ only up
 * to 32 (Photos). Legacy storage itself is requested by the application.
 */
export function legacyStorageProblems(xml: string) {
  const manifest = parseXmlTree(xml).children.find(node => node.name === "manifest");
  const problems: string[] = [];
  const limits: Record<string, number> = { "android.permission.WRITE_EXTERNAL_STORAGE": 29, "android.permission.READ_EXTERNAL_STORAGE": 32 };
  for (const node of manifest?.children ?? []) {
    const name = node.attrs.name;
    if (!name || !/^uses-permission(?:-sdk-23)?$/.test(node.name) || !Object.hasOwn(limits, name)) continue;
    const max = node.attrs.maxSdkVersion === undefined ? Infinity : Number(node.attrs.maxSdkVersion);
    if (!(max <= limits[name]))
      problems.push(`${name.split(".").pop()} is requested above API ${limits[name]}`);
  }
  return problems;
}

export function apkArchiveFacts({ xml, badging, names }: Pick<ApkInspection, "xml" | "badging" | "names">) {
  const manifest = manifestFacts(xml, badging);
  return {
    packageName: manifest.packageName,
    home: xml.includes("android.intent.category.HOME"),
    launcher: xml.includes("android.intent.category.LAUNCHER"),
    debuggable: manifest.application.debuggable === "0xffffffff",
    webPayload: names.includes(WEB_PAYLOAD_INDEX),
  };
}

export async function readApkManifestEvidence(file: string) {
  const aapt = tool("aapt");
  const badging = await run(dumpAndroidArtifactBadging(aapt, file));
  const xml = await run(aaptManifestTree(file, { aapt, env: androidEnv() }));
  return { badging, xml };
}

export async function inspectApk(file: string): Promise<ApkInspection> {
  const snapshot = await run(snapshotAndroidArtifact(file));
  const options = { artifactBytes: snapshot.bytes };
  const names = await run(listAndroidArtifactEntries(file, options));
  const dexEntries = names.filter((name) => DEX_ENTRY.test(name));
  const dexFiles = await run(readAndroidArtifactEntryBuffers(file, dexEntries, { ...options, label: "APK dex" }));
  const dexBuffers = dexFiles.map((entry) => Buffer.from(entry.buffer, entry.byteOffset, entry.byteLength));
  const dexClasses = DEVELOPMENT_CLASSES.filter((name) => dexBuffers.some((bytes) => bytes.includes(`/${name};`)));
  const removedSpeechClasses = REMOVED_SPEECH_CLASSES.filter((prefix) => dexBuffers.some((bytes) => bytes.includes(prefix)));
  const { badging, xml } = await readApkManifestEvidence(file);
  await run(assertAndroidArtifactSnapshotUnchanged(file, snapshot, await run(snapshotAndroidArtifact(file))));
  return { file, sha256: snapshot.sha256, names, dexClasses, removedSpeechClasses, badging, xml, ...apkArchiveFacts({ badging, xml, names }) };
}

/** Extract the bounded, validated web payload into a fresh directory. */
export async function extractWebPayload(file: string): Promise<{root: string; public: string}> {
  const snapshot = await run(snapshotAndroidArtifact(file));
  const options = { artifactBytes: snapshot.bytes };
  const names = await run(listAndroidArtifactEntries(file, options));
  const entries = names.filter((name) => name.startsWith(WEB_PAYLOAD_ROOT) && !name.endsWith("/"));
  if (!entries.includes(WEB_PAYLOAD_INDEX)) throw Error(`APK web payload has no ${WEB_PAYLOAD_INDEX}`);
  const buffers = await run(readAndroidArtifactEntryBuffers(file, entries, { ...options, label: "APK web payload" }));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-apk-public-"));
  try {
    for (const [index, entry] of entries.entries()) {
      const output = path.join(root, entry);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, buffers[index], { flag: "wx" });
    }
    return { root, public: path.join(root, WEB_PAYLOAD_ROOT) };
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

/** Read the build-time flag record that vite writes beside the web bundle. */
export function readBuildFlags(publicDir: string): {testMocks: boolean} {
  const file = path.join(publicDir, "build-flags.json");
  if (!fs.existsSync(file))
    throw new Error(`build-flags.json is missing from the packaged web bundle (${file}); the web build did not record its test-mocks flag`);
  const flags = JSON.parse(fs.readFileSync(file, "utf8"));
  if (typeof flags?.testMocks !== "boolean") throw new Error("build-flags.json has no boolean testMocks");
  return flags;
}

/** Check that the packaged Android owner-route table is generated from the renderer source. */
export function verifyOwnerRouteTable(file: string) {
  let packaged;
  try { packaged = execFileSync("unzip", ["-p", file, "assets/owner-routes.json"], { stdio: ["ignore", "pipe", "pipe"] }); }
  catch { throw new Error("assets/owner-routes.json is missing"); }
  if (!packaged.equals(fs.readFileSync(new URL('../apps/app/src/platform/owner-routes.json', import.meta.url))))
    throw new Error("assets/owner-routes.json differs from the generated owner-route table");
}

export const AUDIT_SCRIPT = "scripts/audit-production-bundle.ts";
/** Run the shared production-bundle audit CLI against an extracted web payload. */
export function auditBundle(directory: string, { script = AUDIT_SCRIPT } = {}) {
  if (!fs.existsSync(script))
    throw new Error(`${script} is missing; the production bundle audit is required to verify APK web payloads`);
  const args = [script, directory];
  try {
    return execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const stdout = error instanceof Error && 'stdout' in error ? error.stdout : "";
    const stderr = error instanceof Error && 'stderr' in error ? error.stderr : "";
    throw new Error(`Production bundle audit failed for ${directory}:\n${stdout ?? ""}${stderr ?? ""}`);
  }
}

/** Verify the APK and return its single signing certificate for the requested API. */
export async function signerDigest(file: string, { apiLevel }: { apiLevel?: number } = {}): Promise<string> {
  if (apiLevel !== undefined && (!Number.isInteger(apiLevel) || apiLevel < 1))
    throw Error("Invalid Android API level");
  return run(readApkSignerDigest(file, { apksigner: tool("apksigner"), apiLevel, env: androidEnv() }));
}

/** The image provisioner must be able to prepare the launcher before its first activity starts. */
export function telephonySetupReceiverProblems(tree: ManifestNode, {appId = CANONICAL_APP_ID}: {appId?: string} = {}): string[] {
  const manifest = tree.children.find(node => node.name === "manifest");
  const application = manifest?.children.find(node => node.name === "application");
  const receivers = application?.children.filter(node =>
    node.attrs.name === `${appId}.${TELEPHONY_SETUP_RECEIVER}` ||
    node.attrs.name === ".AlphaTelephonySetupReceiver" ||
    node.attrs.name === "AlphaTelephonySetupReceiver") ?? [];
  const problems = [];
  if (manifest?.attrs.package && manifest.attrs.package !== appId)
    problems.push("AlphaTelephonySetupReceiver package differs from selected application identity");
  const [receiver] = receivers;
  if (!receiver || receivers.length !== 1 || receiver.name !== "receiver" || receiver.attrs.exported !== "0xffffffff" ||
      (receiver.attrs.enabled !== undefined && receiver.attrs.enabled !== "0xffffffff") ||
      receiver.attrs.permission !== MANAGE_ROLE_HOLDERS || receiver.children.some(node => node.name === "intent-filter"))
    problems.push("Invalid AlphaTelephonySetupReceiver: expected one enabled, exported, explicit receiver protected by MANAGE_ROLE_HOLDERS");
  if (manifest?.children.some(node =>
    (node.name === "uses-permission" || node.name.startsWith("uses-permission-sdk-")) && node.attrs.name === MANAGE_ROLE_HOLDERS))
    problems.push("Alpha must not request MANAGE_ROLE_HOLDERS");
  return problems;
}

export async function validateApk(file: string, identity: {appId: string}, inspect: (file: string) => ApkInspection | Promise<ApkInspection> = inspectApk) {
  const data = await inspect(file);
  if (data.packageName !== identity.appId)
    throw new Error(`Wrong package in ${file}: ${data.packageName}`);
  if (!data.home || !data.launcher || !data.webPayload)
    throw new Error(`Invalid launcher/web payload contract in ${file}`);
  if (
    data.xml.includes("android.permission.WRITE_SETTINGS")
  )
    throw new Error(`Unexpected elevated permission in ${file}`);
  if (!data.xml.includes('android.permission.CAMERA')) throw new Error(`Missing native feature permission CAMERA in ${file}`);
  // The launcher packages Contacts reads. The native image capability,
  // unlocked profile and runtime grant remain separate requirements for access.
  if (!data.xml.includes('android.permission.READ_CONTACTS'))
    throw new Error(`Missing READ_CONTACTS permission in ${file}`);
  if (!data.xml.includes('android.permission.WRITE_CONTACTS'))
    throw new Error(`Invalid WRITE_CONTACTS permission in ${file}`);
  // The default dialer can use provider voicemail. Carrier registration needs authenticated provisioning.
  for (const entry of ['com.android.voicemail.permission.ADD_VOICEMAIL', 'android.telephony.VisualVoicemailService', 'android.permission.BIND_VISUAL_VOICEMAIL_SERVICE'])
    if (data.xml.includes(entry)) throw new Error(`Unexpected carrier voicemail manifest entry ${entry} in ${file}`);
  // The launcher packages SMS provider reads and reviewed sends (#421); Android grants
  // these hard-restricted permissions only to the preinstalled image app or the SMS role holder.
  for (const permission of ['READ_SMS', 'SEND_SMS'])
    if (!data.xml.includes(`android.permission.${permission}`))
      throw new Error(`Invalid ${permission} permission in ${file}`);
  // The dialer role grants CALL_PHONE to its holder; the launcher declares the role components.
  if (!data.xml.includes('android.permission.CALL_PHONE'))
    throw new Error(`Invalid CALL_PHONE permission in ${file}`);
  // Phone state (the native phone plugin's permission) and the system shade: the merged manifest,
  // not the source manifests, is what ships.
  // READ_PRIVILEGED_PHONE_STATE is the one privileged permission the launcher declares: the Alpha
  // image allow-lists exactly it (IMEI and SIM serial in Settings); no other install is granted it.
  for (const permission of ['READ_PHONE_STATE', 'READ_PHONE_NUMBERS', 'READ_PRIVILEGED_PHONE_STATE', 'EXPAND_STATUS_BAR'])
    if (!data.xml.includes(`android.permission.${permission}`))
      throw new Error(`Invalid ${permission} permission in ${file}`);
  for (const component of ['AlphaInCallService', 'AlphaCallActivity', 'AlphaDialPadActivity', 'AlphaSmsDeliverReceiver', 'AlphaSmsSendReceiver', 'AlphaMmsWapPushReceiver', 'AlphaMmsResultReceiver', 'AlphaRespondViaMessageService', 'AlphaSmsComposeActivity'])
    if (!data.xml.includes(`${identity.appId}.${component}`))
      throw new Error(`Invalid telephony-role component ${component} in ${file}`);
  const setupProblems = telephonySetupReceiverProblems(parseXmlTree(data.xml), identity);
  if (setupProblems.length) throw new Error(`${setupProblems.join("; ")} in ${file}`);
  // The SMS role grants these to its holder.
  for (const permission of ['RECEIVE_SMS', 'RECEIVE_MMS', 'RECEIVE_WAP_PUSH'])
    if (!data.xml.includes(`android.permission.${permission}`))
      throw new Error(`Invalid ${permission} permission in ${file}`);
  // Recent calls (AP-08): the image capability, unlocked
  // foreground and the owner's runtime grant remain separate requirements for any read.
  if (!data.xml.includes('android.permission.READ_CALL_LOG'))
    throw new Error(`Invalid READ_CALL_LOG permission in ${file}`);
  for (const permission of ['WRITE_CALL_LOG', 'MANAGE_OWN_CALLS', 'ANSWER_PHONE_CALLS'])
    if (data.xml.includes(`android.permission.${permission}`))
      throw new Error(`Unexpected telephony permission ${permission} in ${file}`);
  // aapt badging distinguishes required hardware from optional feature declarations.
  if (/uses-feature: name='android\.hardware\.camera(?:\.any|\.autofocus)?'/.test(data.badging))
    throw new Error(`Camera hardware must remain optional in ${file}`);
  return data;
}

/** Archive the verified APK payload, independent of the working web bundle. */
export async function archiveWebPayload(apkFile: string, destination: string) {
  const payload = await extractWebPayload(apkFile);
  try {
    const flags = readBuildFlags(payload.public);
    if (flags.testMocks !== false) throw new Error(`APK web payload has testMocks=${flags.testMocks}; an APK packages only a flag-off bundle`);
    auditBundle(payload.public);
    fs.cpSync(payload.public, destination, { recursive: true, errorOnExist: true, force: false });
  } finally {
    fs.rmSync(payload.root, { recursive: true, force: true });
  }
}
