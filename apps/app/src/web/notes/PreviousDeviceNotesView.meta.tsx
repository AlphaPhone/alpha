import type { ComponentMeta } from "vibestack/stories";
import type { PreviousDeviceNotesViewProps } from "./PreviousDeviceNotesView.tsx";
import { earlierNotes, earlierUnreadable, noEarlierNotes } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<PreviousDeviceNotesViewProps> = {
  args: { data: earlierNotes, onRetry: none, onClose: none },
  examples: {
    Checking: { data: undefined },
    NothingKept: { data: noEarlierNotes },
    Unreadable: { data: earlierUnreadable },
  },
};
