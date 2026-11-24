import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select.tsx";
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
 * in Gmail keep the account they came from.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxFromField({ accounts, value, onChange }: InboxFromFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="w-9 shrink-0 text-sm text-muted-foreground">From</span>
      <Select value={value} onValueChange={onChange} disabled={!onChange}>
        <SelectTrigger aria-label="From" className="border-0 px-1" />
        <SelectContent>
          {accounts.map(({ id, email }) => <SelectItem key={id} value={id}>{email}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
