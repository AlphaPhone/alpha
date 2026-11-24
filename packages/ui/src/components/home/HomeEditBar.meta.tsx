import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeEditBarProps } from "./HomeEditBar.tsx";

const onShowHidden = fn();
const onDone = fn();

export const meta: ComponentMeta<HomeEditBarProps> = {
  args: { onShowHidden, onDone },
  examples: {
    "Nothing to add": { onShowHidden: undefined },
    "Not saved": { notice: { tag: "TellNotSaved" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onShowHidden.mockClear();
      onDone.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Add to Home" }));
      await userEvent.click(canvas.getByRole("button", { name: "Done" }));
      await expect([onShowHidden.mock.calls.length, onDone.mock.calls.length]).toEqual([1, 1]);
    },
    "Nothing to add": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("button", { name: "Add to Home" })).toBeDisabled(),
    "Not saved": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Couldn't save your change to Home"),
  },
};
