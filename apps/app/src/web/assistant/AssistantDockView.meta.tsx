import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ChatPanelView } from "./ChatPanelView.tsx";
import type { AssistantDockViewProps } from "./AssistantDockView.tsx";
import { conversation } from "./fixtures.ts";

const chat = (
  <ChatPanelView
    rows={conversation} typing={false} text="" files={[]} canSend={false} unsettled={false} canFork cloud="Eliza Cloud" emergency={false}
    now={Date.UTC(2030, 0, 1, 12, 0)} restartOffered={false} restartBusy={false} searching={false}
    onQuote={fn()} onEdit={fn()} onApprove={fn()} onDecline={fn()} onOpenCard={fn()} onChoose={fn()} onPlan={fn()} onOpenRun={fn()} onEmail={fn()}
    onText={fn()} onSend={fn()} onStop={fn()} onTalk={fn()} onAttach={fn()} onRemoveFile={fn()} onClearTarget={fn()} onReviewUnsettled={fn()}
    onSearch={fn()} onNewChat={fn()} onActivity={fn()}
  />
);

const handlers = { onDown: fn(), onMove: fn(), onTap: fn(), onSettleDrag: fn(), onCancelDrag: fn(), onSizeButton: fn(), onCloseChat: fn(), onTouchOutside: fn() };
const collapsed = { NoControl: true, OpenControl: true, TypeControl: true, ResizeControl: false };
const open = { NoControl: true, OpenControl: false, TypeControl: false, ResizeControl: true };
const none = { NoControl: false, OpenControl: false, TypeControl: false, ResizeControl: false };

export const meta: ComponentMeta<AssistantDockViewProps> = {
  args: {
    chat: "Input", remembered: false, dragging: false, moved: false, pressable: collapsed,
    canSizeButton: false, canCloseChat: false, canTouchOutside: false, canCancelDrag: false, children: chat, ...handlers,
  },
  examples: {
    Pill: { chat: "Hidden" },
    HalfSheet: { chat: "Sheet", pressable: open, canSizeButton: true, canCloseChat: true, canTouchOutside: true },
    FullScreen: { chat: "Full", pressable: { ...open, ResizeControl: false }, canSizeButton: true, canCloseChat: true },
    Dragging: { chat: "Sheet", remembered: true, dragging: true, moved: true, pressable: none, canCloseChat: true, canCancelDrag: true },
    LateClickSwallowed: { chat: "Full", pressable: { ...open, ResizeControl: false } },
    VoiceRunning: { pressable: none },
  },
  play: {
    HalfSheet: async ({ args, canvasElement }: { args: AssistantDockViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Expand chat" }));
      await expect(args.onSizeButton).toHaveBeenCalledTimes(1);
      await userEvent.click(canvas.getByRole("button", { name: "Close chat" }));
      await expect(args.onCloseChat).toHaveBeenCalledTimes(1);
    },
    LateClickSwallowed: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Shrink chat" })).toBeDisabled(),
  },
};
