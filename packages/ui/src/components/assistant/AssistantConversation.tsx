import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { AssistantChatHeader, type AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";
import { AssistantChatHistory, type AssistantChatHistoryProps } from "./AssistantChatHistory.tsx";
import { AssistantComposer, type AssistantComposerProps } from "./AssistantComposer.tsx";
import { AssistantPill, type AssistantPillProps } from "./AssistantPill.tsx";
import { AssistantTranscript, type AssistantTranscriptProps } from "./AssistantTranscript.tsx";

export type AssistantConversationProps = Omit<ComponentProps<"section">, "children"> & {
  /** The top of the sheet: Go Home, the handle, and the size and Minimize controls. */
  header: AssistantChatHeaderProps;
  /** The messages and the turn's state. */
  transcript: AssistantTranscriptProps;
  /** The conversations, shown inside the sheet in place of the messages while given. */
  history?: AssistantChatHistoryProps;
  /** The composer: the floating bar at rest, the field at the foot of the sheet. */
  composer: AssistantComposerProps;
  /** The controls of the pill, drawn at rest inside an app. */
  pill?: AssistantPillProps;
  /** How far Ask Alpha is raised: resting on its bar, at rest as the pill inside an app, open as a sheet, or filling the screen. */
  detent?: "bar" | "pill" | "sheet" | "full";
};

/**
 * Ask Alpha as Alpha drew it before VibeStack: a floating bar on Home, a small pill inside an app, a sheet on the quiet
 * card surface, or the full screen. The composer stays mounted in one slot across detents, hidden under the pill, so
 * focus and the native keyboard session survive a tap that raises it.
 * @model spec/app/assistant/index.md
 */
export function AssistantConversation({ header, transcript, history, composer, pill, detent = "sheet", className, ...props }: AssistantConversationProps) {
  const resting = detent === "bar" || detent === "pill";
  const full = detent === "full";
  return (
    <section
      aria-label="Ask Alpha"
      data-host-chrome=""
      data-alpha-detent={detent}
      className={cn(
        "flex flex-col text-foreground",
        resting ? "z-dock" : "z-sheet overflow-hidden bg-card",
        full ? "h-full rounded-none pt-4" : resting ? null : cn("rounded-t-sheet pt-1", props.style?.height ? "max-h-dvh" : "min-h-[38dvh] max-h-[60dvh]"),
        className,
      )}
      {...props}
    >
      <div hidden={resting} className={cn("min-h-0 flex-1 basis-auto flex-col", resting ? "hidden" : "flex")}>
        <AssistantChatHeader {...header} grabber={full ? undefined : header.grabber} />
        {history
          ? <AssistantChatHistory {...history} className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-2", history.className)} />
          : <AssistantTranscript {...transcript} className={cn("flex-1", transcript.className)} />}
      </div>
      {detent === "pill" ? <AssistantPill {...pill} className={cn("mb-6.5", pill?.className)} /> : null}
      <AssistantComposer {...composer} variant={resting ? "bar" : "sheet"} className={cn(detent === "pill" && "sr-only", composer.className)} />
    </section>
  );
}
