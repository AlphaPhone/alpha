import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { copy } from "../../assistant/presentation.vibe";
import { ConversationControlView } from "../voice/ConversationControlView.tsx";
import { DictationButton } from "../voice/DictationButton.tsx";
import { listening } from "../voice/fixtures.ts";
import { ChatSearchPanelView } from "./ChatSearchPanelView.tsx";
import type { ChatPanelViewProps } from "./ChatPanelView.tsx";
import { conversation, editTarget, longConversation, replyTarget, searchHits, streaming, waitingFiles } from "./fixtures.ts";

const handlers = {
  onQuote: fn(), onEdit: fn(), onApprove: fn(), onDecline: fn(), onOpenCard: fn(), onChoose: fn(), onListen: fn(), onOpenChange: fn(), onPlan: fn(), onOpenRun: fn(),
  onReviewApproval: fn(), onOpenMap: fn(), onEmail: fn(), onText: fn(), onSend: fn(), onStop: fn(), onTalk: fn(), onAttach: fn(), onRemoveFile: fn(), onClearTarget: fn(),
  onReviewUnsettled: fn(), onRestart: fn(), onSearch: fn(), onNewChat: fn(), onActivity: fn(),
};

const dictation = <DictationButton dictation={undefined} route="Device" native levels={[]} microphoneDenied={false} onStart={fn()} onStop={fn()} onRetry={fn()} onDiscard={fn()} onCancel={fn()} onOpenSettings={fn()} />;

export const meta: ComponentMeta<ChatPanelViewProps> = {
  args: {
    rows: conversation, typing: false, text: "", files: [], canSend: false, unsettled: false, canFork: true, cloud: "Eliza Cloud", emergency: false,
    now: Date.UTC(2030, 0, 1, 12, 0), restartOffered: false, restartBusy: false, searching: false, dictation, ...handlers,
  },
  examples: {
    Streaming: { rows: streaming, typing: true },
    LongConversation: { rows: longConversation },
    Replying: { text: "And by train?", canSend: true, target: replyTarget },
    Editing: { text: "How long to SFO?", canSend: true, target: editTarget },
    FilesAtCap: { files: waitingFiles, canSend: true },
    Unsettled: { text: "Book the hotel for those nights", unsettled: true },
    HostedWithNotice: { text: "Draft for later", canSend: true, notice: copy.savedLocally, disclosure: copy.hostedDisclosure("Eliza Cloud") },
    RestartOffered: { text: "Still there?", canSend: true, restartOffered: true },
    Searching: {
      searching: true,
      search: <ChatSearchPanelView query="milk" hits={searchHits} results canLoadMore={false} onQuery={fn()} onBack={fn()} onOpenHit={fn()} onMore={fn()} />,
    },
    VoiceRunning: {
      voice: <ConversationControlView conversation={listening} asking={undefined} placement="chat" onTalk={fn()} onStop={fn()} onStopSpeaking={fn()} onMute={fn()} onContinue={fn()} onDismiss={fn()} />,
    },
  },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("textbox", { name: "Message" })).toBeTruthy(),
    Streaming: async ({ args, canvasElement }: { args: ChatPanelViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("button", { name: "Chat actions" })).toBeDisabled();
      await userEvent.click(canvas.getByRole("button", { name: "Stop reply" }));
      await expect(args.onStop).toHaveBeenCalledTimes(1);
    },
    Replying: async ({ args, canvasElement }: { args: ChatPanelViewProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Send" }));
      await expect(args.onSend).toHaveBeenCalledTimes(1);
    },
    FilesAtCap: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Attach media" })).toBeDisabled(),
    Searching: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("textbox", { name: "Search chats" })).toBeTruthy(),
  },
};
