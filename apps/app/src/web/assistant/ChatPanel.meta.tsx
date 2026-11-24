import { expect, fn, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ChatPanelProps } from "./ChatPanel.tsx";

export const meta: ComponentMeta<ChatPanelProps> = {
  args: { open: fn(), onTalk: fn() },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("textbox", { name: "Message" })).toBeTruthy(),
  },
};
