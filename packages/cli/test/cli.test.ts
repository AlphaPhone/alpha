import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  commands,
  cssLengthToDp,
  defineCommand,
  oklchToHex,
  runCli,
  type CliIo,
  type SyncTokensReport,
} from "../src/index.ts";

const templateRoot = path.resolve(import.meta.dirname, "../../..");
const mainPath = path.resolve(import.meta.dirname, "../src/main.ts");

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

describe("project CLI", () => {
  test("lists registered commands in human and JSON help output", async () => {
    const human = createRecorder();
    expect(await runCli({ argv: ["--help"], commands, rootDir: templateRoot, cwd: templateRoot, io: human.io })).toBe(0);
    expect(human.out()).toContain("Usage: pnpm cli <command> [options]");
    expect(human.out()).toContain("status");

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
            summary: "Alpha NEXT Android token sync, manifest, validation, and emulator levers",
            usage: "pnpm cli alpha-next <sync-tokens|manifest|validate|emulator-e2e> [options]",
            flags: {
              check: {
                kind: "boolean",
                description: "Verify generated resources match on-disk files without writing",
              },
              write: {
                kind: "boolean",
                description: "Write generated Android XML resources to target directories",
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
              serial: {
                kind: "string",
                description: "Target ADB device serial for emulator-e2e",
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

  test("alpha-next sync-tokens generates deterministic Android XML, supports write/check, and scaffolds subcommands", async () => {
    const dryRun = createRecorder();
    expect(await runCli({
      argv: ["alpha-next", "sync-tokens", "--json"],
      commands,
      rootDir: templateRoot,
      cwd: templateRoot,
      io: dryRun.io,
    })).toBe(0);
    const report = parseJson(dryRun.out()) as {
      readonly ok: boolean;
      readonly command: string;
      readonly data: SyncTokensReport;
    };
    expect(report.ok).toBe(true);
    expect(report.command).toBe("alpha-next");
    expect(report.data.mode).toBe("dry-run");
    expect(report.data.colorCounts).toEqual({ light: 41, dark: 28 });
    expect(report.data.files.map((file) => file.relativePath)).toEqual([
      "apps/app/aosp/launcher3/overlay/res/values/colors.xml",
      "apps/app/aosp/launcher3/overlay/res/values-night/colors.xml",
      "apps/app/aosp/launcher3/overlay/res/values/dimens.xml",
      "apps/app/android/alpha-ipc/src/main/res/values/colors.xml",
      "apps/app/android/alpha-ipc/src/main/res/values-night/colors.xml",
      "apps/app/android/alpha-ipc/src/main/res/values/dimens.xml",
    ]);

    const launcherColors = report.data.files[0];
    const launcherDimens = report.data.files[2];
    expect(launcherColors?.content).toContain('<color name="alpha_color_alpha">#0000FF</color>');
    expect(launcherColors?.content).toContain('<color name="launcher_accent_color">#0000FF</color>');
    expect(launcherDimens?.content).toContain('<dimen name="alpha_radius_tile">22dp</dimen>');
    expect(launcherDimens?.content).toContain('<dimen name="alpha_radius_drawer_icon">18dp</dimen>');
    expect(launcherDimens?.content).toContain('<dimen name="alpha_radius_dock">31dp</dimen>');
    expect(launcherDimens?.content).toContain('<dimen name="alpha_radius_home_card">30dp</dimen>');
    expect(launcherDimens?.content).toContain('<dimen name="qsb_widget_radius">31dp</dimen>');
    expect(report.data.fonts.some((font) => font.file.endsWith("public-sans-latin.woff2") && !font.androidReady)).toBe(true);
    expect(report.data.fonts.some((font) => font.file.endsWith("fraunces-italic-400.ttf") && font.androidReady)).toBe(true);

    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-next-tokens-"));
    try {
      const checkBefore = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--check", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: checkBefore.io,
      })).toBe(1);

      const writeRun = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--write", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: writeRun.io,
      })).toBe(0);

      const checkAfter = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--check", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: checkAfter.io,
      })).toBe(0);

      const targetFile = path.join(tmpOut, "apps/app/aosp/launcher3/overlay/res/values/dimens.xml");
      fs.writeFileSync(targetFile, "<resources/>\n", "utf8");
      const checkStale = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", "sync-tokens", "--check", "--out", tmpOut, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: checkStale.io,
      })).toBe(1);
      const staleParsed = parseJson(checkStale.out()) as { readonly ok: boolean; readonly data: SyncTokensReport };
      expect(staleParsed.ok).toBe(false);
      expect(staleParsed.data.stale).toEqual(["apps/app/aosp/launcher3/overlay/res/values/dimens.xml"]);
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }

    for (const sub of ["manifest", "validate", "emulator-e2e"] as const) {
      const rec = createRecorder();
      expect(await runCli({
        argv: ["alpha-next", sub, "--json"],
        commands,
        rootDir: templateRoot,
        cwd: templateRoot,
        io: rec.io,
      })).toBe(0);
      const parsedSub = parseJson(rec.out()) as { readonly ok: boolean; readonly data: { readonly subcommand: string } };
      expect(parsedSub.ok).toBe(true);
      expect(parsedSub.data.subcommand).toBe(sub);
    }

    const missingSub = createRecorder();
    expect(await runCli({
      argv: ["alpha-next", "--json"],
      commands,
      rootDir: templateRoot,
      cwd: templateRoot,
      io: missingSub.io,
    })).toBe(2);
  });
});
