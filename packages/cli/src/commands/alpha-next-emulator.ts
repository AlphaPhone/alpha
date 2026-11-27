import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import timersPromises from "node:timers/promises";
import type { CliContext, CommandResult } from "../runner.ts";
import { resolveAndroidSdkRoot } from "./alpha-next-validate.ts";

const DEFAULT_AVD_NAME = "alpha_next_api35";
const DEFAULT_SYSTEM_IMAGE = "system-images;android-35;google_apis;x86_64";
const DEFAULT_DEVICE_PROFILE = "pixel_6";
const DEFAULT_BOOT_TIMEOUT_SECONDS = 180;
const CORE_PACKAGE = "ai.alphacompute.alphaphone";
const PREFERENCES_AUTHORITY = `${CORE_PACKAGE}.preferences`;
const IPC_PERMISSION = "ai.alphacompute.permission.AGENT_IPC";
const ACCESSIBILITY_COMPONENT = `${CORE_PACKAGE}/ai.alphacompute.control.AlphaAccessibilityService`;
const PREFERRED_THIN_PACKAGE = "ai.alphacompute.notes";

const DEFAULT_APK_DIRS = [
  "apps/app/artifacts",
  "apps/app/android/suite/out",
] as const;

const BLOCKED_PACKAGES = [
  "com.android.settings",
  "com.android.permissioncontroller",
] as const;

const BROWSER_CANDIDATES = [
  "org.mozilla.firefox",
  "org.mozilla.fenix",
  "com.android.chrome",
  "org.chromium.webview_shell",
] as const;

/** Exact AlphaCore services, providers, widgets, and accessibility components required in `dumpsys package`. */
export const REQUIRED_CORE_COMPONENTS = [
  "AlphaAgentBrokerService",
  "AlphaPlatformBrokerService",
  "AlphaContextRegistryService",
  "AlphaPreferencesProvider",
  "AlphaVoiceInteractionService",
  "AlphaDayWidgetProvider",
  "AlphaSearchWidgetProvider",
  "ai.alphacompute.control.AlphaAccessibilityService",
] as const;

/** CLI flags for `pnpm cli alpha-next emulator-e2e`. */
export interface EmulatorE2eFlags {
  readonly dryRun: boolean;
  readonly apkDir: string | undefined;
  readonly avd: string | undefined;
  readonly serial: string | undefined;
  readonly timeout: string | undefined;
}

/** Resolved toolchain paths and boot plan for Tier-1 emulator verification. */
export interface EmulatorToolchainPlan {
  readonly sdkRoot: string;
  readonly avdName: string;
  readonly systemImage: string;
  readonly systemImagePresent: boolean;
  readonly kvmAvailable: boolean;
  readonly adbPath: string | null;
  readonly emulatorPath: string | null;
  readonly avdmanagerPath: string | null;
  readonly apkDir: string;
  readonly apkDirs: readonly string[];
  readonly discoveredApks: readonly string[];
  readonly emulatorArgs: readonly string[];
  readonly missingTools: readonly string[];
}

/** One stage verification result in the Tier-1 emulator E2E run. */
export interface EmulatorStageResult {
  readonly stage: string;
  readonly status: "planned" | "passed" | "failed" | "skipped";
  readonly detail: string;
}

/** Parsed result of checking Launcher3 MAIN/LAUNCHER activities. */
export interface LauncherActivityInspection {
  readonly passed: boolean;
  readonly coreActivities: readonly string[];
  readonly thinAlphaActivities: readonly string[];
  readonly thirdPartyActivities: readonly string[];
}

/** Parsed result of verifying AlphaCore components and signature IPC permission in `dumpsys package`. */
export interface CorePackageInspection {
  readonly passed: boolean;
  readonly hasPreferencesAuthority: boolean;
  readonly hasIpcPermission: boolean;
  readonly ipcPermissionIsSignature: boolean;
  readonly presentComponents: readonly string[];
  readonly missingComponents: readonly string[];
}

/** Parsed result of verifying cross-APK Binder IPC and shared preferences read across distinct UIDs. */
export interface CrossAppIpcInspection {
  readonly passed: boolean;
  readonly distinctUids: boolean;
  readonly coreUid: number | null;
  readonly thinUid: number | null;
  readonly hasThinAppTag: boolean;
  readonly hasPreferencesEvidence: boolean;
  readonly hasBrokerEvidence: boolean;
}

/** Parsed result of verifying `AlphaAccessibilityService` enabled and bound status in `dumpsys accessibility`. */
export interface AccessibilityInspection {
  readonly passed: boolean;
  readonly enabledInSettings: boolean;
  readonly boundInDumpsys: boolean;
}

/** Structured report produced by `pnpm cli alpha-next emulator-e2e`. */
export interface EmulatorE2eReport {
  readonly subcommand: "emulator-e2e";
  readonly mode: "dry-run" | "live";
  readonly serial: string | null;
  readonly ready: boolean;
  readonly plan: EmulatorToolchainPlan;
  readonly stages: readonly EmulatorStageResult[];
}

const PLANNED_STAGES: readonly EmulatorStageResult[] = [
  {
    stage: "ensure-avd",
    status: "planned",
    detail: `Ensure AVD ${DEFAULT_AVD_NAME} exists using ${DEFAULT_SYSTEM_IMAGE}`,
  },
  {
    stage: "boot-emulator",
    status: "planned",
    detail: "Boot headless KVM emulator (-no-window -no-audio -gpu swiftshader_indirect) until sys.boot_completed=1",
  },
  {
    stage: "install-apks",
    status: "planned",
    detail: "Install AlphaCore (ai.alphacompute.alphaphone) first and all discovered thin Alpha APKs via adb install -r -g",
  },
  {
    stage: "verify-launcher-activities",
    status: "planned",
    detail: "Verify cmd package query-activities (ACTION_MAIN + CATEGORY_LAUNCHER) lists separate Alpha thin apps alongside third-party apps",
  },
  {
    stage: "verify-ipc-and-provider",
    status: "planned",
    detail: `Verify dumpsys package ${CORE_PACKAGE} registers all 8 AlphaCore brokers, providers, widgets, voice & accessibility services under ${IPC_PERMISSION} (signature)`,
  },
  {
    stage: "verify-voice-interaction",
    status: "planned",
    detail: "Verify AlphaVoiceInteractionService registers for android.service.voice.VoiceInteractionService",
  },
  {
    stage: "verify-cross-app-ipc",
    status: "planned",
    detail: `Launch ${PREFERRED_THIN_PACKAGE} (or installed thin Alpha APK) and verify distinct UID + logcat (AlphaThinApp, AlphaPreferencesProvider, AlphaAgentBroker)`,
  },
  {
    stage: "verify-accessibility-and-browser-control",
    status: "planned",
    detail: `Enable ${ACCESSIBILITY_COMPONENT}, verify dumpsys accessibility bound state, launch Firefox/Chrome and com.android.settings, and inspect control telemetry`,
  },
  {
    stage: "teardown",
    status: "planned",
    detail: "Shutdown booted emulator cleanly via adb emu kill",
  },
];

function isCoreApkPath(apkPath: string): boolean {
  const base = path.basename(apkPath).toLowerCase();
  return base.includes("alphaphone")
    || base.includes("alphacore")
    || base.includes("alpha-core")
    || base.includes("alpha-launcher")
    || base.includes("alpha-phone")
    || base.startsWith("app-");
}

/** Order discovered APK paths so AlphaCore is installed before thin Alpha APKs. */
export function sortApksCoreFirst(apks: readonly string[]): readonly string[] {
  return [...new Set(apks)].sort((left, right) => {
    const leftCore = isCoreApkPath(left);
    const rightCore = isCoreApkPath(right);
    if (leftCore !== rightCore) return leftCore ? -1 : 1;
    return left.localeCompare(right);
  });
}

function discoverApks(apkDir: string): readonly string[] {
  if (!fs.existsSync(apkDir)) return [];
  const apks: string[] = [];
  const stack: string[] = [apkDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "instrumentation") stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".apk") && !entry.name.includes("androidTest") && !entry.name.includes("-unsigned")) {
        apks.push(full);
      }
    }
  }
  return apks;
}

/** Inspect `cmd package query-activities --brief` output for core, thin Alpha, and third-party launcher entries. */
export function inspectLauncherActivities(launcherDump: string): LauncherActivityInspection {
  const coreActivities: string[] = [];
  const thinAlphaActivities: string[] = [];
  const thirdPartyActivities: string[] = [];
  const seen = new Set<string>();
  const componentPattern = /^([a-z][a-z0-9_.]*)\/([^\s]+)$/i;

  for (const rawLine of launcherDump.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = componentPattern.exec(line);
    if (!match) continue;
    const pkg = match[1] ?? "";
    if (seen.has(line)) continue;
    seen.add(line);
    if (pkg === CORE_PACKAGE) {
      coreActivities.push(line);
    } else if (pkg.startsWith("ai.alphacompute.")) {
      thinAlphaActivities.push(line);
    } else {
      thirdPartyActivities.push(line);
    }
  }

  return {
    passed: thinAlphaActivities.length > 0 && thirdPartyActivities.length > 0,
    coreActivities,
    thinAlphaActivities,
    thirdPartyActivities,
  };
}

/** Inspect `dumpsys package ai.alphacompute.alphaphone` for all required AlphaCore components and signature IPC permission. */
export function inspectCorePackageDump(coreDump: string): CorePackageInspection {
  const hasPreferencesAuthority = coreDump.includes(PREFERENCES_AUTHORITY);
  const hasIpcPermission = coreDump.includes(IPC_PERMISSION);
  const signaturePattern = new RegExp(
    `${IPC_PERMISSION.replaceAll(".", "\\.")}[^\\n]*(?:prot(?:ectionLevel)?\\s*=\\s*\\[?signature\\b(?!\\|))`,
    "i",
  );
  const ipcPermissionIsSignature = signaturePattern.test(coreDump);

  const presentComponents: string[] = [];
  const missingComponents: string[] = [];
  for (const component of REQUIRED_CORE_COMPONENTS) {
    if (coreDump.includes(component)) {
      presentComponents.push(component);
    } else {
      missingComponents.push(component);
    }
  }

  return {
    passed: hasPreferencesAuthority && hasIpcPermission && ipcPermissionIsSignature && missingComponents.length === 0,
    hasPreferencesAuthority,
    hasIpcPermission,
    ipcPermissionIsSignature,
    presentComponents,
    missingComponents,
  };
}

/** Extract the numeric Linux `userId` or `appId` from `dumpsys package <pkg>` output. */
export function extractPackageUid(packageDump: string): number | null {
  const match = /\b(?:userId|appId)=(\d+)\b/.exec(packageDump);
  if (!match?.[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Inspect cross-APK logcat output and UID separation between AlphaCore and a launched thin Alpha app. */
export function inspectCrossAppIpcLog(
  logcat: string,
  coreUid: number | null,
  thinUid: number | null,
): CrossAppIpcInspection {
  const distinctUids = coreUid !== null && thinUid !== null && coreUid !== thinUid;
  const hasThinAppTag = /\bAlphaThinApp\b/.test(logcat);
  const hasPreferencesEvidence = /\bAlphaPreferencesProvider\b|pref(?:erence)?s|textScale|snapshot/i.test(logcat);
  const hasBrokerEvidence = /\bAlphaAgentBroker\b|IAlphaAgentBroker|broker|binder/i.test(logcat);

  return {
    passed: distinctUids && hasPreferencesEvidence && hasBrokerEvidence,
    distinctUids,
    coreUid,
    thinUid,
    hasThinAppTag,
    hasPreferencesEvidence,
    hasBrokerEvidence,
  };
}

/** Inspect `settings get secure enabled_accessibility_services` and `dumpsys accessibility` for bound AlphaAccessibilityService. */
export function inspectAccessibilityDump(dump: string, enabledSetting: string): AccessibilityInspection {
  const enabledInSettings = enabledSetting.includes(ACCESSIBILITY_COMPONENT)
    || enabledSetting.includes("AlphaAccessibilityService");
  let boundInDumpsys = /Service\[[^\]]*(?:AlphaAccessibilityService|Alpha Control)[^\]]*\]/i.test(dump);
  if (!boundInDumpsys) {
    const boundBlocks = /(?:^|[\n,[])[ \t]*(?:Bound services|mBoundServices|services)\s*:\s*\{([^}]*)\}/gi;
    let match: RegExpExecArray | null = boundBlocks.exec(dump);
    while (match !== null) {
      const content = match[1] ?? "";
      if (content.includes("AlphaAccessibilityService") || content.includes("Alpha Control")) {
        boundInDumpsys = true;
        break;
      }
      match = boundBlocks.exec(dump);
    }
  }
  return {
    passed: enabledInSettings && boundInDumpsys,
    enabledInSettings,
    boundInDumpsys,
  };
}

/** Resolve local Android SDK tools, AVD settings, KVM state, and APKs without launching any process. */
export function buildEmulatorPlan(flags: EmulatorE2eFlags, ctx: CliContext): EmulatorToolchainPlan {
  const sdkRoot = resolveAndroidSdkRoot();
  const avdName = flags.avd?.trim() || DEFAULT_AVD_NAME;
  const adbCandidate = path.join(sdkRoot, "platform-tools/adb");
  const emulatorCandidate = path.join(sdkRoot, "emulator/emulator");
  const avdmanagerCandidate = path.join(sdkRoot, "cmdline-tools/latest/bin/avdmanager");
  const imageDir = path.join(sdkRoot, "system-images/android-35/google_apis/x86_64");

  const adbPath = fs.existsSync(adbCandidate) ? adbCandidate : null;
  const emulatorPath = fs.existsSync(emulatorCandidate) ? emulatorCandidate : null;
  const avdmanagerPath = fs.existsSync(avdmanagerCandidate) ? avdmanagerCandidate : null;
  const systemImagePresent = fs.existsSync(imageDir);
  const kvmAvailable = fs.existsSync("/dev/kvm");

  const missingTools: string[] = [];
  if (!adbPath) missingTools.push("platform-tools/adb");
  if (!emulatorPath) missingTools.push("emulator/emulator");
  if (!avdmanagerPath) missingTools.push("cmdline-tools/latest/bin/avdmanager");
  if (!systemImagePresent) missingTools.push(DEFAULT_SYSTEM_IMAGE);

  const apkDirAbsList = flags.apkDir
    ? [path.resolve(ctx.cwd, flags.apkDir)]
    : DEFAULT_APK_DIRS.map((rel) => path.join(ctx.rootDir, rel));
  const rawApks = apkDirAbsList.flatMap((dir) => discoverApks(dir));
  const discoveredApks = sortApksCoreFirst(
    rawApks.map((file) => path.relative(ctx.rootDir, file).split(path.sep).join("/")),
  );
  const apkDirs = apkDirAbsList.map((dir) => path.relative(ctx.rootDir, dir).split(path.sep).join("/"));
  const emulatorArgs = [
    "-avd",
    avdName,
    "-no-window",
    "-no-audio",
    "-no-boot-anim",
    "-gpu",
    "swiftshader_indirect",
    "-no-snapshot-save",
  ];

  return {
    sdkRoot,
    avdName,
    systemImage: DEFAULT_SYSTEM_IMAGE,
    systemImagePresent,
    kvmAvailable,
    adbPath,
    emulatorPath,
    avdmanagerPath,
    apkDir: apkDirs[0] ?? DEFAULT_APK_DIRS[0],
    apkDirs,
    discoveredApks,
    emulatorArgs,
    missingTools,
  };
}

function runTool(binary: string, args: readonly string[], input?: string): string {
  return execFileSync(binary, [...args], {
    encoding: "utf8",
    ...(input !== undefined ? { input } : {}),
    stdio: [input !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
  });
}

function adbShell(adbPath: string, serial: string, command: readonly string[]): string {
  return runTool(adbPath, ["-s", serial, "shell", ...command]).trim();
}

function listConnectedEmulators(adbPath: string): readonly string[] {
  const output = runTool(adbPath, ["devices"]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("emulator-") && line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0] ?? "")
    .filter((serial) => serial !== "");
}

function countLogcatEntries(rawLogcat: string): number {
  return rawLogcat
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("--------- beginning of")).length;
}

async function waitForEmulatorBoot(
  adbPath: string,
  priorSerials: ReadonlySet<string>,
  timeoutSeconds: number,
  explicitSerial?: string,
): Promise<string> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let serial = explicitSerial;
  while (Date.now() < deadline) {
    if (!serial) {
      const found = listConnectedEmulators(adbPath).find((candidate) => !priorSerials.has(candidate));
      if (found) serial = found;
    }
    if (serial) {
      try {
        const booted = adbShell(adbPath, serial, ["getprop", "sys.boot_completed"]);
        if (booted === "1") return serial;
      } catch {
        serial = explicitSerial ?? serial;
      }
    }
    await timersPromises.scheduler.wait(1000);
  }
  throw new Error(`Emulator did not finish booting within ${String(timeoutSeconds)}s`);
}

async function verifyDeviceSuite(
  adbPath: string,
  serial: string,
  plan: EmulatorToolchainPlan,
  rootDir: string,
): Promise<readonly EmulatorStageResult[]> {
  const results: EmulatorStageResult[] = [];

  for (const relApk of plan.discoveredApks) {
    runTool(adbPath, ["-s", serial, "install", "-r", "-g", path.join(rootDir, relApk)]);
  }
  results.push({
    stage: "install-apks",
    status: "passed",
    detail: `Installed ${String(plan.discoveredApks.length)} APK(s): ${plan.discoveredApks.map((item) => path.basename(item)).join(", ")}`,
  });

  const launcherDump = adbShell(adbPath, serial, [
    "cmd",
    "package",
    "query-activities",
    "--brief",
    "-a",
    "android.intent.action.MAIN",
    "-c",
    "android.intent.category.LAUNCHER",
  ]);
  const launcherCheck = inspectLauncherActivities(launcherDump);
  results.push({
    stage: "verify-launcher-activities",
    status: launcherCheck.passed ? "passed" : "failed",
    detail: `core=${String(launcherCheck.coreActivities.length)} thin=${String(launcherCheck.thinAlphaActivities.length)} thirdParty=${String(launcherCheck.thirdPartyActivities.length)}`,
  });

  const coreDump = adbShell(adbPath, serial, ["dumpsys", "package", CORE_PACKAGE]);
  const coreCheck = inspectCorePackageDump(coreDump);
  const coreUid = extractPackageUid(coreDump);
  results.push({
    stage: "verify-ipc-and-provider",
    status: coreCheck.passed ? "passed" : "failed",
    detail: coreCheck.passed
      ? `components=${String(coreCheck.presentComponents.length)}/${String(REQUIRED_CORE_COMPONENTS.length)} authority=${PREFERENCES_AUTHORITY} permission=${IPC_PERMISSION}(signature)`
      : `authority=${String(coreCheck.hasPreferencesAuthority)} permission=${String(coreCheck.hasIpcPermission)} signature=${String(coreCheck.ipcPermissionIsSignature)} missing=[${coreCheck.missingComponents.join(",")}]`,
  });

  const voiceDump = adbShell(adbPath, serial, [
    "cmd",
    "package",
    "query-services",
    "--brief",
    "-a",
    "android.service.voice.VoiceInteractionService",
  ]);
  const hasVoiceService = voiceDump.includes("AlphaVoiceInteractionService");
  results.push({
    stage: "verify-voice-interaction",
    status: hasVoiceService ? "passed" : "failed",
    detail: hasVoiceService
      ? "AlphaVoiceInteractionService registered for VoiceInteractionService"
      : "AlphaVoiceInteractionService not found in query-services output",
  });

  const targetThinActivity = launcherCheck.thinAlphaActivities.find((entry) => entry.startsWith(`${PREFERRED_THIN_PACKAGE}/`))
    ?? launcherCheck.thinAlphaActivities[0];
  if (!targetThinActivity) {
    results.push({
      stage: "verify-cross-app-ipc",
      status: "failed",
      detail: `No installed thin Alpha app launcher activity found (expected ${PREFERRED_THIN_PACKAGE} or another thin app)`,
    });
  } else {
    const thinPkg = targetThinActivity.split("/")[0] ?? PREFERRED_THIN_PACKAGE;
    const thinDump = adbShell(adbPath, serial, ["dumpsys", "package", thinPkg]);
    const thinUid = extractPackageUid(thinDump);
    adbShell(adbPath, serial, ["logcat", "-c"]);
    adbShell(adbPath, serial, ["am", "start", "-W", "-n", targetThinActivity]);
    await timersPromises.scheduler.wait(2000);
    const ipcLogcat = adbShell(adbPath, serial, ["logcat", "-d", "-s", "AlphaThinApp", "AlphaPreferencesProvider", "AlphaAgentBroker"]);
    const ipcCheck = inspectCrossAppIpcLog(ipcLogcat, coreUid, thinUid);
    results.push({
      stage: "verify-cross-app-ipc",
      status: ipcCheck.passed ? "passed" : "failed",
      detail: `app=${thinPkg} coreUid=${String(coreUid)} thinUid=${String(thinUid)} distinctUid=${String(ipcCheck.distinctUids)} thinTag=${String(ipcCheck.hasThinAppTag)} prefs=${String(ipcCheck.hasPreferencesEvidence)} broker=${String(ipcCheck.hasBrokerEvidence)} logLines=${String(countLogcatEntries(ipcLogcat))}`,
    });
  }

  adbShell(adbPath, serial, ["logcat", "-c"]);
  adbShell(adbPath, serial, ["settings", "put", "secure", "enabled_accessibility_services", ACCESSIBILITY_COMPONENT]);
  adbShell(adbPath, serial, ["settings", "put", "secure", "accessibility_enabled", "1"]);
  await timersPromises.scheduler.wait(1500);
  const enabledA11y = adbShell(adbPath, serial, ["settings", "get", "secure", "enabled_accessibility_services"]);
  const accessibilityDump = adbShell(adbPath, serial, ["dumpsys", "accessibility"]);
  const a11yCheck = inspectAccessibilityDump(accessibilityDump, enabledA11y);

  const packagesOutput = adbShell(adbPath, serial, ["pm", "list", "packages"]);
  const browserPkg = BROWSER_CANDIDATES.find((candidate) => packagesOutput.includes(`package:${candidate}`));
  if (browserPkg) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com", browserPkg]);
  } else {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com"]);
  }
  await timersPromises.scheduler.wait(1500);
  const browserWindowDump = adbShell(adbPath, serial, ["dumpsys", "window", "displays"]);
  const browserObserved = browserPkg
    ? browserWindowDump.includes(browserPkg)
    : /mCurrentFocus=Window\{[^\n}]+ (?!ai\.alphacompute\.)[a-z][a-z0-9_.]*\//i.test(browserWindowDump);

  const blockedPresent = BLOCKED_PACKAGES.every((pkg) => packagesOutput.includes(`package:${pkg}`));
  let settingsObserved = false;
  if (blockedPresent) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.settings.SETTINGS"]);
    await timersPromises.scheduler.wait(1000);
    const settingsWindowDump = adbShell(adbPath, serial, ["dumpsys", "window", "displays"]);
    settingsObserved = settingsWindowDump.includes("com.android.settings");
  }

  const controlLogcat = adbShell(adbPath, serial, [
    "logcat",
    "-d",
    "-s",
    "AlphaAccessibilityService",
    "AlphaControlPolicy",
    "AlphaControlBridge",
  ]);
  const telemetryLines = countLogcatEntries(controlLogcat);
  const a11yOk = a11yCheck.passed && browserObserved && blockedPresent && settingsObserved;
  results.push({
    stage: "verify-accessibility-and-browser-control",
    status: a11yOk ? "passed" : "failed",
    detail: `service=${ACCESSIBILITY_COMPONENT} enabled=${String(a11yCheck.enabledInSettings)} bound=${String(a11yCheck.boundInDumpsys)} browser=${browserPkg ?? "ACTION_VIEW"} observed=${String(browserObserved)} settingsObserved=${String(settingsObserved)} blockedGuards=${BLOCKED_PACKAGES.join(",")} telemetryLines=${String(telemetryLines)}`,
  });

  return results;
}

/** Execute `pnpm cli alpha-next emulator-e2e` (safe `--dry-run` plan or live Tier-1 emulator test). */
export async function runEmulatorE2e(flags: EmulatorE2eFlags, ctx: CliContext): Promise<CommandResult<EmulatorE2eReport>> {
  const plan = buildEmulatorPlan(flags, ctx);
  const timeoutSeconds = flags.timeout ? Number(flags.timeout) : DEFAULT_BOOT_TIMEOUT_SECONDS;
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    return { ok: false, message: `Invalid --timeout "${flags.timeout ?? ""}". Expected positive seconds.`, exitCode: 2 };
  }

  if (flags.dryRun) {
    const ready = plan.missingTools.length === 0;
    const report: EmulatorE2eReport = {
      subcommand: "emulator-e2e",
      mode: "dry-run",
      serial: flags.serial ?? null,
      ready,
      plan,
      stages: PLANNED_STAGES,
    };
    const lines = [
      `alpha-next emulator-e2e (dry-run)  ready:${String(ready)}  kvm:${String(plan.kvmAvailable)}  avd:${plan.avdName}`,
      `  sdk: ${plan.sdkRoot}`,
      `  apkDirs: ${plan.apkDirs.join(", ")} (${String(plan.discoveredApks.length)} APK(s) found)`,
      ...(plan.missingTools.length > 0 ? [`  missing: ${plan.missingTools.join(", ")}`] : []),
      ...PLANNED_STAGES.map((stage) => `  [planned] ${stage.stage}: ${stage.detail}`),
    ];
    return { ok: true, data: report, lines };
  }

  if (plan.missingTools.length > 0 || !plan.adbPath || !plan.emulatorPath || !plan.avdmanagerPath) {
    return {
      ok: false,
      message: `Android emulator toolchain incomplete: missing ${plan.missingTools.join(", ")}.`,
      data: {
        subcommand: "emulator-e2e",
        mode: "live",
        serial: flags.serial ?? null,
        ready: false,
        plan,
        stages: [],
      },
    };
  }
  if (plan.discoveredApks.length === 0) {
    return {
      ok: false,
      message: `No installable APKs found under ${plan.apkDirs.join(", ")}. Build APKs first or pass --apk-dir <dir>.`,
      data: {
        subcommand: "emulator-e2e",
        mode: "live",
        serial: flags.serial ?? null,
        ready: false,
        plan,
        stages: [],
      },
    };
  }

  const stages: EmulatorStageResult[] = [];
  let bootedProcess: ChildProcess | undefined;
  let activeSerial: string | undefined = flags.serial;

  try {
    const avds = runTool(plan.emulatorPath, ["-list-avds"]).split(/\r?\n/).map((line) => line.trim());
    if (!avds.includes(plan.avdName)) {
      runTool(
        plan.avdmanagerPath,
        ["create", "avd", "--force", "-n", plan.avdName, "-k", plan.systemImage, "-d", DEFAULT_DEVICE_PROFILE],
        "no\n",
      );
      stages.push({ stage: "ensure-avd", status: "passed", detail: `Created AVD ${plan.avdName}` });
    } else {
      stages.push({ stage: "ensure-avd", status: "passed", detail: `Reused existing AVD ${plan.avdName}` });
    }

    const priorSerials = new Set(listConnectedEmulators(plan.adbPath));
    if (!activeSerial) {
      bootedProcess = spawn(plan.emulatorPath, [...plan.emulatorArgs], { stdio: "ignore", detached: true });
      bootedProcess.unref();
    }
    activeSerial = await waitForEmulatorBoot(plan.adbPath, priorSerials, timeoutSeconds, activeSerial);
    stages.push({ stage: "boot-emulator", status: "passed", detail: `Booted ${activeSerial}` });

    stages.push(...await verifyDeviceSuite(plan.adbPath, activeSerial, plan, ctx.rootDir));
  } finally {
    if (bootedProcess && activeSerial) {
      try {
        runTool(plan.adbPath, ["-s", activeSerial, "emu", "kill"]);
        stages.push({ stage: "teardown", status: "passed", detail: `Stopped ${activeSerial}` });
      } catch {
        bootedProcess.kill("SIGTERM");
        stages.push({ stage: "teardown", status: "passed", detail: `Terminated emulator process for ${activeSerial}` });
      }
    } else if (bootedProcess) {
      bootedProcess.kill("SIGTERM");
      stages.push({ stage: "teardown", status: "passed", detail: "Terminated emulator process before serial attached" });
    }
  }

  const failed = stages.filter((stage) => stage.status === "failed");
  const report: EmulatorE2eReport = {
    subcommand: "emulator-e2e",
    mode: "live",
    serial: activeSerial ?? null,
    ready: true,
    plan,
    stages,
  };
  if (failed.length > 0) {
    return {
      ok: false,
      message: `Emulator E2E failed in ${failed.map((stage) => stage.stage).join(", ")}.`,
      data: report,
    };
  }
  return {
    ok: true,
    data: report,
    lines: [
      `alpha-next emulator-e2e (live)  serial:${activeSerial ?? "none"}  passed:${String(stages.length)}`,
      ...stages.map((stage) => `  [${stage.status}] ${stage.stage}: ${stage.detail}`),
    ],
  };
}
