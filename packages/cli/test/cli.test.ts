import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  REQUIRED_CORE_COMPONENTS,
  commands,
  cssLengthToDp,
  defineCommand,
  extractPackageUid,
  inspectAccessibilityDump,
  inspectCorePackageDump,
  inspectCrossAppIpcLog,
  inspectLauncherActivities,
  oklchToHex,
  runCli,
  scanSecurityInvariants,
  sortApksCoreFirst,
  validateSuiteManifest,
  type CliIo,
  type EmulatorE2eReport,
  type SyncFontsReport,
  type SyncTokensReport,
  type ValidateReport,
} from "../src/index.ts";

const templateRoot = path.resolve(import.meta.dirname, "../../..");
const mainPath = path.resolve(import.meta.dirname, "../src/main.ts");

const ALL_18_VIEWS = [
  "Phone",
  "Messages",
  "Contacts",
  "Browser",
  "Inbox",
  "Telegram",
  "Slack",
  "Calendar",
  "Clock",
  "Reminders",
  "Camera",
  "Photos",
  "Maps",
  "Notes",
  "Files",
  "Workflows",
  "Wallet",
  "Settings",
] as const;

function createRecorder(): { readonly io: CliIo; readonly out: () => string; readonly err: () => string } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      writeOut: (text) => {
        stdout.push(text);
      },
      writeErr: (text) => {
        stderr.push(text);
      },
    },
    out: () => stdout.join(""),
    err: () => stderr.join(""),
  };
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function makeValidSuiteManifest() {
  return {
    schemaVersion: 1,
    corePackage: "ai.alphacompute.alphaphone",
    ipcPermission: "ai.alphacompute.permission.AGENT_IPC",
    apps: [
      {
        id: "core",
        view: null,
        surface: "overlay",
        applicationId: "ai.alphacompute.alphaphone",
        label: "Alpha",
        defaultRoles: ["ROLE_ASSISTANT"],
        permissions: ["android.permission.INSTALL_SELF_UPDATES"],
        allowedAgentRoutePrefixes: ["*"],
        allowedCloudRoutePrefixes: ["*"],
        allowedSecureStoreSlots: ["*"],
        assetsProfile: "core",
      },
      ...ALL_18_VIEWS.map((view) => ({
        id: view.toLowerCase(),
        view,
        surface: "app",
        applicationId: `ai.alphacompute.${view.toLowerCase()}`,
        label: view,
        defaultRoles: view === "Phone" ? ["ROLE_DIALER"] : view === "Messages" ? ["ROLE_SMS"] : [],
        permissions: ["ai.alphacompute.permission.AGENT_IPC"],
        allowedAgentRoutePrefixes: ["/api/health", "/api/status"],
        allowedCloudRoutePrefixes: [],
        allowedSecureStoreSlots: [],
        assetsProfile: view === "Camera" || view === "Files" ? "ocr" : "thin",
      })),
    ],
  };
}

describe("project CLI", () => {
  test("lists registered commands in human and JSON help output", async () => {
    const human = createRecorder();
    expect(await runCli({ argv: ["--help"], commands, rootDir: templateRoot, cwd: templateRoot, io: human.io })).toBe(0);
    expect(human.out()).toContain("Usage: pnpm cli <command> [options]");
    expect(human.out()).toContain("status");
    expect(human.out()).toContain("alpha-next");

    const structured = createRecorder();
    expect(await runCli({ argv: ["help", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: structured.io })).toBe(0);
    expect(parseJson(structured.out())).toEqual({
      ok: true,
      command: "help",
      data: {
        commands: [
          {
            name: "status",
            summary: "Inspect workspace packages, specs, and generated outputs",
            usage: "pnpm cli status [--package <name|path>] [--json]",
            flags: {
              package: {
                kind: "string",
                short: "p",
                description: "Filter to one workspace package by name or relative path",
              },
            },
          },
          {
            name: "alpha-next",
            summary: "Alpha NEXT Android token/font sync, manifest, validation, and emulator levers",
            usage: "pnpm cli alpha-next <sync-tokens|sync-fonts|manifest|validate|emulator-e2e> [options]",
            flags: {
              check: {
                kind: "boolean",
                description: "Verify generated resources or validation gates without writing",
              },
              write: {
                kind: "boolean",
                description: "Write generated Android resources or fonts to target directories",
              },
              "with-fonts": {
                kind: "boolean",
                description: "Also derive Launcher3 .ttf fonts and alpha_fonts.xml during sync-tokens",
              },
              aapt2: {
                kind: "boolean",
                description: "Run Android SDK aapt2 compile on Launcher3 overlay resources during validate",
              },
              "dry-run": {
                kind: "boolean",
                description: "Inspect Tier-1 emulator toolchain and plan without booting an AVD",
              },
              target: {
                kind: "string",
                short: "t",
                description: "Token sync target: all, launcher3, or ipc",
              },
              out: {
                kind: "string",
                short: "o",
                description: "Override root output directory for generated resources",
              },
              tokens: {
                kind: "string",
                description: "Override path to design-system tokens.json",
              },
              suite: {
                kind: "string",
                description: "Override path to Android suite apps.json registry",
              },
              "apk-dir": {
                kind: "string",
                description: "Directory containing built AlphaCore and thin Alpha APKs for emulator-e2e",
              },
              avd: {
                kind: "string",
                description: "Android Virtual Device name for emulator-e2e (default: alpha_next_api35)",
              },
              serial: {
                kind: "string",
                description: "Target ADB device serial for emulator-e2e",
              },
              timeout: {
                kind: "string",
                description: "Boot timeout in seconds for emulator-e2e (default: 180)",
              },
            },
          },
        ],
      },
    });

    const single = createRecorder();
    expect(await runCli({ argv: ["status", "--help", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: single.io })).toBe(0);
    expect(parseJson(single.out())).toEqual({
      ok: true,
      command: "help",
      data: {
        name: "status",
        summary: "Inspect workspace packages, specs, and generated outputs",
        usage: "pnpm cli status [--package <name|path>] [--json]",
        flags: {
          package: {
            kind: "string",
            short: "p",
            description: "Filter to one workspace package by name or relative path",
          },
        },
      },
    });
  });

  test("status inspects workspace packages and specs and supports filtering", async () => {
    const all = createRecorder();
    expect(await runCli({ argv: ["status", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: all.io })).toBe(0);
    const parsed = parseJson(all.out()) as {
      readonly ok: boolean;
      readonly command: string;
      readonly data: {
        readonly project: string;
        readonly specs: readonly string[];
        readonly packages: readonly { readonly name: string; readonly path: string }[];
      };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe("status");
    expect(parsed.data.specs).toContain("spec/index.md");
    expect(parsed.data.packages.map((pkg) => pkg.name)).toEqual(expect.arrayContaining(["@repo/app", "@repo/cli", "@repo/design-system", "@repo/ui"]));

    const filtered = createRecorder();
    expect(await runCli({ argv: ["status", "-p", "@repo/app", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: filtered.io })).toBe(0);
    const filteredParsed = parseJson(filtered.out()) as {
      readonly ok: boolean;
      readonly command: string;
      readonly data: {
        readonly packages: readonly { readonly name: string; readonly path: string }[];
      };
    };
    expect(filteredParsed.ok).toBe(true);
    expect(filteredParsed.command).toBe("status");
    expect(filteredParsed.data.packages.map((pkg) => ({ name: pkg.name, path: pkg.path }))).toEqual([
      { name: "@repo/app", path: "apps/app" },
    ]);

    const missing = createRecorder();
    expect(await runCli({ argv: ["status", "--package", "@repo/missing", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: missing.io })).toBe(1);
    const missingParsed = parseJson(missing.out()) as { readonly ok: boolean; readonly command: string; readonly error: string };
    expect(missingParsed.ok).toBe(false);
    expect(missingParsed.command).toBe("status");
    expect(missingParsed.error).toContain("@repo/missing");
  });

  test("returns exit code 2 on unknown commands and unknown flags", async () => {
    const unknownCmd = createRecorder();
    expect(await runCli({ argv: ["nope"], commands, rootDir: templateRoot, cwd: templateRoot, io: unknownCmd.io })).toBe(2);
    expect(unknownCmd.err()).toContain('Unknown command "nope"');

    const unknownFlag = createRecorder();
    expect(await runCli({ argv: ["status", "--bogus", "--json"], commands, rootDir: templateRoot, cwd: templateRoot, io: unknownFlag.io })).toBe(2);
    expect(parseJson(unknownFlag.out())).toMatchObject({
      ok: false,
      command: "status",
    });

    const failing = defineCommand({
      name: "boom",
      summary: "Throws at runtime",
      run: () => {
        throw new Error("corrupt state");
      },
    });

    const textFailure = createRecorder();
    expect(await runCli({ argv: ["boom"], commands: [failing], rootDir: templateRoot, cwd: templateRoot, io: textFailure.io })).toBe(1);
    expect(textFailure.err()).toBe("error: corrupt state\n");

    const jsonFailure = createRecorder();
    expect(await runCli({ argv: ["boom", "--json"], commands: [failing], rootDir: templateRoot, cwd: templateRoot, io: jsonFailure.io })).toBe(1);
    expect(parseJson(jsonFailure.out())).toEqual({
      ok: false,
      command: "boom",
      error: "corrupt state",
    });
  });

  test("defineCommand parses typed flags and positionals for custom levers", async () => {
    const custom = defineCommand({
      name: "echo",
      summary: "Echo input",
      flags: {
        upper: { kind: "boolean", short: "u", description: "Uppercase output" },
        prefix: { kind: "string", description: "Prefix text" },
      },
      run: ({ flags, positionals }) => {
        const joined = positionals.join(" ");
        const body = flags.upper ? joined.toUpperCase() : joined;
        const text = flags.prefix ? `${flags.prefix}:${body}` : body;
        return { ok: true, data: { text }, lines: [text] };
      },
    });

    const recorded = createRecorder();
    expect(await runCli({
      argv: ["echo", "-u", "--prefix", "ok", "hello", "world"],
      commands: [custom],
      rootDir: templateRoot,
      cwd: templateRoot,
      io: recorded.io,
    })).toBe(0);
    expect(recorded.out()).toBe("ok:HELLO WORLD\n");
  });

  test("executes directly on Node 26 via src/main.ts", () => {
    const stdout = execFileSync(process.execPath, [mainPath, "status", "--json"], {
      cwd: templateRoot,
      encoding: "utf8",
    });
    const parsed = parseJson(stdout) as {
      readonly ok: boolean;
      readonly command: string;
      readonly data: {
        readonly packages: readonly { readonly name: string }[];
      };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe("status");
    expect(parsed.data.packages.map((pkg) => pkg.name)).toContain("@repo/cli");
  });

  test("converts OKLCH colors and CSS lengths accurately for Android resources", () => {
    expect(oklchToHex("oklch(1 0 0)")).toBe("#FFFFFF");
    expect(oklchToHex("oklch(0 0 0)")).toBe("#000000");
    expect(oklchToHex("oklch(0.45201372 0.31321437 264.05202064)")).toBe("#0000FF");
    expect(oklchToHex("oklch(0.98510365 0 0)")).toBe("#FAFAFA");
    expect(oklchToHex("oklch(0.70366126 0.15682550 277.95756294)")).toMatch(/^#[0-9A-F]{6}$/);
    expect(() => oklchToHex("rgb(0, 0, 255)")).toThrow("Invalid oklch color value");

    expect(cssLengthToDp("1rem")).toBe("16dp");
    expect(cssLengthToDp("1.375rem")).toBe("22dp");
    expect(cssLengthToDp("1.125rem")).toBe("18dp");
    expect(cssLengthToDp("1.9375rem")).toBe("31dp");
    expect(cssLengthToDp("1.875rem")).toBe("30dp");
    expect(cssLengthToDp("2px")).toBe("2dp");
    expect(() => cssLengthToDp("10em")).toThrow("Invalid CSS length value");
  });

  test("alpha-next sync-tokens, sync-fonts, and aapt2 compile work end-to-end without touching design-system fonts", async () => {
    const fontsBefore = fs.readdirSync(path.join(templateRoot, "packages/design-system/fonts")).sort();
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-next-tokens-"));
    try {
      const writeRun = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--write", "--with-fonts", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: writeRun.io,
      })).toBe(0);

      const report = parseJson(writeRun.out()) as { readonly ok: boolean; readonly data: SyncTokensReport };
      expect(report.ok).toBe(true);
      expect(report.data.mode).toBe("write");
      expect(report.data.colorCounts).toEqual({ light: 41, dark: 28 });
      expect(report.data.fontSync?.files.map((item) => item.relativePath)).toEqual([
        "apps/app/aosp/launcher3/overlay/res/font/alpha_public_sans.ttf",
        "apps/app/aosp/launcher3/overlay/res/font/fraunces_italic_400.ttf",
        "apps/app/aosp/launcher3/overlay/res/xml/alpha_fonts.xml",
      ]);
      expect(report.data.fontSync?.files[0]?.sha256).toBe("bbf4e1f31aec30b8e0b06825f411666a8f7d7c6954c3ac61779bbaf789df1611");

      const checkTokens = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--check", "--with-fonts", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: checkTokens.io,
      })).toBe(0);

      const checkFonts = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-fonts", "--check", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: checkFonts.io,
      })).toBe(0);
      const fontsParsed = parseJson(checkFonts.out()) as { readonly ok: boolean; readonly data: SyncFontsReport };
      expect(fontsParsed.ok).toBe(true);
      expect(fontsParsed.data.files).toHaveLength(3);

      const validateAapt2 = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "validate", "--aapt2", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: validateAapt2.io,
      })).toBe(0);
      const validated = parseJson(validateAapt2.out()) as { readonly ok: boolean; readonly data: ValidateReport };
      expect(validated.ok).toBe(true);
      expect(validated.data.tokensInSync).toBe(true);
      expect(validated.data.securityPassed).toBe(true);
      expect(validated.data.aapt2?.ran).toBe(true);
      expect(validated.data.aapt2?.passed).toBe(true);

      const dimensPath = path.join(tmpOut, "apps/app/aosp/launcher3/overlay/res/values/dimens.xml");
      fs.writeFileSync(dimensPath, "<resources/>\n", "utf8");
      const staleCheck = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--check", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: staleCheck.io,
      })).toBe(1);
      const staleParsed = parseJson(staleCheck.out()) as { readonly ok: boolean; readonly data: SyncTokensReport };
      expect(staleParsed.ok).toBe(false);
      expect(staleParsed.data.stale).toEqual(["apps/app/aosp/launcher3/overlay/res/values/dimens.xml"]);
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }

    const fontsAfter = fs.readdirSync(path.join(templateRoot, "packages/design-system/fonts")).sort();
    expect(fontsAfter).toEqual(fontsBefore);
  });

  test("validates suite apps.json strictly and catches privilege, role, and uniqueness violations", () => {
    const valid = validateSuiteManifest(makeValidSuiteManifest(), "apps/app/android/suite/apps.json");
    expect(valid.status).toBe("valid");
    expect(valid.appsCount).toBe(19);
    expect(valid.viewsCovered).toHaveLength(18);
    expect(valid.missingViews).toEqual([]);

    const broken = makeValidSuiteManifest();
    broken.apps[1] = {
      ...broken.apps[1],
      defaultRoles: ["ROLE_ASSISTANT"],
      permissions: ["android.permission.INSTALL_SELF_UPDATES"],
      allowedAgentRoutePrefixes: ["*"],
    };
    const invalid = validateSuiteManifest(broken, "apps/app/android/suite/apps.json");
    expect(invalid.status).toBe("invalid");
    expect(invalid.issues.some((issue) => issue.includes("overlaps"))).toBe(true);
    expect(invalid.issues.some((issue) => issue.includes("INSTALL_SELF_UPDATES"))).toBe(true);
    expect(invalid.issues.some((issue) => issue.includes('wildcard "*"'))).toBe(true);
  });

  test("scans security invariants and flags sharedUserId, proprietary APKs, loopback IPC, and captureSecureLayers", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-next-sec-"));
    try {
      const manifestFile = path.join(tmpRoot, "apps/app/android/alpha-ipc/src/main/AndroidManifest.xml");
      const playApk = path.join(tmpRoot, "apps/app/aosp/sandboxed-play/gms.apk");
      const ipcJava = path.join(tmpRoot, "apps/app/android/alpha-ipc/src/main/java/Bad.java");
      const bridgeJava = path.join(tmpRoot, "apps/app/aosp/control-bridge/src/ai/alphacompute/control/AlphaControlBridgeService.java");
      for (const file of [manifestFile, playApk, ipcJava, bridgeJava]) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
      }
      fs.writeFileSync(manifestFile, '<manifest android:sharedUserId="ai.alphacompute.shared" />', "utf8");
      fs.writeFileSync(playApk, "fake-apk", "utf8");
      fs.writeFileSync(ipcJava, 'String url = "http://127.0.0.1:8080";', "utf8");
      fs.writeFileSync(bridgeJava, "boolean captureSecureLayers = true;", "utf8");

      const findings = scanSecurityInvariants(tmpRoot);
      expect(findings.every((item) => !item.passed)).toBe(true);

      fs.writeFileSync(bridgeJava, "boolean captureSecureLayers = false;", "utf8");
      const afterBridgeFix = scanSecurityInvariants(tmpRoot).find((item) => item.id === "capture-secure-layers-disabled");
      expect(afterBridgeFix?.passed).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("emulator-e2e --dry-run inspects SDK plan cleanly without launching an emulator", async () => {
    const dryRun = createRecorder();
    expect(await runCli({
      argv: ["alpha-next", "emulator-e2e", "--dry-run", "--json"],
      commands,
      rootDir: templateRoot,
      cwd: templateRoot,
      io: dryRun.io,
    })).toBe(0);
    const parsed = parseJson(dryRun.out()) as { readonly ok: boolean; readonly data: EmulatorE2eReport };
    expect(parsed.ok).toBe(true);
    expect(parsed.data.mode).toBe("dry-run");
    expect(parsed.data.plan.avdName).toBe("alpha_next_api35");
    expect(parsed.data.plan.apkDirs).toEqual(["apps/app/artifacts", "apps/app/android/suite/out"]);
    expect(parsed.data.plan.emulatorArgs).toContain("-no-window");
    expect(parsed.data.plan.emulatorArgs).toContain("swiftshader_indirect");
    expect(parsed.data.stages.map((stage) => stage.stage)).toEqual([
      "ensure-avd",
      "boot-emulator",
      "install-apks",
      "verify-launcher-activities",
      "verify-ipc-and-provider",
      "verify-voice-interaction",
      "verify-cross-app-ipc",
      "verify-accessibility-and-browser-control",
      "teardown",
    ]);

    const missingSub = createRecorder();
    expect(await runCli({
      argv: ["alpha-next", "--json"],
      commands,
      rootDir: templateRoot,
      cwd: templateRoot,
      io: missingSub.io,
    })).toBe(2);
  });

  test("verifies emulator dumps, APK install order, cross-APK IPC logs, and accessibility binding strictly", () => {
    expect(sortApksCoreFirst([
      "apps/app/android/suite/out/notes-debug.apk",
      "apps/app/artifacts/alpha-launcher-debug.apk",
      "apps/app/artifacts/ai.alphacompute.alphaphone-debug.apk",
      "apps/app/android/suite/out/browser-debug.apk",
    ])).toEqual([
      "apps/app/artifacts/ai.alphacompute.alphaphone-debug.apk",
      "apps/app/artifacts/alpha-launcher-debug.apk",
      "apps/app/android/suite/out/browser-debug.apk",
      "apps/app/android/suite/out/notes-debug.apk",
    ]);

    const launcher = inspectLauncherActivities([
      "priority=0 preferredOrder=0 match=0x108000",
      "  ai.alphacompute.alphaphone/.MainActivity",
      "  ai.alphacompute.notes/.NotesActivity",
      "  ai.alphacompute.browser/.BrowserActivity",
      "  org.mozilla.firefox/.App",
      "  com.android.chrome/com.google.android.apps.chrome.Main",
    ].join("\n"));
    expect(launcher.passed).toBe(true);
    expect(launcher.coreActivities).toEqual(["ai.alphacompute.alphaphone/.MainActivity"]);
    expect(launcher.thinAlphaActivities).toEqual([
      "ai.alphacompute.notes/.NotesActivity",
      "ai.alphacompute.browser/.BrowserActivity",
    ]);
    expect(launcher.thirdPartyActivities).toHaveLength(2);
    expect(inspectLauncherActivities("  ai.alphacompute.alphaphone/.MainActivity\n  com.android.chrome/.Main").passed).toBe(false);

    const fullCoreDump = [
      "  userId=10201",
      "  declared permissions:",
      "    ai.alphacompute.permission.AGENT_IPC: prot=signature, INSTALLED",
      "  Provider{ai.alphacompute.alphaphone/.ipc.AlphaPreferencesProvider}",
      "  authority=ai.alphacompute.alphaphone.preferences",
      ...REQUIRED_CORE_COMPONENTS.map((name) => `  component=${name}`),
    ].join("\n");
    const coreOk = inspectCorePackageDump(fullCoreDump);
    expect(coreOk.passed).toBe(true);
    expect(coreOk.missingComponents).toEqual([]);
    expect(extractPackageUid(fullCoreDump)).toBe(10201);

    const weakenedPerm = inspectCorePackageDump(fullCoreDump.replace("prot=signature", "prot=normal"));
    expect(weakenedPerm.passed).toBe(false);
    expect(weakenedPerm.ipcPermissionIsSignature).toBe(false);

    const missingAccessibility = inspectCorePackageDump(
      fullCoreDump.replace("ai.alphacompute.control.AlphaAccessibilityService", ""),
    );
    expect(missingAccessibility.passed).toBe(false);
    expect(missingAccessibility.missingComponents).toEqual(["ai.alphacompute.control.AlphaAccessibilityService"]);

    const ipcOk = inspectCrossAppIpcLog(
      "11-27 00:40:01.120 4120 4120 I AlphaThinApp: event=launch app=notes view=Notes coreSignatureMatch=true prefsConnected=true prefsKeys=2 agentBrokerBound=true agentState=running",
      10201,
      10209,
    );
    expect(ipcOk.passed).toBe(true);
    expect(ipcOk.distinctUids).toBe(true);
    expect(inspectCrossAppIpcLog("I AlphaThinApp: coreSignatureMatch=true prefsConnected=true agentBrokerBound=true", 10201, 10201).passed).toBe(false);
    expect(inspectCrossAppIpcLog("I AlphaThinApp: coreSignatureMatch=false prefsConnected=true agentBrokerBound=true", 10201, 10209).passed).toBe(false);
    expect(inspectCrossAppIpcLog("I AlphaThinApp: coreSignatureMatch=true prefsConnected=false agentBrokerBound=true", 10201, 10209).passed).toBe(false);
    expect(inspectCrossAppIpcLog("I AlphaThinApp: coreSignatureMatch=true prefsConnected=true agentBrokerBound=false", 10201, 10209).passed).toBe(false);

    const enabledSetting = "ai.alphacompute.alphaphone/ai.alphacompute.control.AlphaAccessibilityService";
    const boundDump = [
      `Enabled services:{${enabledSetting}}`,
      `services:{Service[label=Alpha Control, component=${enabledSetting}]}`,
    ].join("\n");
    expect(inspectAccessibilityDump(boundDump, enabledSetting).passed).toBe(true);
    expect(inspectAccessibilityDump(`Enabled services:{${enabledSetting}}\nservices:{}`, enabledSetting).passed).toBe(false);
  });

  test("alpha-next validate --check --aapt2 passes against the live repository artifacts", async () => {
    const liveValidate = createRecorder();
    expect(await runCli({
      argv: ["alpha-next", "validate", "--check", "--aapt2", "--json"],
      commands,
      rootDir: templateRoot,
      cwd: templateRoot,
      io: liveValidate.io,
    })).toBe(0);
    const report = parseJson(liveValidate.out()) as { readonly ok: boolean; readonly data: ValidateReport };
    expect(report.ok).toBe(true);
    expect(report.data.status).toBe("pass");
    expect(report.data.presentCount).toBe(report.data.totalCount);
    expect(report.data.totalCount).toBe(30);
    expect(report.data.tokensInSync).toBe(true);
    expect(report.data.manifestValid).toBe(true);
    expect(report.data.securityPassed).toBe(true);
    expect(report.data.aapt2?.passed).toBe(true);
  });
});
