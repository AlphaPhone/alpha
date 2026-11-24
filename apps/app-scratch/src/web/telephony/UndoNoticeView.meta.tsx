import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { undoQueued, undoRefused, undoUncertain } from "./fixtures.ts";
import type { UndoNoticeViewProps } from "./UndoNoticeView.tsx";

export const meta: ComponentMeta<UndoNoticeViewProps> = {
  args: { undo: undoQueued, onUndo: fn(), onDismiss: fn() },
  examples: { Uncertain: { undo: undoUncertain }, Refused: { undo: undoRefused } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Undo" }));
      await expect(args.onUndo).toHaveBeenCalledWith("message:sms:1");
    },
    Uncertain: async ({ canvasElement, args }) => {
      const notice = within(canvasElement);
      await expect(notice.queryByRole("button", { name: "Undo" })).toBeNull();
      await userEvent.click(notice.getByRole("button", { name: "Dismiss" }));
      await expect(args.onDismiss).toHaveBeenCalledWith("voicemail:v1");
    },
  },
};
