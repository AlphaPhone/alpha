import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxFileOfferSheetProps } from "./InboxFileOfferSheet.tsx";

const onTakeIn = fn();
const onLeaveOut = fn();

export const meta: ComponentMeta<InboxFileOfferSheetProps> = {
  args: { open: true, name: "Photo of the receipt.jpg", size: "2.4 MB", source: "Photos", into: "draft", onTakeIn, onLeaveOut },
  examples: { "New email": { into: "new", name: "Lease.pdf", source: "Files", size: "310 KB" } },
  play: {
    Default: async () => {
      onTakeIn.mockClear();
      onLeaveOut.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Attach to your draft?" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Attach" }));
      await expect(onTakeIn.mock.calls.length).toBe(1);
      await userEvent.click(within(sheet).getByRole("button", { name: "Leave out" }));
      await waitFor(() => expect(onLeaveOut.mock.calls.length).toBe(1));
    },
  },
};
