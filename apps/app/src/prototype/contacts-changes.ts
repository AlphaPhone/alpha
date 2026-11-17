/** A provider write made outside the Contacts view (an approved Alpha contact action) tells an open
    Contacts list to read the address book again. Only the signal crosses, with whether the write's
    outcome is unconfirmed: no rows, no fields. */
export type ContactsChange = {unconfirmed: boolean};
const listeners = new Set<(change: ContactsChange) => void>();
export function onContactsChanged(listener: (change: ContactsChange) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function contactsChanged(change: ContactsChange = {unconfirmed: false}): void {
  for (const listener of [...listeners]) listener(change);
}
