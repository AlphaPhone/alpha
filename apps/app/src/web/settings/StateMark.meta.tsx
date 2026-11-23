import type { ComponentMeta } from "vibestack/stories";
import type { StateMarkProps } from "./Rows.tsx";

export const meta: ComponentMeta<StateMarkProps> = {
  args: { state: { word: "Allowed", tone: "ok" } },
  examples: { Limited: { state: { word: "Limited", tone: "warn" } } },
};
