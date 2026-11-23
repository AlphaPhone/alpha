import { CircleAlert, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type InboxPillProps = {
  /** What it is: an address, or a file's name. */
  label: string;
  /** Marks an address Gmail does not accept; it is counted invalid until it is removed. */
  invalid?: boolean;
  /** Removes it from the draft; the remove control is shown only with it. */
  onRemove?: () => void;
};

/** One recipient or attachment of the draft, as a pill with a 44px control to take it out. */
export function InboxPill({ label, invalid = false, onRemove }: InboxPillProps) {
  return (
    <span className={cn("inline-flex h-9 max-w-full items-center rounded-full bg-secondary pl-3 text-sm text-secondary-foreground", invalid && "border border-destructive text-destructive", !onRemove && "pr-3")}>
      {invalid ? <CircleAlert role="img" aria-label="Not an address Gmail accepts" className="mr-1.5 size-4 shrink-0" /> : null}
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className={cn(focusRing, "relative flex size-9 shrink-0 items-center justify-center rounded-full before:absolute before:-inset-1")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
