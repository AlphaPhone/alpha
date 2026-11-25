import { Sheet, SheetContent, type SheetProps } from "../Sheet.tsx";
import { AssistantChatHistory, type AssistantChatHistoryProps } from "./AssistantChatHistory.tsx";

export type AssistantChatHistorySheetProps = Pick<SheetProps, "open" | "onOpenChange"> & {
  /** What the sheet shows. */
  history: AssistantChatHistoryProps;
  /** Returns focus to the chat actions that opened the sheet. */
  onReturnFocus?: () => void;
};

/**
 * The conversations in a sheet over Ask Alpha; choosing one or starting a new one is the screen's to close it by.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHistorySheet({ open, onOpenChange, history, onReturnFocus }: AssistantChatHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Chats" data-alpha-own-gesture="" onCloseAutoFocus={onReturnFocus && ((event) => {
        event.preventDefault();
        onReturnFocus();
      })}>
        <AssistantChatHistory {...history} />
      </SheetContent>
    </Sheet>
  );
}
