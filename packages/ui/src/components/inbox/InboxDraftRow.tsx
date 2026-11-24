import { ListRow } from "../ListRow.tsx";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";

const states: Record<"plain" | "sent" | "earlierSent" | "sending" | "unsure" | "clash", { status: StatusDotProps["status"]; label: string } | undefined> = {
  plain: undefined,
  sent: { status: "ok", label: "Already sent" },
  earlierSent: { status: "warn", label: "Earlier version sent" },
  sending: { status: "busy", label: "Being sent" },
  unsure: { status: "warn", label: "Not sure of Gmail's copy" },
  clash: { status: "warn", label: "Changed in Gmail" },
};

export type InboxDraftRowProps = {
  /** Who it is to, as the draft's recipients; "No recipient" while it has none. */
  to: string;
  /** Its subject, or its first words. */
  subject: string;
  /** What is known of it: sent, sent and changed since, handed to an operation, unsure of its Gmail copy, or at a clash. */
  state?: "plain" | "sent" | "earlierSent" | "sending" | "unsure" | "clash";
  /** Brings it back exactly as it was set aside; offered only while no draft is open. */
  onResume?: () => void;
};

/**
 * One draft set aside, with what is known of it.
 *
 * @model spec/app/inbox/shelf.md
 */
export function InboxDraftRow({ to, subject, state = "plain", onResume }: InboxDraftRowProps) {
  const mark = states[state];
  return <ListRow title={subject} detail={to} trailing={mark ? <StatusDot status={mark.status} label={mark.label} /> : undefined} onClick={onResume} />;
}
