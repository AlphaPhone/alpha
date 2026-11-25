import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { Alert } from "../Alert.tsx";
import { AssistantChatHeader, type AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";
import { AssistantComposer, type AssistantComposerProps } from "./AssistantComposer.tsx";
import { type AssistantBarDrag, useAssistantBarDrag } from "./AssistantGrabber.tsx";
import { AssistantTranscript, type AssistantTranscriptProps } from "./AssistantTranscript.tsx";

export type AssistantConversationProps = Omit<ComponentProps<"section">, "children"> & {
  /** The top of the sheet: handle, name, context and the ways to find or start a conversation. */
  header: AssistantChatHeaderProps;
  /** Which files could not be attached or saved with the message. */
  attachmentNotice?: string;
  /** The messages and the turn's state. */
  transcript: AssistantTranscriptProps;
  /** The composer at the foot. */
  composer: AssistantComposerProps;
  /** How far Ask Alpha is raised: resting on its bar, open as a half-screen sheet, or filling the screen. */
  detent?: "bar" | "sheet" | "full";
  /** A drag anywhere on the resting bar moves Ask Alpha as a drag of its handle does; left out where it may not be dragged. */
  barDrag?: AssistantBarDrag;
};

/**
 * Ask Alpha as a resting bar, a half-screen sheet or the full screen: the handle, header, messages and composer.
 * Keeping the composer mounted in one slot across detents preserves focus and the native keyboard session on tap.
 * @model spec/app/assistant/index.md
 */
export function AssistantConversation({ header, attachmentNotice, transcript, composer, detent = "sheet", barDrag, className, ...props }: AssistantConversationProps) {
  const resting = detent === "bar";
  const dragging = useAssistantBarDrag(barDrag ?? {});
  const full = detent === "full";
  return (
    <section
      aria-label="Ask Alpha"
      data-host-chrome=""
      data-alpha-detent={detent}
      className={cn(
        "flex flex-col text-foreground",
        resting ? "z-dock" : "z-sheet overflow-hidden bg-card",
        full ? "h-full rounded-none pt-[calc(max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))+--spacing(4))]" : resting ? null : cn("rounded-t-sheet pt-1", props.style?.height ? "max-h-dvh" : "min-h-[38dvh] max-h-[60dvh]"),
        className,
      )}
      {...(resting && barDrag ? dragging : {})}
      {...props}
    >
      <div hidden={resting} className={cn("min-h-0 flex-1 basis-auto flex-col", resting ? "hidden" : "flex")}>
        <AssistantChatHeader {...header} grabber={full ? undefined : header.grabber} />
        {attachmentNotice && <Alert variant="warn" className="mx-3 shrink-0">{attachmentNotice}</Alert>}
        <AssistantTranscript {...transcript} className={cn("flex-1", transcript.className)} />
      </div>
      <AssistantComposer {...composer} variant={resting ? "bar" : "sheet"} />
    </section>
  );
}
