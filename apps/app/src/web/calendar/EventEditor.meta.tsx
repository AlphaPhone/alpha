import type { ComponentMeta } from "vibestack/stories";
import type { EventEditorProps } from "./EventEditor.tsx";
import { conflictDraft, newEventFields, offeredDraft, openDraft, recoveryDraft } from "./fixtures.ts";

const handlers = {
  onEdit: () => undefined, onRestore: () => Promise.resolve(undefined), onReview: () => undefined, onAnswerReview: () => undefined,
  onRetry: () => undefined, onRecovery: () => undefined, onSave: () => undefined, onClose: () => undefined,
};
const base = { fields: newEventFields, recurring: false, timingLocked: false, deviceZone: "UTC", loading: false, otherAccount: false, eventChanged: false, problem: "", ...handlers };

export const meta: ComponentMeta<EventEditorProps> = {
  args: { ...base, draft: openDraft },
  examples: {
    Retained: { ...base, draft: offeredDraft },
    Conflict: { ...base, draft: conflictDraft },
    Untitled: { ...base, fields: { ...newEventFields, title: "" }, draft: openDraft },
    OtherAccount: { ...base, otherAccount: true, draft: openDraft },
    Repeating: { ...base, recurring: true, fields: { ...newEventFields, repeat: "preserve", expectedProviderVersion: "etag-1" }, draft: openDraft },
    TimingKept: { ...base, timingLocked: true, draft: openDraft },
    Recovery: { ...base, draft: recoveryDraft },
    Refused: { ...base, problem: "That time does not exist or occurs twice because the clocks change. Choose another time. Nothing was saved.", draft: openDraft },
  },
};
