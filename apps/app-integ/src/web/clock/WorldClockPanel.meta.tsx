import type { ComponentMeta } from "vibestack/stories";
import type { WorldClockPanelProps } from "./WorldClockPanel.tsx";
import { ringer, world } from "./fixtures.ts";

export const meta: ComponentMeta<WorldClockPanelProps> = {
  args: { world, now: ringer.now, known: ["Asia/Tokyo", "Europe/Paris", "America/New_York"], onAdd: () => undefined, onRemove: () => undefined },
  examples: { Empty: { world: { zones: [] } } },
};
