// spec/inbox/agentDrafts.md, "Story: Send an email the agent drafted for me, after I check it"
import { Send } from "lucide-react";
import { useState } from "react";
import type { EmailCard } from "../../../gen/inbox__agentDrafts.ts";
import { Button, Card, Input, Textarea } from "../components/ui/index.ts";

export type EmailCardViewProps = {
  /** The card as the agent-drafts machine holds it. */
  card: EmailCard;
  onEdit: (revision: number, recipients: string[], subject: string, body: string) => void;
  onSend: () => void;
  onDecline: () => void;
};

const status: Record<EmailCard["phase"], string> = {
  CardDraft: "", CardDeclined: "Not sent.", CardSending: "Sending…", CardSent: "Sent.",
  CardRejected: "Gmail rejected this email.", CardUncertain: "Delivery is unconfirmed. Check the receipt in Inbox.",
};

/**
 * An email the agent drafted in chat: editable until the owner sends or declines it, then its outcome.
 * @model spec/inbox/agentDrafts.md
 */
export function EmailCardView({ card, onEdit, onSend, onDecline }: EmailCardViewProps) {
  const [to, setTo] = useState(card.recipients.join(", "));
  const [subject, setSubject] = useState(card.subject);
  const [body, setBody] = useState(card.body);
  const editable = card.phase === "CardDraft";
  const recipients = (text: string) => text.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  return (
    <Card className="flex flex-col gap-2 p-3" aria-label="Email draft">
      <Input aria-label="To" value={to} readOnly={!editable} onChange={(event) => { setTo(event.currentTarget.value); onEdit(card.revision, recipients(event.currentTarget.value), subject, body); }} />
      <Input aria-label="Subject" value={subject} readOnly={!editable} onChange={(event) => { setSubject(event.currentTarget.value); onEdit(card.revision, recipients(to), event.currentTarget.value, body); }} />
      <Textarea aria-label="Message" value={body} readOnly={!editable} onChange={(event) => { setBody(event.currentTarget.value); onEdit(card.revision, recipients(to), subject, event.currentTarget.value); }} />
      {status[card.phase] !== "" && <p role="status" className="text-sm">{status[card.phase]}</p>}
      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDecline}>Don't send</Button>
          <Button disabled={recipients(to).length === 0 || body.trim() === ""} onClick={onSend}><Send aria-hidden />Send</Button>
        </div>
      )}
    </Card>
  );
}
