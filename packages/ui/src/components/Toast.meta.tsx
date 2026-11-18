import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ToastProps } from "./Toast.tsx";

const onUndo = fn();

export const meta: ComponentMeta<ToastProps> = {
  args: { children: "Note deleted", onUndo: undefined },
  examples: { Undo: { onUndo }, "Two lines": { children: "3 notes moved to Travel, where they are kept until the trip ends", onUndo } },
  play: {
    Undo: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onUndo.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Undo" }));
      await expect(onUndo.mock.calls.length).toBe(1);
    },
  },
};
