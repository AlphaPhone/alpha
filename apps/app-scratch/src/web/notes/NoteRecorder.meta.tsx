import type { ComponentMeta } from "vibestack/stories";
import { claimUnconfirmed, recording, recordingDisplay } from "./fixtures.ts";
import type { NoteRecorderProps } from "./NoteRecorder.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NoteRecorderProps> = {
  args: { recorder: recording, display: recordingDisplay,
    can: { pause: true, resume: false, stop: true, finish: true, discard: false, askDiscard: true, retry: false },
    onPause: noop, onResume: noop, onStop: noop, onFinish: noop, onDiscard: noop, onAskDiscard: noop, onKeep: noop, onRetry: noop },
  examples: {
    ClaimUnconfirmed: { recorder: claimUnconfirmed, can: { pause: false, resume: false, stop: false, finish: true, discard: false, askDiscard: false, retry: false } },
    ConfirmDiscard: { recorder: { ...recording, confirmingDiscard: true }, can: { pause: true, resume: false, stop: true, finish: true, discard: true, askDiscard: false, retry: false } },
  },
};
