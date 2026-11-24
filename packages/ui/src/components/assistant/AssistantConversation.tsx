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
  /** How far Ask Alpha is raised: resting on its bar, open as a half-screen sheet, or filling the screen. */
  detent?: "bar" | "sheet" | "full";
};

/**
 * Ask Alpha as a resting bar, a half-screen sheet or the full screen: the handle, header, messages and composer.
 * Keeping the composer mounted in one slot across detents preserves focus and the native keyboard session on tap.
 * @model spec/app/assistant/index.md
 */
export function AssistantConversation({ header, transcript, composer, detent = "sheet", className, ...props }: AssistantConversationProps) {
  const resting = detent === "bar";
  const full = detent === "full";
  return (
    <section
      aria-label="Ask Alpha"
      data-host-chrome=""
      data-alpha-detent={detent}
      className={cn(
        "flex min-h-0 flex-col bg-background text-foreground",
        resting ? "z-dock h-auto touch-none rounded-t-tile border-t border-border shadow-lg" : "z-sheet shadow-sheet",
        full ? "h-full rounded-none" : resting ? null : "h-1/2 rounded-t-sheet",
        className,
      )}
      {...props}
    >
      {header.grabber}
      <div hidden={resting} className={cn("flex min-h-0 flex-col", resting ? "max-h-0 overflow-hidden" : "flex-1")}>
        <AssistantChatHeader {...header} grabber={undefined} />
        <AssistantTranscript {...transcript} className={cn("flex-1", transcript.className)} />
      </div>
      <AssistantComposer {...composer} variant={resting ? "bar" : "sheet"} />
    </section>
  );
}
