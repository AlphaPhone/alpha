import type { ComponentMeta } from "vibestack/stories";
import type { AutomationDetailProps } from "./AutomationDetail.tsx";
import { endedItem, listed, promptRow } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<AutomationDetailProps> = {
  args: {
    row: promptRow, canChange: true, onSwitch: none, onRun: none, onVerb: none, onSnooze: none, onEdit: none, onDelete: none, onEditPrompt: none,
  },
  examples: {
    WithHistory: { history: [{ at: Date.parse("2026-11-22T07:00:00.000Z"), status: "success" }, { at: Date.parse("2026-11-21T07:00:00.000Z"), status: "error", error: "Timed out" }] },
    AtTheLimit: { report: { answer: "refused", word: "limit" } },
    Held: { canChange: false },
    ScheduledItem: { row: listed.rows[1] },
    EndedItem: { row: endedItem },
  },
};
