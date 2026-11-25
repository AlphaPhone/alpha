import { Ban, Lock, Mail, Search, Send, TriangleAlert, WifiOff } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

const states = {
  empty: { icon: <Mail />, title: "No mail" },
  emptySent: { icon: <Send />, title: "Nothing sent" },
  noResults: { icon: <Search />, title: "No results" },
  loading: { icon: <Mail />, title: "Loading Gmail…" },
  signedOut: { icon: <Mail />, title: "Connect Eliza Cloud" },
  notConnected: { icon: <Mail />, title: "Connect Gmail", action: "Add account" },
  needsAccess: { icon: <Lock />, title: "Alpha cannot read this mail", action: "Give access" },
  unavailable: { icon: <Ban />, title: "Not available here" },
  offline: { icon: <WifiOff />, title: "Cannot reach Gmail", action: "Try again" },
  failed: { icon: <TriangleAlert />, title: "Mail could not be read", action: "Try again" },
} as const;

export type InboxListStateKind = keyof typeof states;

export type InboxListStateProps = {
  /** Why there is no list: the folder or search has no mail, the first page is being read, or the owner must sign in, connect an account or give access, or mail cannot be read or reached. */
  kind: InboxListStateKind;
  /** Does what the state asks, such as signing in; its button is shown only with it, and only for a state that asks something. */
  onAction?: () => void;
};

/**
 * Stands where the list would be when there is nothing to list, with the one thing to do about it.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxListState({ kind, onAction }: InboxListStateProps) {
  const { icon, title, ...rest } = states[kind] as { icon: React.ReactNode; title: string; action?: string };
  return (
    <div role={kind === "loading" ? "status" : undefined} className="flex flex-col items-center gap-3 px-6 pt-27.5 text-center text-muted-foreground">
      <span aria-hidden className="[&_svg]:size-7">{icon}</span>
      <p className="text-base">{title}</p>
      {onAction && rest.action ? (
        <button type="button" onClick={onAction} className={cn(focusRing, "mt-1 h-9 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground")}>{rest.action}</button>
      ) : null}
    </div>
  );
}
