import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import {
  commsAlpha, commsMessagesList, commsThread, composing, draftsAlpha, draftsComposing, draftsPictures, inThread, inThreadQuiet, noDrafts, restoredCard,
  simChoices, threads, threadsEmpty, threadsFailed, threadsFiltered, threadsLoading, threadsMany, threadsNeedAccess,
} from "./fixtures.ts";
import type { MessagesScreenViewProps } from "./MessagesScreenView.tsx";

export const meta: ComponentMeta<MessagesScreenViewProps> = {
  args: {
    messages: threads, drafts: noDrafts, now: threads.readAt, notice: "", answer: "", sims: [], comms: commsMessagesList, request: "", card: null,
    onBack: fn(), onCallThread: fn(), onSearchOpened: fn(), onComposeOpened: fn(), onQuery: fn(), onOpenThread: fn(), onAllow: fn(), onRefresh: fn(),
    onMore: fn(), onClearQuery: fn(), onPickerQuery: fn(), onAddRecipient: fn(), onPick: fn(), onRecipientsChanged: fn(), onMenu: fn(),
    onDeleteAsked: fn(), onDeleteCancelled: fn(), onDeleteConfirmed: fn(), onLink: fn(), onOwnerTyped: fn(), onSend: fn(), onAdopt: fn(),
    onAlphaDraftEdited: fn(), onDiscard: fn(), onUndo: fn(), onChooseSim: fn(), onAttach: fn(), onRemovePicture: fn(), onAsk: fn(),
    onRequest: fn(), onSubmitRequest: fn(), onAlpha: fn(), onEndCall: fn(), onCloseChat: fn(), onDecline: fn(),
  },
  examples: {
    Loading: { messages: threadsLoading },
    NeedsAccess: { messages: threadsNeedAccess },
    Failed: { messages: threadsFailed },
    Empty: { messages: threadsEmpty },
    ManyThreads: { messages: threadsMany },
    AlphaFilter: { messages: threadsFiltered, answer: "Maya wrote about five o’clock." },
    Composing: { messages: composing, drafts: draftsComposing, comms: commsThread },
    Thread: { messages: inThread, comms: commsThread, card: restoredCard },
    AlphaDraft: { messages: inThreadQuiet, drafts: draftsAlpha, comms: commsAlpha },
    SimRequired: { messages: inThreadQuiet, drafts: draftsPictures, comms: commsThread, notice: "Pick a SIM.", sims: simChoices },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const list = within(canvasElement);
      await userEvent.click(list.getByRole("button", { name: "New message" }));
      await expect(args.onComposeOpened).toHaveBeenCalled();
      await userEvent.click(list.getByRole("button", { name: /Maya Chen/ }));
      await expect(args.onOpenThread).toHaveBeenCalledWith("thread:1");
    },
    Composing: async ({ canvasElement, args }) => {
      const compose = within(canvasElement);
      await userEvent.click(compose.getByRole("button", { name: "Sam Okafor, 4155550122" }));
      await expect(args.onPick).toHaveBeenCalledWith("9:4155550122");
      await userEvent.click(compose.getByRole("button", { name: "Remove 4155550111" }));
      await expect(args.onRecipientsChanged).toHaveBeenCalledWith([]);
    },
    AlphaDraft: async ({ canvasElement, args }) => {
      const draft = within(canvasElement);
      await userEvent.click(draft.getByRole("button", { name: "Send" }));
      await expect(args.onSend).toHaveBeenCalledWith("thread:1");
    },
    SimRequired: async ({ canvasElement, args }) => {
      const thread = within(canvasElement);
      await userEvent.click(thread.getByRole("button", { name: "Work" }));
      await expect(args.onChooseSim).toHaveBeenCalledWith("thread:1", 2);
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  },
};
