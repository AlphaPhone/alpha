import type { ComponentMeta } from "vibestack/stories";
import type { NotesRecordingIndicatorProps } from "./NotesRecordingIndicator.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NotesRecordingIndicatorProps> = {
  args: { open: noop },
};
