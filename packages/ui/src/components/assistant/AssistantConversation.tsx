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
  /** An action for the open context directly below the chat header. */
  contextAction?: ReactNode;
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
  /** Dismisses the open half-sheet when tapping the dimmed backdrop scrim; when omitted, no internal scrim is drawn. */
  onDismiss?: () => void;
  /** A drag anywhere on the resting bar moves Ask Alpha as a drag of its handle does, the sheet following the finger as it rises; left out where it may not be dragged. */
  barDrag?: AssistantBarDrag;
  /**
   * The bar, or the pill, Ask Alpha will rest on, drawn under a sheet that is being pulled down onto it or shrinking onto
   * it after a tap, as v119 drew them (45f6bed30 chat-overlay-motion-adapter.ts:968-973, 990-996). It takes no input.
   */
  underlay?: "bar" | "pill";
};

const scrimClass = "fixed inset-0 z-assistant-sheet bg-foreground/15 transition-opacity duration-fast ease-standard motion-safe:animate-fade motion-reduce:transition-none dark:bg-background/50";
const noop = () => undefined;

/**
 * Ask Alpha as a resting bar, a half-screen sheet or the full screen: the handle, header, messages and composer.
 * Keeping the composer mounted in one slot across detents preserves focus and the native keyboard session on tap.
 * @model spec/app/assistant/index.md
 */
export function AssistantConversation({ header, contextAction, attachmentNotice, transcript, voicePanel, composer, detent = "sheet", onDismiss, barDrag, underlay, className, ...props }: AssistantConversationProps) {
  const resting = detent === "bar";
  const sheet = detent === "sheet";
  const full = detent === "full";
  const dragging = useAssistantBarDrag(barDrag ?? {});
  const panel = resting ? undefined : voicePanel;
  return (
    <>
      {underlay ? (
        <div inert aria-hidden data-alpha-underlay="" className="pointer-events-none fixed inset-x-0 bottom-0 z-dock mx-auto max-w-md">
          <AssistantComposer {...composer} fieldRef={undefined} fieldPull={undefined} onFocusField={undefined} voice={undefined} opener={undefined} variant="bar" onOpen={noop} onType={underlay === "pill" ? noop : undefined} />
        </div>
      ) : null}
      {sheet && onDismiss ? (
        <button type="button" aria-hidden tabIndex={-1} data-alpha-assistant-scrim="" onClick={onDismiss} className={cn(scrimClass, "cursor-default")} />
      ) : null}
      <section
        aria-label="Ask Alpha"
        data-host-chrome=""
        data-alpha-detent={detent}
        className={cn(
          "relative flex flex-col text-foreground",
          resting ? "z-dock in-[body:has([data-covers-dock])]:invisible" : "z-assistant-sheet overflow-hidden bg-popover text-popover-foreground [interpolate-size:allow-keywords]",
          full
            ? "h-full rounded-none pt-[calc(var(--alpha-safe-top)+--spacing(1))] in-data-[alpha-native]:pt-[calc(var(--alpha-safe-top)+--spacing(4))]"
            : resting ? null : cn("rounded-t-chat border-t border-border/60 pt-2 shadow-sheet dark:border-border", props.style?.height ? "max-h-dvh" : "min-h-[38dvh] max-h-[60dvh]"),
          className,
        )}
        {...(barDrag ? { ...dragging, onPointerDownCapture: resting ? dragging.onPointerDownCapture : undefined } : {})}
        {...props}
      >
        <div hidden={resting} className={cn("min-h-0 flex-1 basis-auto flex-col", resting ? "hidden" : "flex", panel ? "overflow-y-auto" : "overflow-hidden")}>
          <AssistantChatHeader {...header} expanded={header.expanded ?? full} grabber={full ? undefined : header.grabber} />
          {contextAction}
          {attachmentNotice && <Alert variant="warn" className="mx-3 shrink-0">{attachmentNotice}</Alert>}
          {panel}
          <AssistantTranscript {...transcript} visible={transcript.visible ?? !resting} className={cn("flex-1", transcript.className)} />
        </div>
        <AssistantComposer {...composer} voice={panel ? undefined : composer.voice} hidden={Boolean(panel) || composer.hidden} variant={composer.variant ?? (resting ? "bar" : "sheet")} />
      </section>
    </>
  );
}
