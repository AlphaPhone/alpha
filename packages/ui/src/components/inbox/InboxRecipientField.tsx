import type { FormEvent, ReactNode } from "react";
import { CircleAlert, UserRound, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

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
  /** More controls at the end of the line, such as the one that shows Cc and Bcc. */
  trailing?: ReactNode;
};

/** A 44px round control at the end of a draft's line. */
export const inboxLineButton = cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full active:bg-accent [&_svg]:size-5.5");

/**
 * One line of recipients of a draft: the addresses as chips that a press removes, a field to type another, and,
 * where the phone admits them, a way to pick from contacts.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxRecipientField({ label, recipients, value, onValueChange, onAdd, onRemove, onPickContact, trailing }: InboxRecipientFieldProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = value.trim();
    if (address) onAdd(address);
  };
  return (
    <div role="group" aria-label={label} className="flex min-h-13 items-start gap-2 border-b border-border py-1.5">
      <span aria-hidden className="flex h-9.5 w-6 shrink-0 items-center text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {recipients.map(({ address, valid }) => (
          <button
            key={address}
            type="button"
            aria-label={`Remove ${address}`}
            onClick={() => onRemove(address)}
            className={cn(focusRing, "flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-lg bg-secondary py-2 pr-2 pl-3 text-left text-sm font-semibold text-secondary-foreground", !valid && "text-destructive ring-1 ring-destructive")}
          >
            {valid ? null : <CircleAlert role="img" aria-label="Not an address Gmail accepts" className="size-4 shrink-0" />}
            <span className="min-w-0 break-all">{address}</span>
            <X aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        ))}
        <form noValidate onSubmit={submit} className="min-w-27.5 flex-1">
          <input
            type="email"
            aria-label={label}
            placeholder={recipients.length > 0 ? "Add" : label}
            enterKeyHint="done"
            autoComplete="off"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            className="h-9.5 w-full bg-transparent p-0 text-body leading-tight text-foreground outline-0 placeholder:text-muted-foreground"
          />
        </form>
      </div>
      {onPickContact ? <button type="button" aria-label="Choose contact" onClick={onPickContact} className={inboxLineButton}><UserRound aria-hidden /></button> : null}
      {trailing}
    </div>
  );
}
