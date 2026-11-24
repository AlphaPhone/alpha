import type { ComponentMeta } from "vibestack/stories";
import type { NavigationChipProps } from "./NavigationChip.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NavigationChipProps> = {
  args: { open: noop },
};
