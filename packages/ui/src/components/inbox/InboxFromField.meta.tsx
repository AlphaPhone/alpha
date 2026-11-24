import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxFromFieldProps } from "./InboxFromField.tsx";
import { sampleAccounts } from "./samples.ts";

const onChange = fn();

export const meta: ComponentMeta<InboxFromFieldProps> = {
  args: { accounts: sampleAccounts.slice(0, 2), value: "1", onChange },
  examples: { "A reply keeps its account": { onChange: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChange.mockClear();
      await userEvent.click(within(canvasElement).getByRole("combobox", { name: "From" }));
      await userEvent.click(await screen.findByRole("option", { name: /studio@/ }));
      await waitFor(() => expect([onChange.mock.calls, screen.queryByRole("listbox")]).toEqual([[["2"]], null]));
    },
    "A reply keeps its account": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("combobox", { name: "From" })).toBeDisabled(),
  },
};
