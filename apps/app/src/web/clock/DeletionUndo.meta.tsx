import type { ComponentMeta } from "vibestack/stories";
import type { DeletionUndoProps } from "./DeletionUndo.tsx";
import { pendingDeletions } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DeletionUndoProps> = {
  args: { notices: pendingDeletions, onUndo: none, onDismiss: none, onRefresh: none },
  examples: { TooLate: { notices: { ...pendingDeletions, rows: [], report: "UndoTooLate" } } },
};
