import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import type { PreviousDeviceNotes } from "./PreviousDeviceNotes.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<ComponentProps<typeof PreviousDeviceNotes>> = {
  args: { onClose: noop },
};
