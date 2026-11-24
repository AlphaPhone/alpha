import { Ban, Inbox, Lock, LogIn, Mail, SearchX, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";

const states = {
  empty: { icon: <Inbox />, title: "Nothing here" },
  noResults: { icon: <SearchX />, title: "No matches" },
  signedOut: { icon: <LogIn />, title: "Sign in to read your mail", action: "Sign in" },
  notConnected: { icon: <Mail />, title: "Connect Gmail", action: "Connect Gmail" },
  needsAccess: { icon: <Lock />, title: "Alpha cannot read this mail", action: "Give access" },
  unavailable: { icon: <Ban />, title: "Not available here" },
  offline: { icon: <WifiOff />, title: "Cannot reach Gmail", action: "Try again" },
  failed: { icon: <TriangleAlert />, title: "Mail could not be read", action: "Try again" },
} as const;

export type InboxListStateKind = keyof typeof states;

export type InboxListStateProps = {
  /** Why there is no list: the folder or search has no mail, or the owner must sign in, connect an account or give access, or mail cannot be read or reached. */
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
  return <EmptyState icon={icon} title={title}>{onAction && rest.action ? <Button onClick={onAction}>{rest.action}</Button> : null}</EmptyState>;
}
