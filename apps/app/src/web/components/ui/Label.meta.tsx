import type { ComponentMeta } from "vibestack/stories";
import type { LabelProps } from "./Label.tsx";
import { Switch } from "./Switch.tsx";

export const meta: ComponentMeta<LabelProps> = {
  args: { children: <><Switch />Wi-Fi calling</> },
  examples: {
    "Disabled control": { children: <><Switch disabled />Wi-Fi calling</> },
    Long: { children: <><Switch />Send calls from unknown numbers straight to voicemail and let Alpha take a message</> },
  },
};
