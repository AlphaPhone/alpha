import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import timersPromises from "node:timers/promises";
import type { CliContext, CommandResult } from "../runner.ts";
import {
  adbShell,
  adbWithSerial,
  assertSafeEmulatorSerial,
  buildEmulatorPlan,
  ensureAndBootEmulator,
  inspectLauncherActivities,
  stopBootedEmulator,
  type EmulatorToolchainPlan,
} from "./alpha-next-emulator.ts";
import {
  WALKTHROUGH_VIEWS,
  buildWalkthroughStoryboard,
  renderWalkthroughVideo,
  type WalkthroughRenderReport,
} from "./alpha-next-walkthrough-render.ts";

/** Validated action modes for `pnpm cli alpha-next walkthrough`. */
export type WalkthroughAction = "capture-web" | "capture-android" | "render" | "all";

/** CLI flags for `pnpm cli alpha-next walkthrough`. */
export interface WalkthroughFlags {
  readonly action: WalkthroughAction;
  readonly dryRun: boolean;
  readonly out: string | undefined;
  readonly url: string | undefined;
  readonly apkDir: string | undefined;
  readonly avd: string | undefined;
  readonly serial: string | undefined;
  readonly timeout: string | undefined;
}

/** Resolved capture/render toolchain inventory for `alpha-next walkthrough`. */
export interface WalkthroughPlan {
  readonly action: WalkthroughAction;
  readonly outDir: string;
  readonly url: string | null;
  readonly ffmpegPath: string | null;
  readonly ffprobePath: string | null;
  readonly magickPath: string | null;
  readonly playwrightReady: boolean;
  readonly brandAssetsReady: boolean;
  readonly emulatorPlan: EmulatorToolchainPlan;
  readonly viewsCount: number;
  readonly chapterCount: number;
  readonly missingTools: readonly string[];
}

/** One captured PNG screenshot or MP4 clip receipt. */
export interface CapturedArtifact {
  readonly name: string;
  readonly kind: "screenshot" | "video";
  readonly path: string;
  readonly sizeBytes: number;
}

/** Structured report returned by `pnpm cli alpha-next walkthrough`. */
export interface WalkthroughReport {
  readonly subcommand: "walkthrough";
  readonly action: WalkthroughAction;
  readonly mode: "dry-run" | "live";
  readonly ready: boolean;
  readonly plan: WalkthroughPlan;
  readonly webCaptures?: readonly CapturedArtifact[];
  readonly androidCaptures?: readonly CapturedArtifact[];
  readonly render?: WalkthroughRenderReport;
}

const DEFAULT_WALKTHROUGH_OUT = "/home/shaw/.gemini/antigravity-cli/brain/240cfcd2-998f-4931-9d15-b9f86c648ec5/walkthrough";
const DEFAULT_WALKTHROUGH_PORT = 4179;
const DEFAULT_BOOT_TIMEOUT_SECONDS = 180;
const ACCESSIBILITY_COMPONENT = "ai.alphacompute.alphaphone/ai.alphacompute.control.AlphaAccessibilityService";

const OVERLAY_SCENES = [
  { id: "overlay-bar", detent: "bar", query: "?surface=overlay" },
  { id: "overlay-typing", detent: "typing", query: "?surface=overlay" },
  { id: "overlay-sheet", detent: "sheet", query: "?surface=overlay" },
  { id: "overlay-full", detent: "full", query: "?surface=overlay" },
  { id: "overlay-voice", detent: "voice", query: "?surface=overlay" },
  { id: "overlay-control-banner", detent: "control", query: "?surface=overlay" },
] as const;

/** Validate whether a positional argument is a supported `walkthrough` action. */
export function isWalkthroughAction(value: string): value is WalkthroughAction {
  return value === "capture-web" || value === "capture-android" || value === "render" || value === "all";
}

function findBinary(name: string): string | null {
  try {
    const resolved = execFileSync("which", [name], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return resolved !== "" && fs.existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/** Build the walkthrough capture/render toolchain plan without booting emulators or writing files. */
export function buildWalkthroughPlan(flags: WalkthroughFlags, ctx: CliContext): WalkthroughPlan {
  const outDir = flags.out ? path.resolve(ctx.cwd, flags.out) : DEFAULT_WALKTHROUGH_OUT;
  const ffmpegPath = findBinary("ffmpeg");
  const ffprobePath = findBinary("ffprobe");
  const magickPath = findBinary("magick");
  const playwrightPkg = path.join(ctx.rootDir, "node_modules/playwright/package.json");
  const playwrightPnpm = path.join(ctx.rootDir, "node_modules/.pnpm");
  const playwrightReady = fs.existsSync(playwrightPkg)
    || (fs.existsSync(playwrightPnpm) && fs.readdirSync(playwrightPnpm).some((entry) => entry.startsWith("playwright@")));

  const requiredAssets = [
    "packages/design-system/brand/wordmark.svg",
    "packages/design-system/brand/mark.svg",
    "packages/design-system/fonts/public-sans-latin.woff2",
    "packages/design-system/fonts/fraunces-italic-400.ttf",
  ];
  const brandAssetsReady = requiredAssets.every((rel) => fs.existsSync(path.join(ctx.rootDir, rel)));
  const emulatorPlan = buildEmulatorPlan({
    dryRun: flags.dryRun,
    apkDir: flags.apkDir,
    avd: flags.avd,
    serial: flags.serial,
    timeout: flags.timeout,
  }, ctx);

  const missingTools: string[] = [];
  if ((flags.action === "capture-web" || flags.action === "render" || flags.action === "all") && !playwrightReady) {
    missingTools.push("playwright");
  }
  if (flags.action === "render" || flags.action === "all") {
    if (!ffmpegPath) missingTools.push("ffmpeg");
    if (!ffprobePath) missingTools.push("ffprobe");
    if (!brandAssetsReady) missingTools.push("design-system-brand-assets");
  }
  if (flags.action === "capture-android" || flags.action === "all") {
    missingTools.push(...emulatorPlan.missingTools);
  }

  return {
    action: flags.action,
    outDir,
    url: flags.url ?? null,
    ffmpegPath,
    ffprobePath,
    magickPath,
    playwrightReady,
    brandAssetsReady,
    emulatorPlan,
    viewsCount: WALKTHROUGH_VIEWS.length,
    chapterCount: buildWalkthroughStoryboard(outDir).length,
    missingTools: [...new Set(missingTools)],
  };
}

async function waitForHttpReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await timersPromises.scheduler.wait(400);
      continue;
    }
    await timersPromises.scheduler.wait(400);
  }
  throw new Error(`Timed out waiting for Vite server at ${url}`);
}

async function captureWebViews(
  plan: WalkthroughPlan,
  rootDir: string,
): Promise<readonly CapturedArtifact[]> {
  const webDir = path.join(plan.outDir, "captures/web");
  fs.mkdirSync(webDir, { recursive: true });

  let viteProcess: ChildProcess | undefined;
  const baseUrl = plan.url ?? `http://127.0.0.1:${String(DEFAULT_WALKTHROUGH_PORT)}`;
  if (!plan.url) {
    const viteBin = path.join(rootDir, "apps/app/node_modules/.bin/vite");
    viteProcess = spawn(viteBin, ["--host", "127.0.0.1", "--port", String(DEFAULT_WALKTHROUGH_PORT), "--strictPort"], {
      cwd: path.join(rootDir, "apps/app"),
      env: { ...process.env, ALPHA_FAKES: "phone" },
      stdio: "ignore",
    });
    await waitForHttpReady(baseUrl, 45_000);
  }

  const captures: CapturedArtifact[] = [];
  const playwrightMod = await import("playwright");
  const browser = await playwrightMod.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2,
      colorScheme: "light",
    });
    const page = await context.newPage();

    const shoot = async (name: string, query: string, afterLoad?: () => Promise<void>) => {
      await page.goto(`${baseUrl}/${query}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await timersPromises.scheduler.wait(1200);
      if (afterLoad) await afterLoad();
      const outPath = path.join(webDir, `${name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      captures.push({
        name,
        kind: "screenshot",
        path: outPath,
        sizeBytes: fs.statSync(outPath).size,
      });
    };

    for (const descriptor of WALKTHROUGH_VIEWS) {
      await shoot(`app-${descriptor.id}`, `?surface=app&view=${encodeURIComponent(descriptor.view)}`);
    }

    for (const scene of OVERLAY_SCENES) {
      await shoot(scene.id, scene.query, async () => {
        if (scene.detent === "typing") {
          const input = page.locator("textarea, input[type='text'], [contenteditable='true']").first();
          if (await input.count() > 0) {
            await input.click({ timeout: 2000 }).catch(() => undefined);
            await input.fill("Summarize my unread messages and draft a reply").catch(() => undefined);
          }
        } else if (scene.detent === "sheet" || scene.detent === "full") {
          const askButton = page.getByRole("button", { name: /ask|send|expand|open/i }).first();
          if (await askButton.count() > 0) {
            await askButton.click({ timeout: 2000 }).catch(() => undefined);
          }
        } else if (scene.detent === "voice") {
          const talkButton = page.getByRole("button", { name: /talk|voice|mic/i }).first();
          if (await talkButton.count() > 0) {
            await talkButton.click({ timeout: 2000 }).catch(() => undefined);
          }
        }
        await timersPromises.scheduler.wait(500);
      });
    }

    await shoot("monolith-home", "?surface=monolith");
    await context.close();
  } finally {
    await browser.close();
    if (viteProcess && viteProcess.exitCode === null) {
      viteProcess.kill("SIGTERM");
    }
  }

  fs.writeFileSync(
    path.join(webDir, "manifest.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, captures }, null, 2)}\n`,
    "utf8",
  );
  return captures;
}

function captureEmulatorPng(
  adbPath: string,
  serial: string,
  outPath: string,
  allowExplicitNonEmulator: boolean,
): CapturedArtifact {
  const safeSerial = assertSafeEmulatorSerial(serial, allowExplicitNonEmulator);
  const png = execFileSync(adbPath, ["-s", safeSerial, "exec-out", "screencap", "-p"], {
    maxBuffer: 25 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  fs.writeFileSync(outPath, png);
  return {
    name: path.basename(outPath, ".png"),
    kind: "screenshot",
    path: outPath,
    sizeBytes: png.length,
  };
}

async function captureAndroidSuite(
  plan: WalkthroughPlan,
  flags: WalkthroughFlags,
  rootDir: string,
): Promise<readonly CapturedArtifact[]> {
  const emulatorPlan = plan.emulatorPlan;
  if (!emulatorPlan.adbPath) {
    throw new Error("Android adb binary not found.");
  }
  const androidDir = path.join(plan.outDir, "captures/android");
  fs.mkdirSync(androidDir, { recursive: true });
  const timeoutSeconds = flags.timeout ? Number(flags.timeout) : DEFAULT_BOOT_TIMEOUT_SECONDS;
  const allowExplicitNonEmulator = flags.serial !== undefined;

  const captures: CapturedArtifact[] = [];
  let bootedProcess: ChildProcess | undefined;
  let activeSerial: string | undefined = flags.serial;

  try {
    const booted = await ensureAndBootEmulator(emulatorPlan, timeoutSeconds, flags.serial);
    bootedProcess = booted.bootedProcess;
    activeSerial = booted.serial;
    const shell = (cmd: readonly string[]) => adbShell(emulatorPlan.adbPath!, activeSerial!, cmd, allowExplicitNonEmulator);

    for (const relApk of emulatorPlan.discoveredApks) {
      adbWithSerial(emulatorPlan.adbPath, activeSerial, ["install", "-r", "-g", path.join(rootDir, relApk)], allowExplicitNonEmulator);
    }

    shell(["wm", "dismiss-keyguard"]);
    shell(["input", "keyevent", "KEYCODE_HOME"]);
    await timersPromises.scheduler.wait(1500);
    captures.push(captureEmulatorPng(emulatorPlan.adbPath, activeSerial, path.join(androidDir, "launcher3-home.png"), allowExplicitNonEmulator));

    shell(["input", "swipe", "540", "1900", "540", "400", "300"]);
    await timersPromises.scheduler.wait(1200);
    captures.push(captureEmulatorPng(emulatorPlan.adbPath, activeSerial, path.join(androidDir, "launcher3-drawer.png"), allowExplicitNonEmulator));
    shell(["input", "keyevent", "KEYCODE_HOME"]);

    const launcherDump = shell([
      "cmd",
      "package",
      "query-activities",
      "--brief",
      "-a",
      "android.intent.action.MAIN",
      "-c",
      "android.intent.category.LAUNCHER",
    ]);
    const launcherInfo = inspectLauncherActivities(launcherDump);
    for (const activity of launcherInfo.thinAlphaActivities) {
      const pkg = activity.split("/")[0] ?? "";
      const appId = pkg.replace(/^ai\.alphacompute\./, "");
      shell(["am", "start", "-W", "-n", activity]);
      await timersPromises.scheduler.wait(1800);
      captures.push(
        captureEmulatorPng(emulatorPlan.adbPath, activeSerial, path.join(androidDir, `app-${appId}.png`), allowExplicitNonEmulator),
      );
    }

    shell(["settings", "put", "secure", "enabled_accessibility_services", ACCESSIBILITY_COMPONENT]);
    shell(["settings", "put", "secure", "accessibility_enabled", "1"]);
    await timersPromises.scheduler.wait(1000);

    const recordRemote = "/sdcard/alpha-next-control.mp4";
    const safeSerial = assertSafeEmulatorSerial(activeSerial, allowExplicitNonEmulator);
    const recorder = spawn(emulatorPlan.adbPath, [
      "-s",
      safeSerial,
      "shell",
      "screenrecord",
      "--bit-rate",
      "8000000",
      "--time-limit",
      "10",
      recordRemote,
    ], { stdio: "ignore" });

    shell(["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://example.com"]);
    await timersPromises.scheduler.wait(2500);
    captures.push(captureEmulatorPng(emulatorPlan.adbPath, activeSerial, path.join(androidDir, "third-party-browser.png"), allowExplicitNonEmulator));

    shell(["am", "start", "-W", "-a", "android.settings.SETTINGS"]);
    await timersPromises.scheduler.wait(2000);
    captures.push(captureEmulatorPng(emulatorPlan.adbPath, activeSerial, path.join(androidDir, "blocked-settings.png"), allowExplicitNonEmulator));

    await new Promise<void>((resolve) => {
      recorder.once("close", () => resolve());
      recorder.once("error", () => resolve());
    });
    const localClip = path.join(androidDir, "clip-browser-control.mp4");
    try {
      adbWithSerial(emulatorPlan.adbPath, activeSerial, ["pull", recordRemote, localClip], allowExplicitNonEmulator);
      shell(["rm", "-f", recordRemote]);
      if (fs.existsSync(localClip)) {
        captures.push({
          name: "clip-browser-control",
          kind: "video",
          path: localClip,
          sizeBytes: fs.statSync(localClip).size,
        });
      }
    } catch {
      shell(["rm", "-f", recordRemote]);
    }
  } finally {
    stopBootedEmulator(emulatorPlan.adbPath, activeSerial, bootedProcess, allowExplicitNonEmulator);
  }

  fs.writeFileSync(
    path.join(androidDir, "manifest.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), captures }, null, 2)}\n`,
    "utf8",
  );
  return captures;
}

/** Execute `pnpm cli alpha-next walkthrough [capture-web|capture-android|render|all]`. */
export async function runWalkthrough(
  flags: WalkthroughFlags,
  ctx: CliContext,
): Promise<CommandResult<WalkthroughReport>> {
  const plan = buildWalkthroughPlan(flags, ctx);
  if (flags.dryRun) {
    const ready = plan.missingTools.length === 0;
    const report: WalkthroughReport = {
      subcommand: "walkthrough",
      action: flags.action,
      mode: "dry-run",
      ready,
      plan,
    };
    const lines = [
      `alpha-next walkthrough ${flags.action} (dry-run)  ready:${String(ready)}  views:${String(plan.viewsCount)}  chapters:${String(plan.chapterCount)}`,
      `  outDir: ${plan.outDir}`,
      `  playwright:${String(plan.playwrightReady)}  ffmpeg:${String(plan.ffmpegPath !== null)}  magick:${String(plan.magickPath !== null)}  brandAssets:${String(plan.brandAssetsReady)}`,
      `  apks: ${String(plan.emulatorPlan.discoveredApks.length)} found`,
      ...(plan.missingTools.length > 0 ? [`  missing: ${plan.missingTools.join(", ")}`] : []),
    ];
    return { ok: true, data: report, lines };
  }

  if (plan.missingTools.length > 0) {
    return {
      ok: false,
      message: `Walkthrough toolchain incomplete for "${flags.action}": missing ${plan.missingTools.join(", ")}.`,
      data: {
        subcommand: "walkthrough",
        action: flags.action,
        mode: "live",
        ready: false,
        plan,
      },
    };
  }

  let webCaptures: readonly CapturedArtifact[] | undefined;
  let androidCaptures: readonly CapturedArtifact[] | undefined;
  let renderReport: WalkthroughRenderReport | undefined;

  if (flags.action === "capture-web" || flags.action === "all") {
    webCaptures = await captureWebViews(plan, ctx.rootDir);
  }
  if (flags.action === "capture-android" || flags.action === "all") {
    androidCaptures = await captureAndroidSuite(plan, flags, ctx.rootDir);
  }
  if (flags.action === "render" || flags.action === "all") {
    if (!plan.ffmpegPath || !plan.ffprobePath) {
      return { ok: false, message: "ffmpeg and ffprobe are required for walkthrough render." };
    }
    renderReport = await renderWalkthroughVideo(
      plan.outDir,
      ctx.rootDir,
      plan.ffmpegPath,
      plan.ffprobePath,
      plan.magickPath,
    );
  }

  const report: WalkthroughReport = {
    subcommand: "walkthrough",
    action: flags.action,
    mode: "live",
    ready: true,
    plan,
    ...(webCaptures !== undefined ? { webCaptures } : {}),
    ...(androidCaptures !== undefined ? { androidCaptures } : {}),
    ...(renderReport !== undefined ? { render: renderReport } : {}),
  };

  const lines = [
    `alpha-next walkthrough ${flags.action} (live)  outDir:${plan.outDir}`,
    ...(webCaptures ? [`  webCaptures: ${String(webCaptures.length)} artifact(s)`] : []),
    ...(androidCaptures ? [`  androidCaptures: ${String(androidCaptures.length)} artifact(s)`] : []),
    ...(renderReport
      ? [
        `  video: ${renderReport.video.videoPath} (${String(renderReport.video.width)}x${String(renderReport.video.height)} @${String(renderReport.video.fps)}fps, ${String(renderReport.video.durationSec)}s, ${renderReport.video.codec}/${renderReport.video.audioCodec ?? "none"})`,
        `  contactSheets: ${renderReport.contactSheets.join(", ") || "none"}`,
      ]
      : []),
  ];
  return { ok: true, data: report, lines };
}
