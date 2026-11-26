import { Effect, type ManagedRuntime } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import type { NewDraft } from "../../gen/app__messages.effect.vibe";
import { Inbox } from "./messages.vibe";

/** The display-only label admitted for exactly this New visit and bound recipient. */
export function useNewRecipientTitle(runtime: ManagedRuntime.ManagedRuntime<Inbox, unknown>, scope: Pick<NewDraft, "visit" | "recipient"> | undefined, contactsAllowed: boolean): string {
  const source = useMemo(() => runtime.runSync(Effect.map(Inbox, (inbox) => inbox.newRecipient)), [runtime]);
  const named = useSyncExternalStore(source.subscribe, source.get, source.get);
  if (scope === undefined || named === undefined || named.visit !== scope.visit || named.recipient !== scope.recipient) return "";
  return named.contacts && !contactsAllowed ? named.numbers : named.title;
}
