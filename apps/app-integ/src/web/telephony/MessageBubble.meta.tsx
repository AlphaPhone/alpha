import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { deliveredText, receivedText, sentPictures } from "./fixtures.ts";
import type { MessageBubbleProps } from "./MessageBubble.tsx";

export const meta: ComponentMeta<MessageBubbleProps> = {
  args: { row: receivedText, onMenu: fn(), onDeleteAsked: fn(), onDeleteCancelled: fn(), onDeleteConfirmed: fn(), onLink: fn() },
  examples: {
    Delivered: { row: deliveredText },
    Pictures: { row: sentPictures },
    Sending: { row: { ...deliveredText, condition: "PendingOut" }, local: true },
    Menu: { menu: "open" },
    Confirming: { menu: "confirming" },
    Blocked: { menu: "open", deleteBlocked: true },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("link", { name: /example\.com/ }));
      await expect(args.onLink).toHaveBeenCalledWith("https://example.com/map");
    },
    Pictures: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByText("Delivered")).toBeNull();
    },
    Sending: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("button", { name: /Copy/ })).toBeNull();
    },
    Confirming: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /^Delete/ }));
      await expect(args.onDeleteConfirmed).toHaveBeenCalled();
    },
  },
};
