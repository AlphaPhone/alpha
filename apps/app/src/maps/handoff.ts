// spec/app/maps/cards.md, "A card's Map button runs one flow, chosen from what the card carries"; spec/app/maps/index.md, "A query another app hands to Maps opens as a search, never over navigation"

let pending: string | undefined;
const listeners = new Set<() => void>();

/** Leave a search for Maps to open, or none: the newest card's replaces an earlier one Maps has not taken. */
export function handToMaps(query: string | undefined): void {
  pending = query;
  for (const wake of listeners) wake();
}

/** The search left for Maps, taken once: a second read finds nothing. */
export function takeHandedQuery(): string | undefined {
  const query = pending;
  pending = undefined;
  for (const wake of listeners) wake();
  return query;
}

/** The search left for Maps, without taking it. */
export function handedQuery(): string | undefined {
  return pending;
}

/** Wake `wake` whenever a search is left or taken; the returned function stops it. */
export function watchHandoff(wake: () => void): () => void {
  listeners.add(wake);
  return () => { listeners.delete(wake); };
}
