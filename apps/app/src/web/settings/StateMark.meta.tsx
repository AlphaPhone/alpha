import type { ComponentMeta } from "vibestack/stories";
import type { StateMarkProps } from "./Rows.tsx";

export const meta: ComponentMeta<StateMarkProps> = {
  args: { state: { word: "Connected", tone: "ok" } },
  examples: { Unavailable: { state: { word: "Unavailable", tone: "muted" } } },
};
