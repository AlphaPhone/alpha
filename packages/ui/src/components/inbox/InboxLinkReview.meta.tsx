import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxLinkReviewProps } from "./InboxLinkReview.tsx";

const onOpen = fn();
const onClose = fn();

export const meta: ComponentMeta<InboxLinkReviewProps> = {
  args: { open: true, destination: "https://riveradesign.example/invoices/2041", claimed: undefined, onOpen, onClose },
  examples: { "Text names another address": { destination: "https://paymnt-check.example/login", claimed: "mybank.example" }, Closed: { open: false } },
  play: {
    Default: async () => {
      onOpen.mockClear();
      onClose.mockClear();
      const dialog = await screen.findByRole("alertdialog", { name: "Open this link?" });
      await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect([onOpen.mock.calls.length, onClose.mock.calls.length]).toEqual([0, 1]));
    },
    "Text names another address": async () => {
      const dialog = await screen.findByRole("alertdialog", { name: "Open this link?" });
      await expect(within(dialog).getByText(/mybank\.example/)).toBeInTheDocument();
    },
  },
};
