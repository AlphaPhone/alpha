import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDraftNoticeProps } from "./AssistantDraftNotice.tsx";
import { presses } from "./plays.ts";

const onRetry = fn();
const onRecover = fn();
const onRestoreSaved = fn();
const onKeepCurrent = fn();
const onCheck = fn();

export const meta: ComponentMeta<AssistantDraftNoticeProps> = {
  args: { status: "failed", onRetry },
  examples: {
    Opening: { status: "opening", onRetry: undefined },
    Damaged: { status: "damaged", onRetry: undefined, onRecover },
    Unreadable: { status: "unreadable", onRetry: undefined, onReopen: fn() },
    Long: { status: "long", onRetry: undefined },
    Conflict: { status: "conflict", onRetry: undefined, saved: "Ask Ana whether Friday lunch still stands, and book Cais if so.", onRestoreSaved, onKeepCurrent },
    Review: { status: "review", onRetry: undefined, saved: "What is on my calendar tomorrow?", onCheck, onRestoreSaved, onKeepCurrent },
  },
  play: {
    Default: presses("Retry", onRetry),
    Conflict: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRestoreSaved.mockClear();
      onKeepCurrent.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Restore saved" }));
      await userEvent.click(canvas.getByRole("button", { name: "Keep current" }));
      await expect([onRestoreSaved.mock.calls.length, onKeepCurrent.mock.calls.length]).toEqual([1, 1]);
    },
    Review: presses("Check for reply", onCheck),
  },
};
