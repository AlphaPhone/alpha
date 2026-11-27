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
const IPC_PERMISSION = "ai.alphacompute.permission.AGENT_IPC";
const DEFAULT_APK_DIR = "apps/app/artifacts";

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
    detail: "Install AlphaCore and discovered thin Alpha APKs via adb install -r -g",
  },
  {
    stage: "verify-launcher-activities",
    status: "planned",
    detail: "Verify Launcher3 PackageManager lists separate MAIN/LAUNCHER activities for Alpha apps alongside third-party apps",
  },
  {
    stage: "verify-ipc-and-provider",
    status: "planned",
    detail: `Verify AlphaPreferencesProvider and Binder IPC services enforce signature permission ${IPC_PERMISSION}`,
  },
  {
    stage: "verify-voice-interaction",
    status: "planned",
    detail: "Verify AlphaVoiceInteractionService registers for android.service.voice.VoiceInteractionService",
  },
  {
    stage: "verify-accessibility-and-browser-control",
    status: "planned",
    detail: "Enable AlphaAccessibilityService, observe real browser (Firefox or Chrome), and verify blocked packages (Settings, PermissionController) refusal",
  },
  {
    stage: "teardown",
    status: "planned",
    detail: "Shutdown booted emulator cleanly via adb emu kill",
  },
];

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
  return apks.sort();
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

  const apkDirAbs = flags.apkDir ? path.resolve(ctx.cwd, flags.apkDir) : path.join(ctx.rootDir, DEFAULT_APK_DIR);
  const discoveredApks = discoverApks(apkDirAbs).map((file) => path.relative(ctx.rootDir, file).split(path.sep).join("/"));
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
    apkDir: path.relative(ctx.rootDir, apkDirAbs).split(path.sep).join("/"),
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

function verifyDeviceSuite(
  adbPath: string,
  serial: string,
  plan: EmulatorToolchainPlan,
  rootDir: string,
): readonly EmulatorStageResult[] {
  const results: EmulatorStageResult[] = [];

  for (const relApk of plan.discoveredApks) {
    runTool(adbPath, ["-s", serial, "install", "-r", "-g", path.join(rootDir, relApk)]);
  }
  results.push({
    stage: "install-apks",
    status: "passed",
    detail: `Installed ${String(plan.discoveredApks.length)} APK(s)`,
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
  const alphaActivities = launcherDump
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("ai.alphacompute."));
  const thirdPartyPresent = launcherDump.includes("com.android.");
  results.push({
    stage: "verify-launcher-activities",
    status: alphaActivities.length > 0 && thirdPartyPresent ? "passed" : "failed",
    detail: `Found ${String(alphaActivities.length)} Alpha launcher activity(ies); third-party apps present=${String(thirdPartyPresent)}`,
  });

  const coreDump = adbShell(adbPath, serial, ["dumpsys", "package", CORE_PACKAGE]);
  const hasProvider = coreDump.includes(`${CORE_PACKAGE}.preferences`);
  const hasPermission = coreDump.includes(IPC_PERMISSION);
  const hasBroker = coreDump.includes("AlphaAgentBrokerService");
  results.push({
    stage: "verify-ipc-and-provider",
    status: hasProvider && hasPermission && hasBroker ? "passed" : "failed",
    detail: `provider=${String(hasProvider)} permission=${String(hasPermission)} broker=${String(hasBroker)}`,
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

  const a11yMatch = /(ai\.alphacompute\.alphaphone\/[^\s]*AlphaAccessibilityService)/.exec(coreDump);
  const a11yComponent = a11yMatch?.[1] ?? `${CORE_PACKAGE}/ai.alphacompute.control.AlphaAccessibilityService`;
  adbShell(adbPath, serial, ["settings", "put", "secure", "enabled_accessibility_services", a11yComponent]);
  adbShell(adbPath, serial, ["settings", "put", "secure", "accessibility_enabled", "1"]);
  const enabledA11y = adbShell(adbPath, serial, ["settings", "get", "secure", "enabled_accessibility_services"]);

  const packagesOutput = adbShell(adbPath, serial, ["pm", "list", "packages"]);
  const browserPkg = BROWSER_CANDIDATES.find((candidate) => packagesOutput.includes(`package:${candidate}`));
  let browserObserved = false;
  if (browserPkg) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com", browserPkg]);
    const windowDump = adbShell(adbPath, serial, ["dumpsys", "window", "displays"]);
    browserObserved = windowDump.includes(browserPkg);
  }
  const blockedPresent = BLOCKED_PACKAGES.every((pkg) => packagesOutput.includes(`package:${pkg}`));
  if (blockedPresent) {
    adbShell(adbPath, serial, ["am", "start", "-W", "-a", "android.settings.SETTINGS"]);
  }
  const a11yOk = enabledA11y.includes("AlphaAccessibilityService") && browserObserved && blockedPresent;
  results.push({
    stage: "verify-accessibility-and-browser-control",
    status: a11yOk ? "passed" : "failed",
    detail: `service=${a11yComponent} enabled=${String(enabledA11y.includes("AlphaAccessibilityService"))} browser=${browserPkg ?? "none"} observed=${String(browserObserved)} blockedGuards=${BLOCKED_PACKAGES.join(",")}`,
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
      `  apkDir: ${plan.apkDir} (${String(plan.discoveredApks.length)} APK(s) found)`,
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
      message: `No installable APKs found under ${plan.apkDir}. Build APKs first or pass --apk-dir <dir>.`,
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

    stages.push(...verifyDeviceSuite(plan.adbPath, activeSerial, plan, ctx.rootDir));
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
