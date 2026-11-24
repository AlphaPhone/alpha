import type { ComponentMeta } from "vibestack/stories";
import type { SwitchProps } from "./Switch.tsx";

export const meta: ComponentMeta<SwitchProps> = {
  args: { "aria-label": "Wi-Fi calling", defaultChecked: false, onCheckedChange: () => undefined },
  examples: { "Disabled on": { disabled: true, defaultChecked: true } },
};
