import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defineCommand, type CliContext, type CommandResult } from "../runner.ts";

/** Validated uppercase `#RRGGBB` sRGB color string. */
export type HexColor = string & { readonly __brand: "HexColor" };

/** Validated Android density-independent pixel string such as `22dp`. */
export type DpLength = string & { readonly __brand: "DpLength" };

/** Supported Android resource generation targets for Alpha NEXT tokens. */
export type TokenSyncTarget = "launcher3" | "ipc";

/** Parsed and validated subset of `packages/design-system/tokens.json` required for Android resources. */
export interface ParsedDesignTokens {
  readonly light: ReadonlyMap<string, HexColor>;
  readonly dark: ReadonlyMap<string, HexColor>;
  readonly radius: DpLength;
  readonly rounded: ReadonlyMap<string, DpLength>;
  readonly fonts: ReadonlyMap<string, string>;
}

/** One deterministic generated Android XML file. */
export interface GeneratedResource {
  readonly target: TokenSyncTarget;
  readonly relativePath: string;
  readonly content: string;
  readonly sha256: string;
  readonly entryCount: number;
}

/** Summary of a bundled design-system font file's Android readiness. */
export interface FontAssetStatus {
  readonly file: string;
  readonly format: "woff2" | "woff" | "ttf" | "otf";
  readonly sha256: string;
  readonly androidReady: boolean;
}

/** Structured output of `pnpm cli alpha-next sync-tokens`. */
export interface SyncTokensReport {
  readonly subcommand: "sync-tokens";
  readonly mode: "dry-run" | "write" | "check";
  readonly tokensPath: string;
  readonly targets: readonly TokenSyncTarget[];
  readonly colorCounts: { readonly light: number; readonly dark: number };
  readonly radiusCount: number;
  readonly files: readonly GeneratedResource[];
  readonly fonts: readonly FontAssetStatus[];
  readonly missing: readonly string[];
  readonly stale: readonly string[];
}

/** Validated subcommands supported under `pnpm cli alpha-next`. */
export type AlphaNextSubcommand = "sync-tokens" | "manifest" | "validate" | "emulator-e2e";

interface AlphaNextFlags {
  readonly check: boolean;
  readonly write: boolean;
  readonly target: string | undefined;
  readonly out: string | undefined;
  readonly tokens: string | undefined;
  readonly suite: string | undefined;
  readonly serial: string | undefined;
}

interface SubcommandSlot {
  readonly name: AlphaNextSubcommand;
  readonly summary: string;
  readonly run: (flags: AlphaNextFlags, ctx: CliContext) => CommandResult;
}

const OKLCH_PATTERN = /^oklch\(\s*([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s*\)$/;
const LENGTH_PATTERN = /^([0-9]*\.?[0-9]+)(rem|px)$/;
const REM_TO_DP = 16;

const LAUNCHER3_RES_ROOT = "apps/app/aosp/launcher3/overlay/res";
const IPC_RES_ROOT = "apps/app/android/alpha-ipc/src/main/res";
const DEFAULT_TOKENS_PATH = "packages/design-system/tokens.json";
const DEFAULT_SUITE_PATH = "apps/app/android/suite/apps.json";
const DEFAULT_FONTS_DIR = "packages/design-system/fonts";

const REQUIRED_LIGHT_COLORS = [
  "background",
  "foreground",
  "card",
  "secondary",
  "muted",
  "accent",
  "primary",
  "alpha",
] as const;

const REQUIRED_DARK_COLORS = [
  "background",
  "foreground",
  "card",
  "secondary",
  "accent",
  "primary",
] as const;

const REQUIRED_RADII = [
  "tile",
  "sheet",
  "home-card",
  "drawer-icon",
  "dock",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampUnit(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function linearToSrgb(channel: number): number {
  const clamped = clampUnit(channel);
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * (clamped ** (1 / 2.4)) - 0.055;
}

function toHexByte(channel: number): string {
  const byte = Math.round(clampUnit(channel) * 255);
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

function isHexColor(value: string): value is HexColor {
  return /^#[0-9A-F]{6}$/.test(value);
}

function isDpLength(value: string): value is DpLength {
  return /^[0-9]+(?:\.[0-9]+)?dp$/.test(value);
}

/** Convert an opaque CSS `oklch(L C H)` color string to an uppercase sRGB `#RRGGBB` hex string. */
export function oklchToHex(input: string): HexColor {
  const match = OKLCH_PATTERN.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid oklch color value: "${input}"`);
  }
  const lValue = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = Number(match[3]);
  if (!Number.isFinite(lValue) || lValue < 0 || lValue > 1 || !Number.isFinite(chroma) || chroma < 0 || !Number.isFinite(hue) || hue < 0 || hue > 360) {
    throw new Error(`Out-of-range oklch color value: "${input}"`);
  }
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lValue + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lValue - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lValue - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  const candidate = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(bl)}`;
  if (!isHexColor(candidate)) {
    throw new Error(`Failed to format hex color for "${input}"`);
  }
  return candidate;
}

/** Convert a CSS `rem` or `px` length token to an Android `dp` dimension string. */
export function cssLengthToDp(input: string): DpLength {
  const match = LENGTH_PATTERN.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid CSS length value: "${input}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Out-of-range CSS length value: "${input}"`);
  }
  const dp = unit === "rem" ? amount * REM_TO_DP : amount;
  const rounded = Math.round(dp * 100) / 100;
  const formatted = `${String(rounded)}dp`;
  if (!isDpLength(formatted)) {
    throw new Error(`Failed to format dp length for "${input}"`);
  }
  return formatted;
}

function toAndroidResourceKey(name: string): string {
  const normalized = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid Android resource token name: "${name}"`);
  }
  return normalized;
}

function parseColorMap(input: unknown, label: string): Map<string, HexColor> {
  if (!isRecord(input)) {
    throw new Error(`Expected object at ${label}`);
  }
  const result = new Map<string, HexColor>();
  for (const key of Object.keys(input).sort()) {
    const raw = input[key];
    if (typeof raw !== "string") {
      throw new Error(`Expected string color at ${label}.${key}`);
    }
    result.set(key, oklchToHex(raw));
  }
  return result;
}

function parseLengthMap(input: unknown, label: string): Map<string, DpLength> {
  if (!isRecord(input)) {
    throw new Error(`Expected object at ${label}`);
  }
  const result = new Map<string, DpLength>();
  for (const key of Object.keys(input).sort()) {
    const raw = input[key];
    if (typeof raw !== "string") {
      throw new Error(`Expected string length at ${label}.${key}`);
    }
    result.set(key, cssLengthToDp(raw));
  }
  return result;
}

function parseStringMap(input: unknown, label: string): Map<string, string> {
  if (!isRecord(input)) {
    throw new Error(`Expected object at ${label}`);
  }
  const result = new Map<string, string>();
  for (const key of Object.keys(input).sort()) {
    const raw = input[key];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new Error(`Expected non-empty string at ${label}.${key}`);
    }
    result.set(key, raw);
  }
  return result;
}

function requireFromMap<T>(map: ReadonlyMap<string, T>, key: string, group: string): T {
  const found = map.get(key);
  if (found === undefined) {
    throw new Error(`Missing required token ${group}.${key}`);
  }
  return found;
}

/** Validate and convert raw parsed JSON from `packages/design-system/tokens.json`. */
export function parseAlphaDesignTokens(raw: unknown): ParsedDesignTokens {
  if (!isRecord(raw)) {
    throw new Error("Design tokens root must be a JSON object");
  }
  if (!isRecord(raw.color)) {
    throw new Error("Design tokens must define a color object");
  }
  const light = parseColorMap(raw.color.light, "color.light");
  const dark = parseColorMap(raw.color.dark, "color.dark");
  if (typeof raw.radius !== "string") {
    throw new Error("Design tokens must define a string radius");
  }
  const radius = cssLengthToDp(raw.radius);
  const rounded = parseLengthMap(raw.rounded, "rounded");
  const fonts = parseStringMap(raw.font, "font");

  for (const key of REQUIRED_LIGHT_COLORS) {
    requireFromMap(light, key, "color.light");
  }
  for (const key of REQUIRED_DARK_COLORS) {
    requireFromMap(dark, key, "color.dark");
  }
  for (const key of REQUIRED_RADII) {
    requireFromMap(rounded, key, "rounded");
  }
  return { light, dark, radius, rounded, fonts };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderXmlEntries(
  tag: "color" | "dimen",
  entries: readonly (readonly [string, string])[],
): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- Generated from packages/design-system/tokens.json by pnpm cli alpha-next sync-tokens -->",
    "<resources>",
    ...entries.map(([name, value]) => `  <${tag} name="${escapeXml(name)}">${escapeXml(value)}</${tag}>`),
    "</resources>",
    "",
  ];
  return lines.join("\n");
}

function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function buildResource(
  target: TokenSyncTarget,
  relativePath: string,
  tag: "color" | "dimen",
  entries: readonly (readonly [string, string])[],
): GeneratedResource {
  const content = renderXmlEntries(tag, entries);
  return {
    target,
    relativePath,
    content,
    sha256: sha256Hex(content),
    entryCount: entries.length,
  };
}

function buildAlphaColorEntries(colors: ReadonlyMap<string, HexColor>): readonly (readonly [string, string])[] {
  return [...colors.entries()].map(([name, hex]) => [`alpha_color_${toAndroidResourceKey(name)}`, hex] as const);
}

function buildAlphaRadiusEntries(tokens: ParsedDesignTokens): readonly (readonly [string, string])[] {
  return [
    ["alpha_radius", tokens.radius] as const,
    ...[...tokens.rounded.entries()].map(([name, dp]) => [`alpha_radius_${toAndroidResourceKey(name)}`, dp] as const),
  ];
}

function generateIpcResources(tokens: ParsedDesignTokens): readonly GeneratedResource[] {
  const lightEntries = buildAlphaColorEntries(tokens.light);
  const darkEntries = buildAlphaColorEntries(tokens.dark);
  const dimenEntries = buildAlphaRadiusEntries(tokens);
  return [
    buildResource("ipc", `${IPC_RES_ROOT}/values/colors.xml`, "color", lightEntries),
    buildResource("ipc", `${IPC_RES_ROOT}/values-night/colors.xml`, "color", darkEntries),
    buildResource("ipc", `${IPC_RES_ROOT}/values/dimens.xml`, "dimen", dimenEntries),
  ];
}

function generateLauncher3Resources(tokens: ParsedDesignTokens): readonly GeneratedResource[] {
  const lightBg = requireFromMap(tokens.light, "background", "color.light");
  const lightFg = requireFromMap(tokens.light, "foreground", "color.light");
  const lightCard = requireFromMap(tokens.light, "card", "color.light");
  const lightSecondary = requireFromMap(tokens.light, "secondary", "color.light");
  const lightMuted = requireFromMap(tokens.light, "muted", "color.light");
  const lightPrimary = requireFromMap(tokens.light, "primary", "color.light");
  const alphaBlue = requireFromMap(tokens.light, "alpha", "color.light");

  const darkBg = requireFromMap(tokens.dark, "background", "color.dark");
  const darkFg = requireFromMap(tokens.dark, "foreground", "color.dark");
  const darkCard = requireFromMap(tokens.dark, "card", "color.dark");
  const darkSecondary = requireFromMap(tokens.dark, "secondary", "color.dark");
  const darkAccent = requireFromMap(tokens.dark, "accent", "color.dark");
  const darkPrimary = requireFromMap(tokens.dark, "primary", "color.dark");

  const tileRadius = requireFromMap(tokens.rounded, "tile", "rounded");
  const drawerIconRadius = requireFromMap(tokens.rounded, "drawer-icon", "rounded");
  const dockRadius = requireFromMap(tokens.rounded, "dock", "rounded");
  const homeCardRadius = requireFromMap(tokens.rounded, "home-card", "rounded");
  const sheetRadius = requireFromMap(tokens.rounded, "sheet", "rounded");

  const launcherLight: readonly (readonly [string, string])[] = [
    ...buildAlphaColorEntries(tokens.light),
    ["all_apps_bg_hand_off", lightBg],
    ["all_apps_label_text", lightFg],
    ["all_apps_tabs_background", lightSecondary],
    ["folder_background_light", lightCard],
    ["folder_dot_color", alphaBlue],
    ["launcher_accent_color", lightPrimary],
    ["material_color_primary", lightPrimary],
    ["notification_dot_color", alphaBlue],
    ["popup_color_background", lightBg],
    ["popup_color_primary_light", lightCard],
    ["popup_color_secondary_light", lightSecondary],
    ["popup_color_tertiary_light", lightMuted],
    ["surface", lightBg],
    ["widget_picker_surface", lightSecondary],
    ["workspace_text_color", lightFg],
  ];

  const launcherDark: readonly (readonly [string, string])[] = [
    ...buildAlphaColorEntries(tokens.dark),
    ["all_apps_bg_hand_off", darkBg],
    ["all_apps_label_text", darkFg],
    ["all_apps_tabs_background", darkSecondary],
    ["folder_background_dark", darkCard],
    ["folder_dot_color", alphaBlue],
    ["launcher_accent_color", darkPrimary],
    ["material_color_primary", darkPrimary],
    ["notification_dot_color", alphaBlue],
    ["popup_color_background", darkBg],
    ["popup_color_primary_dark", darkCard],
    ["popup_color_secondary_dark", darkSecondary],
    ["popup_color_tertiary_dark", darkAccent],
    ["surface", darkBg],
    ["widget_picker_surface", darkSecondary],
    ["workspace_text_color", darkFg],
  ];

  const launcherDimens: readonly (readonly [string, string])[] = [
    ...buildAlphaRadiusEntries(tokens),
    ["all_apps_header_pill_corner_radius", dockRadius],
    ["bg_round_rect_radius", tileRadius],
    ["dialogCornerRadius", tileRadius],
    ["enforced_rounded_corner_max_radius", homeCardRadius],
    ["folder_preview_corner_radius", drawerIconRadius],
    ["popup_single_item_radius", tileRadius],
    ["qsb_widget_radius", dockRadius],
    ["task_corner_radius_override", sheetRadius],
  ];

  return [
    buildResource("launcher3", `${LAUNCHER3_RES_ROOT}/values/colors.xml`, "color", launcherLight),
    buildResource("launcher3", `${LAUNCHER3_RES_ROOT}/values-night/colors.xml`, "color", launcherDark),
    buildResource("launcher3", `${LAUNCHER3_RES_ROOT}/values/dimens.xml`, "dimen", launcherDimens),
  ];
}

/** Generate deterministic Android XML resources from validated Alpha design tokens. */
export function generateAndroidResources(
  tokens: ParsedDesignTokens,
  targets: readonly TokenSyncTarget[] = ["launcher3", "ipc"],
): readonly GeneratedResource[] {
  const resources: GeneratedResource[] = [];
  for (const target of targets) {
    if (target === "launcher3") {
      resources.push(...generateLauncher3Resources(tokens));
    } else if (target === "ipc") {
      resources.push(...generateIpcResources(tokens));
    } else {
      const _exhaustive: never = target;
      throw new Error(`Unsupported target: ${String(_exhaustive)}`);
    }
  }
  return resources;
}

function inspectFonts(rootDir: string): readonly FontAssetStatus[] {
  const fontsDir = path.join(rootDir, DEFAULT_FONTS_DIR);
  if (!fs.existsSync(fontsDir)) return [];
  const results: FontAssetStatus[] = [];
  for (const name of fs.readdirSync(fontsDir).sort()) {
    const ext = path.extname(name).toLowerCase().slice(1);
    if (ext !== "woff2" && ext !== "woff" && ext !== "ttf" && ext !== "otf") continue;
    const filePath = path.join(fontsDir, name);
    if (!fs.statSync(filePath).isFile()) continue;
    results.push({
      file: `${DEFAULT_FONTS_DIR}/${name}`,
      format: ext,
      sha256: sha256Hex(fs.readFileSync(filePath)),
      androidReady: ext === "ttf" || ext === "otf",
    });
  }
  return results;
}

function resolveTargets(rawTarget: string | undefined): readonly TokenSyncTarget[] | undefined {
  if (rawTarget === undefined || rawTarget === "all") return ["launcher3", "ipc"];
  if (rawTarget === "launcher3" || rawTarget === "ipc") return [rawTarget];
  return undefined;
}

function runSyncTokens(flags: AlphaNextFlags, ctx: CliContext): CommandResult<SyncTokensReport> {
  if (flags.check && flags.write) {
    return { ok: false, message: "Cannot combine --check and --write.", exitCode: 2 };
  }
  const targets = resolveTargets(flags.target);
  if (!targets) {
    return { ok: false, message: `Invalid --target "${flags.target ?? ""}". Expected: all, launcher3, or ipc.`, exitCode: 2 };
  }
  const tokensPath = flags.tokens ? path.resolve(ctx.cwd, flags.tokens) : path.join(ctx.rootDir, DEFAULT_TOKENS_PATH);
  if (!fs.existsSync(tokensPath)) {
    return { ok: false, message: `Design tokens file not found: ${tokensPath}` };
  }
  const parsedJson: unknown = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  const tokens = parseAlphaDesignTokens(parsedJson);
  const files = generateAndroidResources(tokens, targets);
  const fonts = inspectFonts(ctx.rootDir);
  const outRoot = flags.out ? path.resolve(ctx.cwd, flags.out) : ctx.rootDir;
  const mode: SyncTokensReport["mode"] = flags.check ? "check" : flags.write ? "write" : "dry-run";
  const missing: string[] = [];
  const stale: string[] = [];

  for (const resource of files) {
    const dest = path.join(outRoot, resource.relativePath);
    if (mode === "write") {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, resource.content, "utf8");
    } else if (mode === "check") {
      if (!fs.existsSync(dest)) {
        missing.push(resource.relativePath);
      } else if (fs.readFileSync(dest, "utf8") !== resource.content) {
        stale.push(resource.relativePath);
      }
    }
  }

  const report: SyncTokensReport = {
    subcommand: "sync-tokens",
    mode,
    tokensPath: path.relative(ctx.rootDir, tokensPath).split(path.sep).join("/"),
    targets,
    colorCounts: { light: tokens.light.size, dark: tokens.dark.size },
    radiusCount: tokens.rounded.size + 1,
    files,
    fonts,
    missing,
    stale,
  };

  if (mode === "check" && (missing.length > 0 || stale.length > 0)) {
    const details = [
      ...(missing.length > 0 ? [`missing: ${missing.join(", ")}`] : []),
      ...(stale.length > 0 ? [`stale: ${stale.join(", ")}`] : []),
    ].join("; ");
    return {
      ok: false,
      message: `Android design token resources are out of sync (${details}). Run "pnpm cli alpha-next sync-tokens --write".`,
      data: report,
    };
  }

  const lines = [
    `alpha-next sync-tokens (${mode})  targets:${targets.join(",")}  light:${String(tokens.light.size)}  dark:${String(tokens.dark.size)}  radii:${String(tokens.rounded.size + 1)}`,
    ...files.map((file) => `  ${file.relativePath}  (${String(file.entryCount)} entries, sha256:${file.sha256.slice(0, 12)})`),
    `fonts: ${String(fonts.filter((font) => font.androidReady).length)}/${String(fonts.length)} android-ready (.ttf/.otf)`,
  ];
  return { ok: true, data: report, lines };
}

function runManifest(flags: AlphaNextFlags, ctx: CliContext): CommandResult {
  const suitePath = flags.suite ? path.resolve(ctx.cwd, flags.suite) : path.join(ctx.rootDir, DEFAULT_SUITE_PATH);
  const relativeSuite = path.relative(ctx.rootDir, suitePath).split(path.sep).join("/");
  if (!fs.existsSync(suitePath)) {
    return {
      ok: true,
      data: {
        subcommand: "manifest",
        status: "scaffold",
        suitePath: relativeSuite,
        present: false,
        appsCount: 0,
      },
      lines: [`alpha-next manifest: waiting for suite registry at ${relativeSuite}`],
    };
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(suitePath, "utf8"));
  const apps = isRecord(parsed) && Array.isArray(parsed.apps) ? parsed.apps : undefined;
  if (!apps) {
    return { ok: false, message: `Suite registry at ${relativeSuite} must contain an apps array.` };
  }
  return {
    ok: true,
    data: {
      subcommand: "manifest",
      status: "ready",
      suitePath: relativeSuite,
      present: true,
      appsCount: apps.length,
    },
    lines: [`alpha-next manifest: ${String(apps.length)} entries in ${relativeSuite}`],
  };
}

function runValidate(flags: AlphaNextFlags, ctx: CliContext): CommandResult {
  const checkPaths = [
    DEFAULT_TOKENS_PATH,
    DEFAULT_SUITE_PATH,
    "apps/app/android/alpha-ipc/src/main/aidl/ai/alphacompute/ipc/IAlphaAgentBroker.aidl",
    `${LAUNCHER3_RES_ROOT}/values/colors.xml`,
    `${IPC_RES_ROOT}/values/colors.xml`,
    "spec/app/control/index.md",
    "apps/app/aosp/control-bridge/Android.bp",
    "apps/app/aosp/sandboxed-play/Android.bp",
  ] as const;

  const artifacts = checkPaths.map((relativePath) => ({
    path: relativePath,
    present: fs.existsSync(path.join(ctx.rootDir, relativePath)),
  }));
  const tokenSync = runSyncTokens({ ...flags, check: true, write: false }, ctx);
  const tokensInSync = tokenSync.ok;
  const presentCount = artifacts.filter((item) => item.present).length;
  const data = {
    subcommand: "validate",
    status: presentCount === artifacts.length && tokensInSync ? "complete" : "in-progress",
    tokensInSync,
    presentCount,
    totalCount: artifacts.length,
    artifacts,
  };
  const lines = [
    `alpha-next validate: ${String(presentCount)}/${String(artifacts.length)} artifacts present, tokens ${tokensInSync ? "in sync" : "not synced"}`,
    ...artifacts.map((item) => `  [${item.present ? "ok" : "missing"}] ${item.path}`),
  ];
  if (flags.check && (!tokensInSync || presentCount < artifacts.length)) {
    return { ok: false, message: "Alpha NEXT validation found missing or out-of-sync artifacts.", data };
  }
  return { ok: true, data, lines };
}

function runEmulatorE2e(flags: AlphaNextFlags): CommandResult {
  const data = {
    subcommand: "emulator-e2e",
    status: "scaffold",
    serial: flags.serial ?? null,
    ready: false,
    stages: [
      "install-core-and-suite-apks",
      "grant-accessibility-and-assistant-role",
      "verify-overlay-and-cross-app-ipc",
      "verify-firefox-control-loop",
    ],
  };
  return {
    ok: true,
    data,
    lines: [
      `alpha-next emulator-e2e (scaffold)${flags.serial ? `  serial:${flags.serial}` : ""}`,
      "  planned stages: install-core-and-suite-apks -> grant-accessibility-and-assistant-role -> verify-overlay-and-cross-app-ipc -> verify-firefox-control-loop",
    ],
  };
}

const SUBCOMMANDS: Readonly<Record<AlphaNextSubcommand, SubcommandSlot>> = {
  "sync-tokens": {
    name: "sync-tokens",
    summary: "Generate or check Android colors/dimens XML from packages/design-system/tokens.json",
    run: runSyncTokens,
  },
  manifest: {
    name: "manifest",
    summary: "Inspect or validate the Alpha NEXT suite app registry (apps/app/android/suite/apps.json)",
    run: runManifest,
  },
  validate: {
    name: "validate",
    summary: "Check Alpha NEXT artifacts and design token resource sync state",
    run: runValidate,
  },
  "emulator-e2e": {
    name: "emulator-e2e",
    summary: "Scaffolded Tier-1 Android emulator end-to-end verification lever",
    run: (flags) => runEmulatorE2e(flags),
  },
};

function isAlphaNextSubcommand(value: string): value is AlphaNextSubcommand {
  return Object.hasOwn(SUBCOMMANDS, value);
}

/** Project CLI command group for Alpha NEXT generators and verification levers. */
export const alphaNextCommand = defineCommand({
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
