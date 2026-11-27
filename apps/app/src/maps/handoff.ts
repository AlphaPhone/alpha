// spec/app/maps/cards.md, "A card's Map button runs one flow, chosen from what the card carries"; spec/app/maps/index.md, "A query another app hands to Maps opens as a search, never over navigation"

let pending: string | undefined;
let opening: string | undefined;
const listeners = new Set<() => void>();
const wakeAll = () => { for (const wake of listeners) wake(); };

/** Leave a search for Maps to open, or none: the newest card's replaces an earlier one Maps has not taken. */
export function handToMaps(query: string | undefined): void {
  pending = query;
  wakeAll();
}

/** Forget the search left for Maps, as Maps leaves the screen without having taken it. @throws {never} */
export function dropHandedQuery(): void {
  pending = undefined;
  wakeAll();
}

/** The search left for Maps and not on its way to it now. */
export function handedQuery(): string | undefined {
  return pending === opening ? undefined : pending;
}

/**
 * Offer the search left for Maps to `open`, which answers undefined when Maps cannot take it now, or else whether
 * Maps took it. The search is on its way meanwhile, so it is offered once at a time, and it is forgotten only once
 * Maps took it: one Maps refused stays left for the next offer.
 */
export async function offerHandedQuery(open: (query: string) => Promise<boolean> | undefined): Promise<void> {
  const query = handedQuery();
  const taking = query === undefined ? undefined : open(query);
  if (taking === undefined) return;
  opening = query;
  wakeAll();
  const taken = await taking;
  opening = undefined;
  if (taken && pending === query) pending = undefined;
  wakeAll();
}

/** Wake `wake` whenever a search is left, offered or taken; the returned function stops it. */
export function watchHandoff(wake: () => void): () => void {
  listeners.add(wake);
  return () => { listeners.delete(wake); };
}
