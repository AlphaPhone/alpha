// spec/settings/index.md, "A page opens from its parent, and Back returns to that parent"
import { useSyncExternalStore } from "react";
import type { Page, Settings } from "../../../gen/settings.ts";
import type { Nearby } from "../../../gen/settings__network.ts";

/** A confirmation or sheet a Settings page holds open: erasing all data, a Wi-Fi password, or resetting unreadable preferences. */
export type PageDialog =
  | { readonly kind: "erase" }
  | { readonly kind: "join"; readonly network: Nearby }
  | { readonly kind: "resetPreferences" };

interface Held {
  readonly dialog: PageDialog;
  readonly page: Page;
  readonly opened: number;
}

let held: Held | null = null;
const listeners = new Set<() => void>();
const snapshot = (): Held | null => held;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function hold(next: Held | null): void {
  held = next;
  for (const listener of listeners) listener();
}

function onVisit(current: Held | null, nav: Settings): current is Held {
  return current !== null && current.page === nav.page && current.opened === nav.opened;
}

/** Open `dialog` on the visit of the page `nav` shows; another visit never shows it. */
export function openDialog(nav: Settings, dialog: PageDialog): void {
  hold({ dialog, page: nav.page, opened: nav.opened });
}

/** Close the dialog held, if any. */
export function closeDialog(): void {
  if (held !== null) hold(null);
}

/** The dialog open on the visit of the page `nav` shows. */
export function useDialog(nav: Settings): PageDialog | undefined {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return onVisit(current, nav) ? current.dialog : undefined;
}

/** Android's Back over the page `nav` shows: true when it closed that visit's dialog; a dialog of another visit is dropped and Back goes on. */
export function backDialog(nav: Settings): boolean {
  const current = held;
  closeDialog();
  return onVisit(current, nav);
}
