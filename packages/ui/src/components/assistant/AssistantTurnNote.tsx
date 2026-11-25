import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";

/**
 * Where the last turn stands when it is not a plain reply: being sent, replying, stopping, checked after a stop,
 * stopped, finished anyway, not received, cut off, or not known to have arrived.
 */
export type AssistantTurnStatus =
  | "sending" | "replying" | "stopping" | "checking"
  | "stopped" | "finished" | "neverArrived" | "cutOff" | "unknown" | "lookLater";

export type AssistantTurnNoteProps = Omit<ComponentProps<"div">, "children"> & {
  /** Where the turn stands. */
  status: AssistantTurnStatus;
  /** What the agent says it is doing while the turn is in flight: its brief acknowledgment, or the app its tool uses. */
  label?: string;
  /** Reads the conversation once for a reply to the last message; offered when no turn is in flight. */
  onCheck?: () => void;
};

const notes: Record<AssistantTurnStatus, { status: StatusDotProps["status"]; label: string }> = {
  sending: { status: "busy", label: "Sending" },
  replying: { status: "busy", label: "Replying" },
  stopping: { status: "busy", label: "Stopping" },
  checking: { status: "busy", label: "Checking" },
  stopped: { status: "off", label: "Stopped" },
  finished: { status: "ok", label: "Finished anyway" },
  neverArrived: { status: "error", label: "Not sent" },
  cutOff: { status: "warn", label: "Reply cut off" },
  unknown: { status: "warn", label: "May not have arrived" },
  lookLater: { status: "warn", label: "Cannot tell yet" },
};

const busy: Partial<Record<AssistantTurnStatus, string>> = { sending: "Sending", replying: "Replying", stopping: "Stopping", checking: "Checking" };

/**
 * The state of the turn at the foot of the conversation: while Alpha is at work, three pulsing dots, or what it says it
 * is doing as shimmering words; otherwise a shape and a few words, with Check for reply where one read can say more.
 * @model spec/app/assistant/index.md
 */
export function AssistantTurnNote({ status, label, onCheck, className, ...props }: AssistantTurnNoteProps) {
  const working = busy[status];
  if (working !== undefined) {
    const words = label ?? (status === "stopping" || status === "checking" ? working : undefined);
    return words === undefined ? (
      <div role="status" aria-label={working} className={cn("flex gap-1.25 py-1.5", className)} {...props}>
        {["", "[animation-delay:200ms]", "[animation-delay:400ms]"].map((delay) => <span key={delay} aria-hidden className={cn("size-1.75 rounded-full bg-primary motion-safe:animate-blink", delay)} />)}
      </div>
    ) : (
      <div role="status" className={cn("self-start bg-linear-to-r from-muted-foreground from-40% via-foreground via-50% to-muted-foreground to-60% bg-size-[300%_100%] bg-clip-text py-1.5 text-base text-transparent motion-safe:animate-shimmer motion-reduce:text-muted-foreground", className)} {...props}>{words}</div>
    );
  }
  const note = notes[status];
  return (
    <div role="status" className={cn("flex min-h-11 items-center gap-3", className)} {...props}>
      <StatusDot status={note.status} label={label ?? note.label} showLabel />
      {onCheck ? <Button variant="secondary" size="sm" onClick={onCheck}>Check for reply</Button> : null}
    </div>
  );
}
