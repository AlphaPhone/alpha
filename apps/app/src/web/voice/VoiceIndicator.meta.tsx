import type { ComponentMeta } from "vibestack/stories";
import type { VoiceIndicatorProps } from "./VoiceIndicator.tsx";

const noop = () => {};

export const meta: ComponentMeta<VoiceIndicatorProps> = {
  args: { open: noop },
};
