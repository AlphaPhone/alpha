import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/voice__conversation.ts";
import type { ConversationControlViewProps } from "./ConversationControlView.tsx";
import { awaitingReview, listening, pausedForCall, refusedForCall, retiring, retrying, speakingMuted, stopUnconfirmed, takingTurns } from "./fixtures.ts";

export const meta: ComponentMeta<ConversationControlViewProps> = {
  args: { conversation: initial, asking: undefined, placement: "dock", onTalk: fn(), onStop: fn(), onStopSpeaking: fn(), onMute: fn(), onContinue: fn(), onDismiss: fn() },
  examples: {
    DisclosureForCloud: { asking: "Cloud" },
    DisclosureForCartesia: { asking: "Direct" },
    Listening: { conversation: listening },
    SpeakingMuted: { conversation: speakingMuted },
    TakingTurns: { conversation: takingTurns },
    AwaitingReview: { conversation: awaitingReview },
    Retrying: { conversation: retrying },
    Stopping: { conversation: retiring },
    RefusedForCall: { conversation: refusedForCall },
    StopUnconfirmed: { conversation: stopUnconfirmed },
    InChatAfterCall: { conversation: pausedForCall, placement: "chat" },
  },
  play: {
    DisclosureForCloud: async ({ args }: { args: ConversationControlViewProps }) => {
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));
      await expect(args.onContinue).toHaveBeenCalledTimes(1);
    },
    Listening: async ({ args, canvasElement }: { args: ConversationControlViewProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Mute Alpha" }));
      await expect(args.onMute).toHaveBeenCalledWith(true);
    },
    StopUnconfirmed: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Talk" })).toBeDisabled(),
    InChatAfterCall: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Talk" })).toBeNull(),
  },
};
