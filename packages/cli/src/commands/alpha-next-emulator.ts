import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import timersPromises from "node:timers/promises";
import type { CliContext, CommandResult } from "../runner.ts";
import { resolveAndroidSdkRoot } from "./alpha-next-validate.ts";

const DEFAULT_AVD_NAME = "alpha_next_api35";
const DEFAULT_SYSTEM_IMAGE = "system-images;android-35;google_apis;x86_64";
const DEFAULT_DEVICE_PROFILE = "pixel_6";
const DEFAULT_BOOT_TIMEOUT_SECONDS = 180;
const UI_POLL_INTERVAL_MS = 500;
const UI_POLL_TIMEOUT_MS = 8000;
const IPC_POLL_TIMEOUT_MS = 6000;
const ACCESSIBILITY_LABEL_PATTERN = /AlphaAccessibilityService|Alpha(?: Device)? Control/i;
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
  readonly avdHome: string;
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

/** Parsed result of structured zero-PII control telemetry from `AlphaAccessibilityService` and `AlphaControlPolicy`. */
export interface ControlTelemetryInspection {
  readonly passed: boolean;
  readonly serviceConnected: boolean;
  readonly observedPackage: string | null;
  readonly observedNodes: number;
  readonly refusedSettings: boolean;
  readonly telemetryLines: number;
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
    || base.startsWith("launcher-")
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
  const signatureExplicitlyFalse = /\bcoreSignatureMatch=false\b/i.test(logcat);
  const hasStructuredPrefs = /\bprefsConnected=(?:true|false)\b/i.test(logcat);
  const hasStructuredBroker = /\bagentBrokerBound=(?:true|false)\b/i.test(logcat);
  const hasPreferencesEvidence = hasStructuredPrefs
    ? /\bprefsConnected=true\b/i.test(logcat)
    : /\bAlphaPreferencesProvider\b|textScale|snapshot/i.test(logcat);
  const hasBrokerEvidence = hasStructuredBroker
    ? /\bagentBrokerBound=true\b/i.test(logcat)
    : /\bAlphaAgentBroker\b|IAlphaAgentBroker/i.test(logcat);

  return {
    passed: distinctUids && !signatureExplicitlyFalse && hasPreferencesEvidence && hasBrokerEvidence,
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
  let boundInDumpsys = /Service\[[^\]]*(?:AlphaAccessibilityService|Alpha(?: Device)? Control)[^\]]*\]/i.test(dump);
  if (!boundInDumpsys) {
    const boundBlocks = /(?:^|[\n,[])[ \t]*(?:Bound services|mBoundServices|services)\s*:\s*\{([^}]*)\}/gi;
    let match: RegExpExecArray | null = boundBlocks.exec(dump);
    while (match !== null) {
      const content = match[1] ?? "";
      if (ACCESSIBILITY_LABEL_PATTERN.test(content)) {
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

/** Inspect structured zero-PII logcat telemetry from `AlphaAccessibilityService` and `AlphaControlPolicy`. */
export function inspectControlTelemetry(
  logcat: string,
  expectedBrowserPkg?: string,
): ControlTelemetryInspection {
  const serviceConnected = /\bAlphaAccessibilityService\b[^\n]*\bevent=connected\b/.test(logcat);
  const refusedSettings = /\bAlphaControlPolicy\b[^\n]*\bevent=refuse\s+pkg=com\.android\.settings\b/.test(logcat);

  let observedPackage: string | null = null;
  let observedNodes = 0;
  const observeRegex = /\bAlphaAccessibilityService\b[^\n]*\bevent=observe\s+pkg=([^\s]+)\s+targetKind=AllowedApp\b[^\n]*\bnodes=(\d+)/g;
  let match: RegExpExecArray | null = observeRegex.exec(logcat);
  while (match !== null) {
    const pkg = match[1] ?? "";
    const nodes = Number.parseInt(match[2] ?? "0", 10);
    const matchesTarget = expectedBrowserPkg
      ? pkg === expectedBrowserPkg
      : !pkg.startsWith("ai.alphacompute.");
    if (matchesTarget && Number.isFinite(nodes) && nodes > observedNodes) {
      observedPackage = pkg;
      observedNodes = nodes;
    }
    match = observeRegex.exec(logcat);
  }

  return {
    passed: serviceConnected && observedNodes > 0 && refusedSettings,
    serviceConnected,
    observedPackage,
    observedNodes,
    refusedSettings,
    telemetryLines: countLogcatEntries(logcat),
  };
}

/** Resolve a consistent `ANDROID_AVD_HOME` directory shared by both `avdmanager` and `emulator`. */
export function resolveAndroidAvdHome(
  env: NodeJS.ProcessEnv = process.env,
  avdName: string = DEFAULT_AVD_NAME,
  homeDir: string = os.homedir(),
): string {
  const explicit = env.ANDROID_AVD_HOME?.trim();
  if (explicit) return explicit;
  const homeAvd = path.join(homeDir, ".android/avd");
  if (fs.existsSync(path.join(homeAvd, `${avdName}.ini`))) {
    return homeAvd;
  }
  const xdgConfig = env.XDG_CONFIG_HOME?.trim();
  if (xdgConfig) {
    const xdgAvd = path.join(xdgConfig, ".android/avd");
    if (fs.existsSync(path.join(xdgAvd, `${avdName}.ini`))) {
      return xdgAvd;
    }
  }
  return homeAvd;
}

/** Resolve local Android SDK tools, AVD settings, KVM state, and APKs without launching any process. */
export function buildEmulatorPlan(flags: EmulatorE2eFlags, ctx: CliContext): EmulatorToolchainPlan {
  const sdkRoot = resolveAndroidSdkRoot();
  const avdName = flags.avd?.trim() || DEFAULT_AVD_NAME;
  const avdHome = resolveAndroidAvdHome(process.env, avdName);
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
    avdHome,
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

function runTool(
  binary: string,
  args: readonly string[],
  options?: { readonly input?: string; readonly env?: NodeJS.ProcessEnv },
): string {
  return execFileSync(binary, [...args], {
    encoding: "utf8",
    ...(options?.input !== undefined ? { input: options.input } : {}),
    ...(options?.env !== undefined ? { env: options.env } : {}),
    stdio: [options?.input !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
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

async function pollUntil<T>(
  sample: () => T,
  done: (value: T) => boolean,
  timeoutMs: number,
  intervalMs: number = UI_POLL_INTERVAL_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let latest = sample();
  while (!done(latest) && Date.now() < deadline) {
    await timersPromises.scheduler.wait(intervalMs);
    latest = sample();
  }
  return latest;
}

async function waitForEmulatorBoot(
  adbPath: string,
  priorSerials: ReadonlySet<string>,
  timeoutSeconds: number,
  explicitSerial?: string,
  bootedProcess?: ChildProcess,
): Promise<string> {
  let spawnError: Error | undefined;
  bootedProcess?.once("error", (err) => {
    spawnError = err;
  });
  const deadline = Date.now() + timeoutSeconds * 1000;
  let serial = explicitSerial;
  while (Date.now() < deadline) {
    if (spawnError) {
      throw new Error(`Emulator process failed to start: ${spawnError.message}`);
    }
    if (bootedProcess && (bootedProcess.exitCode !== null || bootedProcess.signalCode !== null)) {
      throw new Error(
        `Emulator process exited early before boot completed (exitCode=${String(bootedProcess.exitCode)} signal=${String(bootedProcess.signalCode)})`,
      );
    }
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
    const ipcPoll = await pollUntil(
      () => {
        const logcat = adbShell(adbPath, serial, ["logcat", "-d", "-s", "AlphaThinApp", "AlphaPreferencesProvider", "AlphaAgentBroker"]);
        return { logcat, check: inspectCrossAppIpcLog(logcat, coreUid, thinUid) };
      },
      (sample) => sample.check.passed,
      IPC_POLL_TIMEOUT_MS,
    );
    results.push({
      stage: "verify-cross-app-ipc",
      status: ipcPoll.check.passed ? "passed" : "failed",
      detail: `app=${thinPkg} coreUid=${String(coreUid)} thinUid=${String(thinUid)} distinctUid=${String(ipcPoll.check.distinctUids)} thinTag=${String(ipcPoll.check.hasThinAppTag)} prefs=${String(ipcPoll.check.hasPreferencesEvidence)} broker=${String(ipcPoll.check.hasBrokerEvidence)} logLines=${String(countLogcatEntries(ipcPoll.logcat))}`,
    });
  }

  adbShell(adbPath, serial, ["settings", "put", "secure", "accessibility_enabled", "0"]);
  adbShell(adbPath, serial, ["settings", "delete", "secure", "enabled_accessibility_services"]);
  await timersPromises.scheduler.wait(500);
  adbShell(adbPath, serial, ["logcat", "-c"]);
  adbShell(adbPath, serial, ["settings", "put", "secure", "enabled_accessibility_services", ACCESSIBILITY_COMPONENT]);
  adbShell(adbPath, serial, ["settings", "put", "secure", "accessibility_enabled", "1"]);

  const readControlLogcat = () => adbShell(adbPath, serial, [
    "logcat",
    "-d",
    "-s",
    "AlphaAccessibilityService",
    "AlphaControlPolicy",
    "AlphaControlBridge",
  ]);

  const a11yCheck = await pollUntil(
    () => {
      const enabledA11y = adbShell(adbPath, serial, ["settings", "get", "secure", "enabled_accessibility_services"]);
      const accessibilityDump = adbShell(adbPath, serial, ["dumpsys", "accessibility"]);
      return inspectAccessibilityDump(accessibilityDump, enabledA11y);
    },
    (sample) => sample.passed,
    IPC_POLL_TIMEOUT_MS,
  );

  const packagesOutput = adbShell(adbPath, serial, ["pm", "list", "packages"]);
  const browserPkg = BROWSER_CANDIDATES.find((candidate) => packagesOutput.includes(`package:${candidate}`));
  if (browserPkg) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com", browserPkg]);
  } else {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com"]);
  }
  const browserPoll = await pollUntil(
    () => {
      const windowDump = adbShell(adbPath, serial, ["dumpsys", "window", "displays"]);
      const observed = browserPkg
        ? windowDump.includes(browserPkg)
        : /mCurrentFocus=Window\{[^\n}]+ (?!ai\.alphacompute\.)[a-z][a-z0-9_.]*\//i.test(windowDump);
      const telemetry = inspectControlTelemetry(readControlLogcat(), browserPkg);
      return { observed, telemetry };
    },
    (sample) => sample.observed && sample.telemetry.observedNodes > 0,
    UI_POLL_TIMEOUT_MS,
  );
  const browserObserved = browserPoll.observed;

  const blockedPresent = BLOCKED_PACKAGES.every((pkg) => packagesOutput.includes(`package:${pkg}`));
  let settingsObserved = false;
  let telemetryCheck = browserPoll.telemetry;
  if (blockedPresent) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.settings.SETTINGS"]);
    const settingsPoll = await pollUntil(
      () => {
        const windowDump = adbShell(adbPath, serial, ["dumpsys", "window", "displays"]);
        const observed = windowDump.includes("com.android.settings");
        const telemetry = inspectControlTelemetry(readControlLogcat(), browserPkg);
        return { observed, telemetry };
      },
      (sample) => sample.observed && sample.telemetry.refusedSettings,
      UI_POLL_TIMEOUT_MS,
    );
    settingsObserved = settingsPoll.observed;
    telemetryCheck = settingsPoll.telemetry;
  }

  const a11yOk = a11yCheck.passed && browserObserved && blockedPresent && settingsObserved && telemetryCheck.passed;
  results.push({
    stage: "verify-accessibility-and-browser-control",
    status: a11yOk ? "passed" : "failed",
    detail: `service=${ACCESSIBILITY_COMPONENT} enabled=${String(a11yCheck.enabledInSettings)} bound=${String(a11yCheck.boundInDumpsys)} connected=${String(telemetryCheck.serviceConnected)} browser=${browserPkg ?? "ACTION_VIEW"} observed=${String(browserObserved)} observedNodes=${String(telemetryCheck.observedNodes)} settingsObserved=${String(settingsObserved)} refusedSettings=${String(telemetryCheck.refusedSettings)} blockedGuards=${BLOCKED_PACKAGES.join(",")} telemetryLines=${String(telemetryCheck.telemetryLines)}`,
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
  const emulatorEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ANDROID_AVD_HOME: plan.avdHome,
  };

  try {
    fs.mkdirSync(plan.avdHome, { recursive: true });
    const avds = runTool(plan.emulatorPath, ["-list-avds"], { env: emulatorEnv })
      .split(/\r?\n/)
      .map((line) => line.trim());
    if (!avds.includes(plan.avdName)) {
      runTool(
        plan.avdmanagerPath,
        ["create", "avd", "--force", "-n", plan.avdName, "-k", plan.systemImage, "-d", DEFAULT_DEVICE_PROFILE],
        { input: "no\n", env: emulatorEnv },
      );
      stages.push({ stage: "ensure-avd", status: "passed", detail: `Created AVD ${plan.avdName} in ${plan.avdHome}` });
    } else {
      stages.push({ stage: "ensure-avd", status: "passed", detail: `Reused existing AVD ${plan.avdName} in ${plan.avdHome}` });
    }

    const priorSerials = new Set(listConnectedEmulators(plan.adbPath));
    if (!activeSerial) {
      bootedProcess = spawn(plan.emulatorPath, [...plan.emulatorArgs], {
        stdio: "ignore",
        detached: true,
        env: emulatorEnv,
      });
      bootedProcess.unref();
    }
    activeSerial = await waitForEmulatorBoot(plan.adbPath, priorSerials, timeoutSeconds, activeSerial, bootedProcess);
    stages.push({ stage: "boot-emulator", status: "passed", detail: `Booted ${activeSerial}` });

    stages.push(...await verifyDeviceSuite(plan.adbPath, activeSerial, plan, ctx.rootDir));
  } finally {
    const processStillRunning = bootedProcess !== undefined
      && bootedProcess.exitCode === null
      && bootedProcess.signalCode === null;
    if (bootedProcess && activeSerial) {
      try {
        runTool(plan.adbPath, ["-s", activeSerial, "emu", "kill"]);
        stages.push({ stage: "teardown", status: "passed", detail: `Stopped ${activeSerial}` });
      } catch {
        if (processStillRunning) bootedProcess.kill("SIGTERM");
        stages.push({ stage: "teardown", status: "passed", detail: `Terminated emulator process for ${activeSerial}` });
      }
    } else if (bootedProcess && processStillRunning) {
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
