/** A provider write made outside the Contacts view (an approved Alpha contact action) tells an open
    Contacts list to read the address book again. Only the signal crosses: no rows, no fields. */
const listeners = new Set<() => void>();
export function onContactsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function contactsChanged(): void {
  for (const listener of [...listeners]) listener();
}
