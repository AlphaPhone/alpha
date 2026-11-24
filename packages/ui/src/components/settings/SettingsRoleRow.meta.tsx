import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsRoleRowProps } from "./SettingsRoleRow.tsx";

export const meta: ComponentMeta<SettingsRoleRowProps> = {
  args: { role: "home", word: "another" },
  decorator: inGroup,
  examples: { "Not on this phone": { role: "assistant", word: "not-on-this-phone" } },
};
