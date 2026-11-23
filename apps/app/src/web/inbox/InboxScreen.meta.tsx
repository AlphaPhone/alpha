import type { ComponentMeta } from "vibestack/stories";
import type { ScreenProps } from "../app-screen.ts";

const noop = () => undefined;

export const meta: ComponentMeta<ScreenProps> = {
  args: { onClose: noop },
};
