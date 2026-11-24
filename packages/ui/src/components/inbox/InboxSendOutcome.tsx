import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";

const outcomes = {
  sending: { variant: "info", text: "Sending" },
  sent: { variant: "info", text: "Sent" },
  refused: { variant: "warn", text: "Not sent. Nothing went out." },
  stopped: { variant: "warn", text: "Not sent. The draft changed or sending was switched off." },
  unknown: { variant: "warn", text: "Alpha cannot tell whether it was sent" },
  foundSent: { variant: "info", text: "It was sent" },
  notSent: { variant: "info", text: "It was not sent" },
} as const;

export type InboxSendOutcomeProps = {
  /** How the send ended: under way, sent, refused or stopped before anything went out, unknown, or settled by looking in Sent. */
  outcome: keyof typeof outcomes;
  /** Looks in Gmail's Sent once to find out; offered only for an unknown send not yet checked. */
  onCheckSent?: () => void;
  /** A check of Sent is under way. */
  checking?: boolean;
  /** Reviews sending again, knowing it may already have gone; the owner's choice alone does this, never Alpha. */
  onSendAgain?: () => void;
  /** Puts the notice away; an unknown outcome stays until the owner has seen it. */
  onDismiss?: () => void;
};

/**
 * How the last send of a draft ended, told honestly: an outcome Alpha cannot confirm is never repeated behind the
 * owner's back, and only the owner chooses to check Sent or to send again.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxSendOutcome({ outcome, onCheckSent, checking = false, onSendAgain, onDismiss }: InboxSendOutcomeProps) {
  const { variant, text } = outcomes[outcome];
  const actions = [
    onCheckSent ? <Button key="check" variant="ghost" size="sm" loading={checking} onClick={onCheckSent}>Check Sent</Button> : null,
    onSendAgain ? <Button key="again" variant="ghost" size="sm" onClick={onSendAgain}>Send again</Button> : null,
    onDismiss ? <Button key="dismiss" variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button> : null,
  ].filter(Boolean);
  return <Banner variant={variant} action={actions.length ? <div className="flex flex-wrap justify-end">{actions}</div> : undefined}>{text}</Banner>;
}
