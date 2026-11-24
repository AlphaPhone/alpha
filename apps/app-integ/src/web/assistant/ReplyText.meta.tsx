import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ReplyTextProps } from "./ReplyText.tsx";
import { choiceReply, workflowReply } from "./fixtures.ts";

export const meta: ComponentMeta<ReplyTextProps> = {
  args: { segments: choiceReply, onChoose: fn(), onOpenRun: fn() },
  examples: { Workflow: { segments: workflowReply } },
  play: {
    Default: async ({ args, canvasElement }: { args: ReplyTextProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getAllByRole("button")).toHaveLength(2);
      await expect(canvas.getByText(/\[CHOICE:maps-share id=r2\]/)).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Share" }));
      await expect(args.onChoose).toHaveBeenCalledWith("yes");
    },
    Workflow: async ({ args, canvasElement }: { args: ReplyTextProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Open workflow run Morning brief" }));
      await expect(args.onOpenRun).toHaveBeenCalledWith("w1", "r1");
    },
  },
};
