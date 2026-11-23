import type { ComponentMeta } from "vibestack/stories";
import { recordingDisplay } from "./fixtures.ts";
import type { NotesRecordingBadgeProps } from "./NotesRecordingBadge.tsx";

export const meta: ComponentMeta<NotesRecordingBadgeProps> = {
  args: { paused: false, durationMs: recordingDisplay.durationMs, onOpen: () => undefined },
  examples: { Paused: { paused: true }, JustStarted: { durationMs: 0 } },
};
