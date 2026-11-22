import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ComposerBarProps } from "./ComposerBar.tsx";

const handlers = { onText: fn(), onSend: fn(), onStop: fn(), onTalk: fn(), onAttach: fn(), onRemoveFile: fn(), onClearTarget: fn(), onReviewUnsettled: fn() };

export const meta: ComponentMeta<ComposerBarProps> = {
  args: { text: "", files: [], typing: false, canSend: false, unsettled: false, ...handlers },
  examples: {
    Typed: { text: "Remind me at 5", canSend: true },
    Replying: { typing: true },
    Unsettled: { unsettled: true },
    Hosted: { text: "Hi", canSend: true, disclosure: "Prompts and the context you share go to Eliza Cloud.", locationShared: true },
  },
  play: {
    Typed: async ({ args, canvasElement }: { args: ComposerBarProps; canvasElement: HTMLElement }) => {
      await userEvent.type(within(canvasElement).getByRole("textbox", { name: "Message" }), "{Enter}");
      await expect(args.onSend).toHaveBeenCalled();
    },
    Replying: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Stop reply" })).toBeTruthy(),
  },
};
