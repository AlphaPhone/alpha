import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Sheet, SheetContent } from "./Sheet.tsx";
import { Toast, type ToastRegionProps } from "./Toast.tsx";

const onUndo = fn();
const toast = <Toast onUndo={onUndo}>Note deleted</Toast>;

export const meta: ComponentMeta<ToastRegionProps> = {
  args: { children: toast },
  examples: {
    "Over a sheet": {
      children: (
        <>
          <Sheet defaultOpen>
            <SheetContent title="Move to" />
          </Sheet>
          {toast}
        </>
      ),
    },
  },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("status")).toHaveTextContent("Note deletedUndo"),
    "Over a sheet": async () => {
      onUndo.mockClear();
      await screen.findByRole("dialog", { name: "Move to" });
      await userEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Undo" }), { pointerEventsCheck: 0 });
      await expect(onUndo.mock.calls.length).toBe(1);
    },
  },
};
