import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxAccountListProps } from "./InboxAccountList.tsx";
import { sampleAccounts as accounts } from "./samples.ts";

const onChoose = fn();

export const meta: ComponentMeta<InboxAccountListProps> = {
  args: { accounts, selected: "1", onChoose },
  examples: { "None chosen": { selected: undefined }, "On a card": { surface: "card" }, "Cannot choose": { onChoose: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: /sam\.rivera/ })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: /studio@/ }));
      await expect(onChoose.mock.calls).toEqual([["2"]]);
    },
  },
};
