/**
 * Alpha's theme tokens: the colour, radius, shadow and font tokens a product theme sets for each
 * appearance, the CSS custom property each one drives, and the shape check a registration runs.
 * Started as a copy of the elizaOS theme declarations (packages/contracts/src/contracts/theme.ts)
 * combined with themeCssVariables from the elizaOS UI theme config (provenance in ../README.md);
 * Alpha owns it now.
 */

// ── Color Set ──────────────────────────────────────────────────────

/** All themeable CSS custom properties for a single color mode. */
export interface ThemeColorSet {
  // Backgrounds
  bg: string;
  bgAccent: string;
  bgElevated: string;
  bgHover: string;
  bgMuted: string;

  // Surfaces
  card: string;
  cardForeground: string;
  surface: string;

  // Text
  text: string;
  textStrong: string;
  chatText: string;
  muted: string;
  mutedStrong: string;

  // Borders
  border: string;
  borderStrong: string;
  borderHover: string;
  input: string;
  ring: string;

  // Accent
  accent: string;
  accentRgb: string; // "R, G, B" format for rgba() usage
  accentHover: string;
  accentMuted: string;
  accentSubtle: string;
  accentForeground: string;

  // Primary (may differ from accent in some themes)
  primary: string;
  primaryForeground: string;

  // Status — success
  ok: string;
  okMuted: string;
  okSubtle: string;

  // Status — danger
  destructive: string;
  destructiveForeground: string;
  destructiveSubtle: string;
  danger: string;

  // Status — warning
  warn: string;
  warnMuted: string;
  warnSubtle: string;

  // Status — info
  info: string;
  statusInfo: string;
  statusInfoBg: string;

  // Focus
  focus: string;
  focusRing: string;

  // Scrollbar
  scrollbarTrack: string;
  scrollbarThumbStart: string;
  scrollbarThumbMid: string;
  scrollbarThumbEnd: string;
  scrollbarThumbHoverStart: string;
  scrollbarThumbHoverMid: string;
  scrollbarThumbHoverEnd: string;
  scrollbarThumbEdge: string;

  // Header / section bars
  headerBarBg: string;
  headerBarFg: string;
  sectionBarBg: string;
  sectionBarFg: string;

  // Links
  linkColor: string;
  linkHoverColor: string;

  // Shadows
  shadowXs: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  shadow2xl: string;
  shadowInset: string;

  // Radii
  radius: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radius2xl: string;
  radius3xl: string;

  // Timing
  durationNormal: string;
}

// ── Fonts ──────────────────────────────────────────────────────────

interface ThemeFonts {
  /** Body text font-family stack */
  body?: string;
  /** Display / heading font-family stack */
  display?: string;
  /** Chat message font-family stack */
  chat?: string;
  /** Monospace font-family stack */
  mono?: string;
}

// ── Theme Definition ───────────────────────────────────────────────

export interface ThemeDefinition {
  /** Unique theme identifier (kebab-case, e.g. "neon-cyber") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Short description of the theme */
  description?: string;
  /** Font overrides */
  fonts?: ThemeFonts;
  /** Color tokens for light mode */
  light: Partial<ThemeColorSet>;
  /** Color tokens for dark mode */
  dark: Partial<ThemeColorSet>;
}

// ── CSS Variable Map ───────────────────────────────────────────────

/**
 * Maps ThemeColorSet camelCase keys to their CSS custom property names.
 * themeCssVariables() sets them on the shell root.
 */
export const THEME_CSS_VAR_MAP: Record<keyof ThemeColorSet, string> = {
  bg: "--bg",
  bgAccent: "--bg-accent",
  bgElevated: "--bg-elevated",
  bgHover: "--bg-hover",
  bgMuted: "--bg-muted",
  card: "--card",
  cardForeground: "--card-foreground",
  surface: "--surface",
  text: "--text",
  textStrong: "--text-strong",
  chatText: "--chat-text",
  muted: "--muted",
  mutedStrong: "--muted-strong",
  border: "--border",
  borderStrong: "--border-strong",
  borderHover: "--border-hover",
  input: "--input",
  ring: "--ring",
  accent: "--accent",
  accentRgb: "--accent-rgb",
  accentHover: "--accent-hover",
  accentMuted: "--accent-muted",
  accentSubtle: "--accent-subtle",
  accentForeground: "--accent-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  ok: "--ok",
  okMuted: "--ok-muted",
  okSubtle: "--ok-subtle",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  destructiveSubtle: "--destructive-subtle",
  danger: "--danger",
  warn: "--warn",
  warnMuted: "--warn-muted",
  warnSubtle: "--warn-subtle",
  info: "--info",
  statusInfo: "--status-info",
  statusInfoBg: "--status-info-bg",
  focus: "--focus",
  focusRing: "--focus-ring",
  scrollbarTrack: "--scrollbar-track",
  scrollbarThumbStart: "--scrollbar-thumb-start",
  scrollbarThumbMid: "--scrollbar-thumb-mid",
  scrollbarThumbEnd: "--scrollbar-thumb-end",
  scrollbarThumbHoverStart: "--scrollbar-thumb-hover-start",
  scrollbarThumbHoverMid: "--scrollbar-thumb-hover-mid",
  scrollbarThumbHoverEnd: "--scrollbar-thumb-hover-end",
  scrollbarThumbEdge: "--scrollbar-thumb-edge",
  headerBarBg: "--header-bar-bg",
  headerBarFg: "--header-bar-fg",
  sectionBarBg: "--section-bar-bg",
  sectionBarFg: "--section-bar-fg",
  linkColor: "--link-color",
  linkHoverColor: "--link-hover-color",
  shadowXs: "--shadow-xs",
  shadowSm: "--shadow-sm",
  shadowMd: "--shadow-md",
  shadowLg: "--shadow-lg",
  shadowXl: "--shadow-xl",
  shadow2xl: "--shadow-2xl",
  shadowInset: "--shadow-inset",
  radius: "--radius",
  radiusSm: "--radius-sm",
  radiusMd: "--radius-md",
  radiusLg: "--radius-lg",
  radiusXl: "--radius-xl",
  radius2xl: "--radius-2xl",
  radius3xl: "--radius-3xl",
  durationNormal: "--duration-normal",
};

/** Font CSS variable names set by ThemeFonts. */
const THEME_FONT_CSS_VARS = {
  body: "--font-body",
  display: "--font-display",
  chat: "--font-chat",
  mono: "--mono",
} as const;

// ── Validation ─────────────────────────────────────────────────────

const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface ThemeValidationError {
  field: string;
  message: string;
}

export function validateThemeDefinition(data: unknown): ThemeValidationError[] {
  const errors: ThemeValidationError[] = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push({ field: "root", message: "Theme must be a JSON object" });
    return errors;
  }

  const theme = data as Record<string, unknown>;

  if (typeof theme.id !== "string" || !theme.id.trim()) {
    errors.push({ field: "id", message: "Theme id is required" });
  } else if (!THEME_ID_PATTERN.test(theme.id)) {
    errors.push({
      field: "id",
      message:
        "Theme id must be kebab-case (lowercase letters, numbers, hyphens)",
    });
  }

  if (typeof theme.name !== "string" || !theme.name.trim()) {
    errors.push({ field: "name", message: "Theme name is required" });
  }

  for (const mode of ["light", "dark"] as const) {
    if (theme[mode] != null && typeof theme[mode] !== "object") {
      errors.push({
        field: mode,
        message: `${mode} must be an object`,
      });
    }
  }

  if (theme.fonts != null && typeof theme.fonts !== "object") {
    errors.push({ field: "fonts", message: "fonts must be an object" });
  }

  return errors;
}

/**
 * The CSS custom properties one mode of a theme sets: its color tokens, the
 * `--txt` and `--primary` aliases, and its font stacks.
 */
export function themeCssVariables(
  theme: ThemeDefinition,
  mode: "light" | "dark",
): Record<string, string> {
  const colorSet = mode === "dark" ? theme.dark : theme.light;
  const variables: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(THEME_CSS_VAR_MAP)) {
    const value = colorSet[key as keyof ThemeColorSet];
    if (value != null) variables[cssVar] = value;
  }
  // Keep the --txt alias in sync with --text
  if (colorSet.text != null) variables["--txt"] = colorSet.text;
  // Keep --primary/--primary-foreground in sync if not explicitly set
  // (most themes share accent = primary)
  if (colorSet.accent != null && colorSet.primary == null) {
    variables["--primary"] = colorSet.accent;
  }
  if (colorSet.accentForeground != null && colorSet.primaryForeground == null) {
    variables["--primary-foreground"] = colorSet.accentForeground;
  }
  const fonts: ThemeFonts = theme.fonts ?? {};
  for (const key of ["body", "display", "chat", "mono"] as const) {
    const value = fonts[key];
    if (value) variables[THEME_FONT_CSS_VARS[key]] = value;
  }
  return variables;
}
