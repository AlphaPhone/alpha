import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ChatSearchPanelProps } from "./ChatSearchPanel.tsx";

export const meta: ComponentMeta<ChatSearchPanelProps> = {
  args: { onClose: fn() },
  play: {
    Default: async ({ args, canvasElement }: { args: ChatSearchPanelProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("textbox", { name: "Search chats" })).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Back to chat" }));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
    },
  },
};
