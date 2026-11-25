import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsPhonePageProps } from "./SettingsPhonePage.tsx";

export const meta: ComponentMeta<SettingsPhonePageProps> = {
  args: { onBack: fn() },
  decorator: fullHeight,
  examples: { "Android said nearby": { told: "nearby" } },
};
