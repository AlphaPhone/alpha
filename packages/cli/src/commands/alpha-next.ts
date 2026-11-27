import { defineCommand, type CliContext, type CommandResult } from "../runner.ts";
import { runEmulatorE2e } from "./alpha-next-emulator.ts";
import { runSyncFonts, runSyncTokens } from "./alpha-next-tokens.ts";
import { runManifest, runValidate } from "./alpha-next-validate.ts";

/** Validated subcommands supported under `pnpm cli alpha-next`. */
export type AlphaNextSubcommand =
  | "sync-tokens"
  | "sync-fonts"
  | "manifest"
  | "validate"
  | "emulator-e2e";

interface AlphaNextFlags {
  readonly check: boolean;
  readonly write: boolean;
  readonly "with-fonts": boolean;
  readonly aapt2: boolean;
  readonly "dry-run": boolean;
  readonly target: string | undefined;
  readonly out: string | undefined;
  readonly tokens: string | undefined;
  readonly suite: string | undefined;
  readonly "apk-dir": string | undefined;
  readonly avd: string | undefined;
  readonly serial: string | undefined;
  readonly timeout: string | undefined;
}

interface SubcommandSlot {
  readonly name: AlphaNextSubcommand;
  readonly summary: string;
  readonly run: (flags: AlphaNextFlags, ctx: CliContext) => CommandResult | Promise<CommandResult>;
}

const SUBCOMMANDS: Readonly<Record<AlphaNextSubcommand, SubcommandSlot>> = {
  "sync-tokens": {
    name: "sync-tokens",
    summary: "Generate or check Android colors/dimens XML from packages/design-system/tokens.json",
    run: (flags, ctx) => runSyncTokens({
      check: flags.check,
      write: flags.write,
      withFonts: flags["with-fonts"],
      target: flags.target,
      out: flags.out,
      tokens: flags.tokens,
    }, ctx),
  },
  "sync-fonts": {
    name: "sync-fonts",
    summary: "Derive Android .ttf fonts and alpha_fonts.xml for Launcher3 without mutating packages/design-system/fonts/",
    run: (flags, ctx) => runSyncFonts({
      check: flags.check,
      write: flags.write,
      out: flags.out,
    }, ctx),
  },
  manifest: {
    name: "manifest",
    summary: "Validate the Alpha NEXT suite app registry (apps/app/android/suite/apps.json)",
    run: (flags, ctx) => runManifest({
      check: flags.check,
      suite: flags.suite,
    }, ctx),
  },
  validate: {
    name: "validate",
    summary: "Verify Alpha NEXT token sync, suite manifest, artifacts, security invariants, and optional aapt2 compile",
    run: (flags, ctx) => runValidate({
      check: flags.check,
      aapt2: flags.aapt2,
      suite: flags.suite,
      tokens: flags.tokens,
      out: flags.out,
    }, ctx),
  },
  "emulator-e2e": {
    name: "emulator-e2e",
    summary: "Run or plan Tier-1 headless Android emulator end-to-end verification",
    run: (flags, ctx) => runEmulatorE2e({
      dryRun: flags["dry-run"],
      apkDir: flags["apk-dir"],
      avd: flags.avd,
      serial: flags.serial,
      timeout: flags.timeout,
    }, ctx),
  },
};

function isAlphaNextSubcommand(value: string): value is AlphaNextSubcommand {
  return Object.hasOwn(SUBCOMMANDS, value);
}

/** Project CLI command group for Alpha NEXT generators and verification levers. */
export const alphaNextCommand = defineCommand({
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
  run: ({ flags, positionals }, ctx) => {
    const subcommand = positionals[0];
    const available = Object.keys(SUBCOMMANDS).join(", ");
    if (!subcommand) {
      return {
        ok: false,
        message: `Missing alpha-next subcommand. Available: ${available}.`,
        exitCode: 2,
      };
    }
    if (!isAlphaNextSubcommand(subcommand)) {
      return {
        ok: false,
        message: `Unknown alpha-next subcommand "${subcommand}". Available: ${available}.`,
        exitCode: 2,
      };
    }
    return SUBCOMMANDS[subcommand].run(flags, ctx);
  },
});
