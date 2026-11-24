import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsLicenceDetailProps } from "./SettingsLicenceDetail.tsx";

export const meta: ComponentMeta<SettingsLicenceDetailProps> = {
  args: {
    name: "react",
    licence: "MIT",
    text: "Copyright the react authors.\n\nPermission is granted to use, copy, modify and distribute this software under the terms of the MIT licence, provided that this notice is kept in all copies.",
    onBack: fn(),
  },
  decorator: fullHeight,
  examples: { "With what it obliges": { name: "libwebp", licence: "BSD-3-Clause", flags: ["Weak copyleft", "No license file in package"] } },
};
