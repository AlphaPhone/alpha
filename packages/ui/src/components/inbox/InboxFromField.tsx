import { cn, focusRing } from "../../lib/cn.ts";
import type { InboxAccount } from "./InboxAccountList.tsx";

export type InboxFromFieldProps = {
  /** The accounts the message may be sent from: those the owner may read. */
  accounts: InboxAccount[];
  /** The account it is sent from now. */
  value: string;
  /** Changes the account; offered only for a new message with no copy in Gmail, never while an address is half typed. Left out, the account is shown and cannot be changed. */
  onChange?: (id: string) => void;
};

/**
 * The account a message is sent from, changed only where nothing is left behind: a reply, a forward and a draft saved
 * in Gmail keep the account they came from. With one account it is only shown.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxFromField({ accounts, value, onChange }: InboxFromFieldProps) {
  const chosen = accounts.find((account) => account.id === value);
  if (accounts.length <= 1) {
    return <div className="flex min-h-11 items-center border-b border-border text-sm break-all text-muted-foreground">{chosen?.email ?? ""}</div>;
  }
  return (
    <label className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border text-muted-foreground">
      From
      <select
        aria-label="From account"
        disabled={!onChange}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(focusRing, "min-h-11 max-w-full min-w-0 flex-1 bg-background p-1.5 text-foreground")}
      >
        {accounts.map(({ id, email }) => <option key={id} value={id}>{email}</option>)}
      </select>
    </label>
  );
}
