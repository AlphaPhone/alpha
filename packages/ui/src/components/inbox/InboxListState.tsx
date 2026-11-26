import { Ban, Lock, Mail, TriangleAlert, WifiOff } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

const states = {
  empty: { icon: <Mail />, title: "Your Inbox is empty" },
  emptySent: { icon: <Mail />, title: "No sent messages" },
  emptyArchive: { icon: <Mail />, title: "No archived messages" },
  emptyTrash: { icon: <Mail />, title: "Trash is empty" },
  emptyDrafts: { icon: <Mail />, title: "No drafts" },
  searchPrompt: { icon: <Mail />, title: "Search" },
  noResults: { icon: <Mail />, title: "No messages match this search" },
  loading: { icon: <Mail />, title: "Loading Inbox…" },
  checking: { icon: <Mail />, title: "Checking…" },
  signedOut: { icon: <Mail />, title: "Connect Eliza Cloud" },
  notConnected: { icon: <Mail />, title: "Connect Gmail", body: "Google will ask for access to read, send, and organize mail.", action: "Connect Gmail" },
  needsAccess: { icon: <Lock />, title: "Alpha cannot read this mail", body: "Google will ask for access to read, send, and organize mail.", action: "Give access" },
  unavailable: { icon: <Ban />, title: "Not available here" },
  offline: { icon: <WifiOff />, title: "Cannot reach Gmail", action: "Try again" },
  failed: { icon: <TriangleAlert />, title: "Mail could not be read", action: "Try again" },
} as const;

export type InboxListStateKind = keyof typeof states;

export type InboxListStateProps = {
  /** Why there is no list: the folder or search has no mail, the first page or the accounts are being read, or the owner must sign in, connect an account or give access, or mail cannot be read or reached. */
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
  const { icon, title, ...rest } = states[kind] as { icon: React.ReactNode; title: string; body?: string; action?: string };
  return (
    <div role={kind === "loading" || kind === "checking" ? "status" : undefined} className={cn("flex flex-col items-center gap-3 px-6 pt-27.5 text-center text-muted-foreground", (kind === "signedOut" || kind === "searchPrompt") && "mt-2")}>
      <span aria-hidden className="[&_svg]:size-7">{icon}</span>
      <p className="text-base">{title}</p>
      {rest.body ? <p className="max-w-60 text-sm">{rest.body}</p> : null}
      {onAction && rest.action ? (
        <button type="button" onClick={onAction} className={cn(focusRing, "mt-1 h-9 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground")}>{rest.action}</button>
      ) : null}
    </div>
  );
}
