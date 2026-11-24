import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { androidEnv, tool } from "./toolchain.ts";
import { run } from "./run-os-program.ts";
import { withApkEvidence, withPackagedWeb, type ApkEvidence } from "./apk-evidence.ts";
import { manifestFacts as readManifestFacts, parseXmlTree, readApkSignerDigest } from "@elizaos/os/image";

export { parseXmlTree };
export const manifestFacts = (xml: string, badging?: string) => {
  const facts = readManifestFacts(xml, badging);
  return {
    ...facts,
    packageName: facts.packageName ?? undefined,
    versionCode: Number.isSafeInteger(facts.versionCode) && facts.versionCode! > 0 ? facts.versionCode : null,
  };
};

export type ManifestNode = ReturnType<typeof parseXmlTree>;

export type ApkMode = "debug" | "release";
export type ApkVariant = "launcher";

interface DistributionInput {
  xml: string;
  home?: boolean;
  badging?: string;
  names: readonly string[];
  dexClasses?: string[];
  forbiddenDex?: string[];
  removedSpeechClasses?: string[];
}
interface DistributionOptions {mode?: ApkMode; appId?: string}
interface ApkInspection extends DistributionInput {
  file: string;
  packageName: string | undefined;
  home: boolean;
  launcher: boolean;
  debuggable: boolean;
  webPayload: boolean;
  sha256: string;
  badging: string;
  dexClasses: string[];
  removedSpeechClasses: string[];
}

// No Alpha distribution APK may package development hooks.
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
export const DISTRIBUTION_POLICY = Object.freeze({
  developmentClasses: DEVELOPMENT_CLASSES,
  developmentManifestText: ["peerfixture"],
  developmentEntries: [/^res\/xml\/development_network_security_config\.xml$/],
  exportedComponents: EXPORTED_COMPONENTS,
  // WRITE_EXTERNAL_STORAGE is admitted only up to API 29 (Files' legacy storage); distributionProblems checks it.
  forbiddenPermissions: [MANAGE_ROLE_HOLDERS],
  forbiddenEntries: REMOVED_SPEECH_ENTRY,
  forbiddenEntriesLabel: "Removed speech runtime entries are packaged",
  forbiddenDexPrefixes: REMOVED_SPEECH_CLASSES,
  forbiddenDexLabel: "Removed speech runtime classes are packaged",
  requiredEntries: ["assets/public/licenses/third-party-notices.json"],
});

/**
 * Pure release-policy assessment. `apk` holds aapt dumps, zip entry names and
 * the development class names found in dex. Returns `{ facts, problems }`.
 * The mode and selected identity apply to the package inspected by aapt.
 */
export function distributionProblems(apk: DistributionInput, { mode, appId = CANONICAL_APP_ID }: DistributionOptions = {}) {
  // The caller selects the admitted installation identity. Only product-owned names move;
  // shared/platform components keep their exact names and all permission checks remain intact.
  const exportedComponents = Object.fromEntries(Object.entries(EXPORTED_COMPONENTS).map(([name, permission]) =>
    [name.startsWith(CANONICAL_APP_ID + ".") ? appId + name.slice(CANONICAL_APP_ID.length) : name, permission]));
  const facts = manifestFacts(apk.xml, apk.badging);
  const problems: string[] = [];
  const policy = DISTRIBUTION_POLICY;
  for (const name of policy.developmentClasses) {
    if (apk.xml.includes(name) || apk.dexClasses?.includes(name))
      problems.push(`Development class ${name} is packaged`);
  }
  for (const text of policy.developmentManifestText) {
    if (apk.xml.includes(text)) problems.push(`${text} permission or package query is packaged`);
  }
  for (const name of apk.names.filter(entry => policy.developmentEntries.some(pattern => pattern.test(entry)))) {
    problems.push(`Development entry ${name} is packaged`);
  }
  const { declared, debuggable, allowBackup, usesCleartextTraffic, networkSecurityConfig } = facts.application;
  if (!declared)
    problems.push("APK manifest has no application");
  if (mode === "release" && debuggable !== null && debuggable !== "0x0")
    problems.push("Release manifest must not allow debugging");
  if (usesCleartextTraffic !== "0x0")
    problems.push(`usesCleartextTraffic must be false (found ${usesCleartextTraffic ?? "unset"})`);
  if (mode === "release" && !networkSecurityConfig)
    problems.push("Release manifest has no networkSecurityConfig");
  if (allowBackup !== "0x0")
    problems.push(`allowBackup must be false (found ${allowBackup ?? "unset"})`);
  for (const component of facts.exported) {
    if (!Object.hasOwn(exportedComponents, component.name)) {
      problems.push(`Unexpected exported ${component.tag} ${component.name}`);
      continue;
    }
    const permission = exportedComponents[component.name];
    if (permission && component.permission !== permission)
      problems.push(`Exported ${component.name} must require ${permission}`);
  }
  const manifestNames = [...facts.components.map(component => component.name), ...facts.permissions, ...facts.queriedPackages];
  for (const name of manifestNames.filter(value => /mock|fixture/i.test(value))) {
    problems.push(`Test-only manifest entry ${name}`);
  }
  for (const permission of policy.forbiddenPermissions) {
    if (facts.permissions.includes(permission)) problems.push(`${permission.split(".").pop()} is requested`);
  }
  const maps = apk.names.filter(name => name.startsWith("assets/") && name.endsWith(".map"));
  if (maps.length) problems.push(`Source maps are packaged: ${maps.slice(0, 3).join(", ")}`);
  const forbidden = apk.names.filter(name => policy.forbiddenEntries.test(name));
  if (forbidden.length) problems.push(`${policy.forbiddenEntriesLabel}: ${forbidden.slice(0, 3).join(", ")}`);
  const forbiddenDex = apk.forbiddenDex ?? apk.removedSpeechClasses;
  if (forbiddenDex?.length) problems.push(`${policy.forbiddenDexLabel}: ${forbiddenDex.join(", ")}`);
  for (const entry of policy.requiredEntries) {
    if (!apk.names.includes(entry)) problems.push(`${entry} is missing`);
  }
  if (facts.versionCode === null)
    problems.push(`versionCode must be a positive integer (found ${facts.versionCodeText ?? "none"})`);
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

export async function inspectApk(apk: ApkEvidence): Promise<ApkInspection> {
  const { badging, xml, facts } = await apk.manifest();
  const dex = await apk.entries(apk.names.filter(entry => /^classes\d*\.dex$/.test(entry)), { label: "DEX evidence" });
  const contents = [...dex.values()];
  return {
    file: apk.sourceFile,
    packageName: /package: name='([^']+)'/.exec(badging)?.[1],
    home: xml.includes("android.intent.category.HOME"),
    launcher: xml.includes("android.intent.category.LAUNCHER"),
    debuggable: facts.application.debuggable !== null && facts.application.debuggable !== "0x0",
    webPayload: apk.names.includes("assets/public/index.html"),
    sha256: apk.sha256,
    badging,
    xml,
    names: apk.names,
    dexClasses: DEVELOPMENT_CLASSES.filter(name => contents.some(bytes => bytes.includes(`/${name};`))),
    removedSpeechClasses: REMOVED_SPEECH_CLASSES.filter(prefix => contents.some(bytes => bytes.includes(prefix))),
  };
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
export async function verifyOwnerRouteTable(apk: ApkEvidence) {
  const entry = "assets/owner-routes.json";
  const packaged = await apk.entries([entry], { label: "owner route table", maxEntryBytes: 1 << 20 });
  if (!packaged.get(entry)?.equals(fs.readFileSync(new URL("../apps/app/src/platform/owner-routes.json", import.meta.url))))
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

/** Read the verified signer of an APK already held by the caller. */
export async function signerDigest(file: string, { apiLevel }: { apiLevel?: number } = {}) {
  if (apiLevel !== undefined && (!Number.isSafeInteger(apiLevel) || apiLevel < 1))
    throw new Error("Invalid Android API level");
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

export function validateApk(file: string, identity: {appId: string}, inspect: (file: string) => ApkInspection) {
  return validateApkInspection(inspect(file), identity, file);
}

export function validateApkInspection(data: ApkInspection, identity: {appId: string}, file = data.file) {
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
export async function archiveWebPayload(apkFile: string, destination: string, expectedSha256: string) {
  const staging = fs.mkdtempSync(path.join(path.dirname(destination), ".alpha-apk-web-"));
  const stagedWeb = path.join(staging, "web");
  try {
    await withApkEvidence(apkFile, async apk => {
      if (apk.sha256 !== expectedSha256) throw new Error("APK archive changed after verification: " + apkFile);
      await withPackagedWeb(apk, publicDir => {
        const flags = readBuildFlags(publicDir);
        if (flags.testMocks !== false) throw new Error("APK web payload has testMocks=" + flags.testMocks);
        auditBundle(publicDir);
        fs.cpSync(publicDir, stagedWeb, { recursive: true, errorOnExist: true, force: false });
      });
    });
    if (fs.existsSync(destination)) throw new Error("APK web archive already exists: " + destination);
    fs.renameSync(stagedWeb, destination);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
