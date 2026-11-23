import type { ComponentMeta } from "vibestack/stories";
import { diagnosticsOf, type RecoveryScreenProps } from "./RecoveryScreen.tsx";

const noop = () => {};
const at = new Date(Date.UTC(2026, 10, 22, 9, 30));

export const meta: ComponentMeta<RecoveryScreenProps> = {
  args: { diagnostics: diagnosticsOf("startup", "TypeError", "0.0.0-story", "android", at), onReload: noop, onSwitchHome: noop },
  examples: {
    LauncherBuild: { homeEscape: true },
    RenderFailure: { diagnostics: diagnosticsOf("render", "RangeError", "0.0.0-story", "web", at) },
  },
};
