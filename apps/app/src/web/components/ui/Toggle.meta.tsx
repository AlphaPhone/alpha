import { MicOff, Volume2 } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { ToggleProps } from "./Toggle.tsx";

export const meta: ComponentMeta<ToggleProps> = {
  args: { "aria-label": "Mute", defaultPressed: false, onPressedChange: () => undefined, children: <MicOff aria-hidden className="size-6" /> },
  examples: {
    Speaker: { "aria-label": "Speaker", children: <Volume2 aria-hidden className="size-6" /> },
    "Disabled pressed": { disabled: true, defaultPressed: true },
  },
};
