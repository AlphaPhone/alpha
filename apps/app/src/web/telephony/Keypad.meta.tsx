import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { keypad, recents } from "./fixtures.ts";
import type { KeypadProps } from "./Keypad.tsx";

export const meta: ComponentMeta<KeypadProps> = {
  args: { phone: keypad, onPress: fn(), onErase: fn(), onDial: fn() },
  examples: { Empty: { phone: { ...recents, tab: "KeypadTab" } }, Dialing: { phone: { ...keypad, dialing: true } } },
};
