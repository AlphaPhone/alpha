import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxAccountSheetProps } from "./InboxAccountSheet.tsx";
import { sampleAccounts } from "./samples.ts";

const onChoose = fn();
const onOpenChange = fn();

export const meta: ComponentMeta<InboxAccountSheetProps> = {
  args: { open: true, accounts: sampleAccounts, selected: "1", onChoose, onOpenChange },
  play: {
    Default: async () => {
      onChoose.mockClear();
      onOpenChange.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Account" });
      await userEvent.click(within(sheet).getByRole("button", { name: /studio@/ }));
      await waitFor(() => expect([onChoose.mock.calls, onOpenChange.mock.calls]).toEqual([[["2"]], [[false]]]));
    },
  },
};
