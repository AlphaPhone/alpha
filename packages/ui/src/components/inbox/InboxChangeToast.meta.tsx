import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxChangeToastProps } from "./InboxChangeToast.tsx";

const onUndo = fn();

export const meta: ComponentMeta<InboxChangeToastProps> = {
  args: { operation: "archive", count: 3, phase: "holding", onUndo },
  examples: {
    "Trash held": { operation: "trash", count: 1 },
    "Archived, can restore": { phase: "done" },
    "Moved back": { operation: "unarchive", phase: "done", onUndo: undefined },
    Refused: { phase: "refused", onUndo: undefined },
    "Not confirmed": { phase: "unknown", onUndo: undefined },
    "Out of date": { operation: "untrash", phase: "outOfDate", onUndo: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onUndo.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Undo" }));
      await expect(onUndo.mock.calls.length).toBe(1);
    },
    "Archived, can restore": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Restore" })).toBeInTheDocument(),
    Refused: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
