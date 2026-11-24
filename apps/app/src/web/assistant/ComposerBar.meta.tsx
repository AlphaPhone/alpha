import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ComposerBarProps } from "./ComposerBar.tsx";

const handlers = { onText: fn(), onSend: fn(), onStop: fn(), onTalk: fn(), onAttach: fn(), onRemoveFile: fn(), onClearTarget: fn(), onReviewUnsettled: fn(), onRestart: fn() };

export const meta: ComponentMeta<ComposerBarProps> = {
  args: { text: "", files: [], typing: false, canSend: false, unsettled: false, ...handlers },
  examples: {
    Typed: { text: "Remind me at 5", canSend: true },
    Replying: { typing: true },
    Unsettled: { unsettled: true },
    Hosted: { text: "Hi", canSend: true, disclosure: "Prompts and the context you share go to Eliza Cloud.", locationShared: true },
    RestartNeeded: { text: "Still here", canSend: true, restartOffer: { kind: "restart" } },
    Restarting: { restartOffer: { kind: "restart" }, restartBusy: true },
    CouldNotStart: { restartOffer: { kind: "retry", refusal: "CouldNotStart" } },
    StartupCheckFailed: { restartOffer: { kind: "retry", refusal: "StartupCheckFailed" }, restartBusy: true },
  },
  play: {
    Typed: async ({ args, canvasElement }: { args: ComposerBarProps; canvasElement: HTMLElement }) => {
      await userEvent.type(within(canvasElement).getByRole("textbox", { name: "Message" }), "{Enter}");
      await expect(args.onSend).toHaveBeenCalled();
    },
    Replying: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Stop reply" })).toBeTruthy(),
    RestartNeeded: async ({ args, canvasElement }: { args: ComposerBarProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Restart Alpha" }));
      await expect(args.onRestart).toHaveBeenCalledTimes(1);
    },
    Restarting: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Restart Alpha" })).toBeDisabled(),
    CouldNotStart: async ({ args, canvasElement }: { args: ComposerBarProps; canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByText("Couldn’t start.")).toBeTruthy();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(args.onRestart).toHaveBeenCalledTimes(1);
    },
    StartupCheckFailed: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Try again" })).toBeDisabled(),
  },
};
