import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { AssistantChatHeader, type AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";
import { AssistantComposer, type AssistantComposerProps } from "./AssistantComposer.tsx";
import { AssistantTranscript, type AssistantTranscriptProps } from "./AssistantTranscript.tsx";

export type AssistantConversationProps = Omit<ComponentProps<"section">, "children"> & {
  /** The top of the sheet: handle, name, context and the ways to find or start a conversation. */
  header: AssistantChatHeaderProps;
  /** The messages and the turn's state. */
  transcript: AssistantTranscriptProps;
  /** The composer at the foot. */
  composer: AssistantComposerProps;
};

/**
 * Ask Alpha as a sheet or the full screen: the header, the messages and the composer, filling the height the shell gives
 * it. It composes the smaller components, so the screen only passes state and handlers.
 * @model spec/app/assistant/index.md
 */
export function AssistantConversation({ header, transcript, composer, className, ...props }: AssistantConversationProps) {
  return (
    <section aria-label="Ask Alpha" className={cn("z-sheet flex h-full min-h-0 flex-col rounded-t-sheet bg-background text-foreground shadow-sheet", className)} {...props}>
      <AssistantChatHeader {...header} />
      <AssistantTranscript {...transcript} className={cn("flex-1", transcript.className)} />
      <AssistantComposer {...composer} variant="sheet" />
    </section>
  );
}
