import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { PhoneScreenProps } from "./PhoneScreen.tsx";

export const meta: ComponentMeta<PhoneScreenProps> = {
  args: { onClose: fn() },
  examples: {
    Recents: { route: "recents" },
    Keypad: { route: "keypad:(415) 555-0100" },
    Voicemail: { route: "voicemail" },
    Info: { route: "info" },
    MalformedRoute: { route: "keypad:call Maya" },
  },
};
