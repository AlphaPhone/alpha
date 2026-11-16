import {
  THEME_CSS_VAR_MAP,
  THEME_FONT_CSS_VARS,
  type ThemeColorSet,
  type ThemeDefinition,
  type ThemeFonts,
} from "@elizaos/contracts";

/**
 * The CSS custom properties one mode of a theme sets: its color tokens, the
 * `--txt` and `--primary` aliases Tailwind reads, and its font stacks.
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
  // Keep --txt in sync with --text (it's an alias consumed by Tailwind)
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
