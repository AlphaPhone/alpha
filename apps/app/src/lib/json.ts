/** `JSON.stringify` with the keys of every plain object sorted; drops `undefined` members and honours `toJSON`. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

/** True when both values have the same `JSON.stringify` text (key order matters). */
export const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
