import type { ComponentProps } from "react";
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

/**
 * The state of the turn at the foot of the conversation: a shape and a few words, with Check for reply where one read can say more.
 * @model spec/app/assistant/index.md
 */
export function AssistantTurnNote({ status, label, onCheck, ...props }: AssistantTurnNoteProps) {
  const note = notes[status];
  return (
    <div role="status" className="flex min-h-11 items-center gap-3" {...props}>
      <StatusDot status={note.status} label={label ?? note.label} showLabel />
      {onCheck ? <Button variant="secondary" size="sm" onClick={onCheck}>Check for reply</Button> : null}
    </div>
  );
}
