import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { Alert } from "../Alert.tsx";
import { AssistantChatHeader, type AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";
import { AssistantComposer, type AssistantComposerProps } from "./AssistantComposer.tsx";
import { AssistantTranscript, type AssistantTranscriptProps } from "./AssistantTranscript.tsx";
import { type AssistantBarDrag, useAssistantBarDrag } from "./assistant-pull.ts";

export type AssistantConversationProps = Omit<ComponentProps<"section">, "children"> & {
  /** The top of the sheet: handle, name, context and the ways to find or start a conversation. */
  header: AssistantChatHeaderProps;
  /** Which files could not be attached or saved with the message. */
  attachmentNotice?: string;
  /** The messages and the turn's state. */
  transcript: AssistantTranscriptProps;
  /** The dictation recorder within the open conversation. */
  voicePanel?: ReactNode;
  /** The composer at the foot; its variant follows the detent unless given, as a sheet pulled up from the bar keeps the bar under it. */
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
export function AssistantConversation({ header, attachmentNotice, transcript, voicePanel, composer, detent = "sheet", barDrag, className, ...props }: AssistantConversationProps) {
  const resting = detent === "bar";
  const dragging = useAssistantBarDrag(barDrag ?? {});
  const full = detent === "full";
  const panel = resting ? undefined : voicePanel;
  return (
    <section
      aria-label="Ask Alpha"
      data-host-chrome=""
      data-alpha-detent={detent}
      className={cn(
        "flex flex-col text-foreground",
        resting ? "z-dock in-[body:has([data-covers-dock])]:invisible" : "z-sheet overflow-hidden bg-card",
        full
          ? "h-full rounded-none pt-[calc(env(safe-area-inset-top)+--spacing(1))] in-data-[alpha-native]:pt-[calc(max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))+--spacing(4))]"
          : resting ? null : cn("rounded-t-chat pt-1", props.style?.height ? "max-h-dvh" : "min-h-[38dvh] max-h-[60dvh]"),
        className,
      )}
      {...(resting && barDrag ? dragging : {})}
      {...props}
    >
      <div hidden={resting} className={cn("min-h-0 flex-1 basis-auto flex-col", resting ? "hidden" : "flex", panel && "overflow-y-auto")}>
        <AssistantChatHeader {...header} grabber={full ? undefined : header.grabber} />
        {attachmentNotice && <Alert variant="warn" className="mx-3 shrink-0">{attachmentNotice}</Alert>}
        {panel}
        <AssistantTranscript {...transcript} className={cn("flex-1", transcript.className)} />
      </div>
      <AssistantComposer {...composer} voice={panel ? undefined : composer.voice} hidden={Boolean(panel) || composer.hidden} variant={composer.variant ?? (resting ? "bar" : "sheet")} />
    </section>
  );
}
