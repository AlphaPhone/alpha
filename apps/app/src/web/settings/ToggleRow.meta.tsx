import type { ComponentMeta } from "vibestack/stories";
import type { ToggleRowProps } from "./Rows.tsx";

export const meta: ComponentMeta<ToggleRowProps> = {
  args: { label: "Show previews", on: true, onChange: () => undefined },
  examples: {
    Detail: { detail: "Shown on the lock screen" },
    Locked: { locked: true, detail: "Set by Android for this profile" },
    LongLabel: { label: "Keep a one-day history of mirrored notifications on this phone", detail: "Only the app, the time and whether it was shown are kept" },
  },
};
