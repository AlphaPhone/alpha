import type { ComponentMeta } from "vibestack/stories";
import type { TabSwitcherProps } from "./TabSwitcher.tsx";
import { switcherSession } from "./fixtures.ts";

export const meta: ComponentMeta<TabSwitcherProps> = {
  args: { session: switcherSession },
};
