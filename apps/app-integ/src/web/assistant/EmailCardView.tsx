// spec/assistant/emailCard.md, "Story: Send an email my agent drafted, from the chat"; spec/assistant/emailCard.md, "Send is offered for a draft with an account, valid recipients and a body, and dispatches once per version"; spec/assistant/emailCard.md, "Send needs literal recipients, each listed once, under the account the card was drafted for; a word for me stands for that account until the first edit"
import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { canSendEmail, sendRecipientsOk, type EmailCard } from "../../../gen/assistant__emailCard.ts";
import { Button, Card, CardFooter, CardTitle, Input, Label, Textarea } from "../components/ui/index.ts";

/** An email card's state, its fields as the agent drafted them, and the owner's answers. */
export type EmailCardViewProps = {
  /** The card's state as its machine holds it. */
  card: EmailCard;
  /** The recipients as drafted, separated by commas or semicolons. */
  to: string;
  /** The subject as drafted. */
  subject: string;
  /** The body as drafted. */
  body: string;
  /** The selected account's address, shown for "me" until the owner edits To. */
  ownAddress?: string;
  /** The owner changed a field; a new version follows. */
  onEdit: (fields: { readonly to: string; readonly subject: string; readonly body: string }) => void;
  /** The owner pressed Send on the fields shown. */
  onSend: (fields: { readonly to: string; readonly subject: string; readonly body: string }) => void;
  /** The owner chose not to send it. */
  onDecline: () => void;
};

const status = {
  DraftEmail: "", SendingEmail: "Check Inbox for delivery status.", SentEmail: "Sent.", RejectedEmail: "Gmail rejected this email.",
  UncertainEmail: "Delivery is unconfirmed. Check the receipt in Inbox.", DeclinedEmail: "Not sent.",
} as const;

const recipientsOf = (to: string) => to.split(/[,;]/).map((entry) => entry.trim()).filter((entry) => entry !== "");
const selfWord = /^(self|me|myself)$/i;
const valid = (to: string, literal: boolean) => {
  const list = recipientsOf(to);
  const distinct = new Set(list.map((entry) => entry.toLowerCase())).size;
  return sendRecipientsOk(list.length, distinct, literal && !list.some((entry) => selfWord.test(entry)), true) && list.every((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));
};

/**
 * An email the agent drafted, edited and sent inside the conversation; every recipient is listed before Send.
 * @model spec/assistant/emailCard.md
 */
export function EmailCardView({ card, to, subject, body, ownAddress, onEdit, onSend, onDecline }: EmailCardViewProps) {
  const self = selfWord.test(to.trim()) && ownAddress !== undefined;
  const [fields, setFields] = useState({ to: self ? ownAddress ?? to : to, subject, body });
  const [edited, setEdited] = useState(false);
  const draft = card.state === "DraftEmail";
  const change = (next: typeof fields) => { setFields(next); setEdited(true); onEdit(next); };
  const recipients = recipientsOf(fields.to);
  const offered = canSendEmail({ ...card, recipients: valid(fields.to, !selfWord.test(to.trim()) || edited), body: fields.body.trim() !== "" });
  return (
    <Card className="gap-3 p-4" aria-label="Email draft">
      <CardTitle className="flex items-center gap-2"><Mail aria-hidden className="size-4" />{fields.subject || "Email"}</CardTitle>
      <div className="flex flex-col gap-1">
        <Label htmlFor="assistant-email-to">To</Label>
        <Input id="assistant-email-to" value={fields.to} disabled={!draft} onChange={(event) => change({ ...fields, to: event.target.value })} />
        <p className="text-xs text-muted-foreground">{recipients.length} recipient{recipients.length === 1 ? "" : "s"}{recipients.length > 0 ? `: ${recipients.join(", ")}` : ""}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="assistant-email-subject">Subject</Label>
        <Input id="assistant-email-subject" value={fields.subject} disabled={!draft} onChange={(event) => change({ ...fields, subject: event.target.value })} />
      </div>
      <Textarea aria-label="Body" value={fields.body} disabled={!draft} className="min-h-24 font-legible" onChange={(event) => change({ ...fields, body: event.target.value })} />
      {status[card.state] !== "" && <p role="status" className="text-sm text-muted-foreground">{status[card.state]}</p>}
      {draft && (
        <CardFooter className="gap-2">
          <Button disabled={!offered} onClick={() => onSend(fields)}><Send aria-hidden className="size-4" />Send</Button>
          <Button variant="outline" onClick={onDecline}>Don’t send</Button>
        </CardFooter>
      )}
    </Card>
  );
}
