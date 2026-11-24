import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AgentActivityViewProps } from "./AgentActivityView.tsx";
import { closeTabsCard, liveCard, manyConversations, savedConversations, unsettledHistory } from "./fixtures.ts";

const handlers = { onBack: fn(), onRetry: fn(), onOpenConversation: fn(), onRestart: fn(), onApprove: fn(), onDecline: fn(), onSettle: fn() };

export const meta: ComponentMeta<AgentActivityViewProps> = {
  args: {
    conversations: { kind: "ready", value: savedConversations },
    pending: { kind: "ready", value: [liveCard] },
    history: { kind: "ready", value: unsettledHistory },
    restartOffered: false, restartBusy: false, chatOnly: false, emergency: false, now: Date.UTC(2030, 0, 1, 12, 0),
    ...handlers,
  },
  examples: {
    Loading: { conversations: { kind: "loading" }, pending: { kind: "loading" }, history: { kind: "loading" } },
    Nothing: { conversations: { kind: "ready", value: [] }, pending: { kind: "ready", value: [] }, history: { kind: "ready", value: [] } },
    Unreadable: { conversations: { kind: "failed" }, pending: { kind: "failed" }, history: { kind: "failed" } },
    ManyConversations: { conversations: { kind: "ready", value: manyConversations }, pending: { kind: "ready", value: [liveCard, closeTabsCard] } },
    ChatOnly: { chatOnly: true, pending: { kind: "ready", value: [] } },
    EmergencyCall: { emergency: true },
    RestartOffered: { restartOffered: true },
    Restarting: { restartOffered: true, restartBusy: true },
  },
  play: {
    Default: async ({ args, canvasElement }: { args: AgentActivityViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /^Lisbon trip/ }));
      await expect(args.onOpenConversation).toHaveBeenCalledWith("c-1");
      await userEvent.click(canvas.getAllByRole("button", { name: "Leave unresolved" })[0]!);
      await expect(args.onSettle).toHaveBeenCalledWith(unsettledHistory[0], "unresolved");
    },
    Unreadable: async ({ args, canvasElement }: { args: AgentActivityViewProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getAllByRole("button", { name: "Try again" })[0]!);
      await expect(args.onRetry).toHaveBeenCalledTimes(1);
    },
    Restarting: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Restart Alpha" })).toBeDisabled(),
  },
};
