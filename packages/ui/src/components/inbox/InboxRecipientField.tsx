import type { FormEvent } from "react";
import { BookUser } from "lucide-react";
import { Button } from "../Button.tsx";
import { Input } from "../Input.tsx";
import { InboxPill } from "./InboxPill.tsx";

export type InboxRecipient = {
  /** The address. */
  address: string;
  /** Whether Gmail accepts it; one it does not is shown as invalid until removed. */
  valid: boolean;
};

export type InboxRecipientFieldProps = {
  /** Which line of the message these recipients are on. */
  label: "To" | "Cc" | "Bcc";
  /** The recipients so far. */
  recipients: InboxRecipient[];
  /** The address being typed; the parent keeps it. */
  value: string;
  /** Called with the text as it is typed. */
  onValueChange: (value: string) => void;
  /** Adds the address typed, when it is submitted. */
  onAdd: (address: string) => void;
  /** Removes a recipient. */
  onRemove: (address: string) => void;
  /** Picks from the phone's contacts; offered only where this phone has them, or to be shown how to allow them. */
  onPickContact?: () => void;
};

/**
 * One line of recipients of a draft: the addresses as pills, a field to type another, and, where the phone admits
 * them, a way to pick from contacts.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxRecipientField({ label, recipients, value, onValueChange, onAdd, onRemove, onPickContact }: InboxRecipientFieldProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = value.trim();
    if (address) onAdd(address);
  };
  return (
    <div role="group" aria-label={label} className="flex items-start gap-2">
      <span aria-hidden className="w-9 shrink-0 py-3 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0 py-0.5">
        {recipients.map(({ address, valid }) => <InboxPill key={address} label={address} invalid={!valid} onRemove={() => onRemove(address)} />)}
        <form onSubmit={submit} className="min-w-32 flex-1">
          <Input type="email" aria-label={`Add to ${label}`} enterKeyHint="done" autoComplete="off" value={value} onChange={(event) => onValueChange(event.target.value)} className="h-11 border-0 px-1" />
        </form>
      </div>
      {onPickContact ? <Button variant="ghost" size="icon" aria-label={`Pick ${label} from contacts`} onClick={onPickContact}><BookUser /></Button> : null}
    </div>
  );
}
