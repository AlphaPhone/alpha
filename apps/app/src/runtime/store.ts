/** Options for a scoped side-store shelf. */
export interface ShelfOptions<T> {
  /** Produces the fresh initial value on `reset()`. Defaults to the `initial` value passed to `createShelf`. */
  readonly reset?: () => T;
}

/**
 * A scoped reactive side-store designed to live inside an Effect `Layer` (`Layer.sync`, `Layer.effect`, or
 * `scopedShelf`) rather than at module top level. Exposes `snapshot` and `subscribe` for React's
 * `useSyncExternalStore`, plus `get`, `set`, `update`, and `reset`.
 */
export interface Shelf<T> {
  /** @throws {never} */
  readonly snapshot: () => T;
  /** @throws {never} */
  readonly subscribe: (listener: () => void) => () => void;
  /** @throws {never} */
  readonly get: () => T;
  /** @throws {never} */
  readonly set: (next: T) => void;
  /** @throws {never} */
  readonly update: (fn: (current: T) => T) => T;
  /** @throws {never} */
  readonly reset: () => T;
}

/** Options for a bounded LRU cache. */
export interface BoundedCacheOptions<K, V> {
  /** Called whenever an entry is evicted due to capacity or cleared via `clear()`. */
  readonly onEvict?: (key: K, value: V) => void;
}

/** A scoped bounded LRU cache for runtime handles, previews, and transient records. */
export interface BoundedCache<K, V> {
  /** @throws {never} */
  readonly get: (key: K) => V | undefined;
  /** @throws {never} */
  readonly set: (key: K, value: V) => void;
  /** @throws {never} */
  readonly has: (key: K) => boolean;
  /** @throws {never} */
  readonly delete: (key: K) => boolean;
  /** @throws {never} */
  readonly clear: () => void;
  /** @throws {never} */
  readonly entries: () => ReadonlyArray<readonly [K, V]>;
  /** @throws {never} */
  readonly size: () => number;
}

/** A value a screen reads as an external store, without an effect: `snapshot` and `subscribe` as React's `useSyncExternalStore` takes them, and `set`, which tells each reader. @throws {never} */
export function externalStore<T>(initial: T) {
  let current = initial;
  const listeners = new Set<() => void>();
  /** @throws {never} */
  const snapshot = (): T => current;
  /** @throws {never} */
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  /** @throws {never} */
  const set = (next: T): void => {
    current = next;
    for (const listener of [...listeners]) listener();
  };
  return { snapshot, subscribe, set };
}

/** Creates a scoped reactive side-store shelf backed by `externalStore`. @throws {never} */
export function createShelf<T>(initial: T, options?: ShelfOptions<T>): Shelf<T> {
  const store = externalStore(initial);
  /** @throws {never} */
  const set = (next: T): void => {
    if (Object.is(store.snapshot(), next)) return;
    store.set(next);
  };
  /** @throws {never} */
  const update = (fn: (current: T) => T): T => {
    const next = fn(store.snapshot());
    set(next);
    return next;
  };
  /** @throws {never} */
  const reset = (): T => {
    const next = options?.reset ? options.reset() : initial;
    set(next);
    return next;
  };
  return {
    snapshot: store.snapshot,
    subscribe: store.subscribe,
    get: store.snapshot,
    set,
    update,
    reset,
  };
}

/** Creates a scoped bounded LRU cache holding at most `capacity` entries (clamped to >= 1). @throws {never} */
export function createBoundedCache<K, V>(capacity: number, options?: BoundedCacheOptions<K, V>): BoundedCache<K, V> {
  const limit = Math.max(1, Math.floor(capacity));
  const items = new Map<K, V>();
  /** @throws {never} */
  const get = (key: K): V | undefined => {
    if (!items.has(key)) return undefined;
    const value = items.get(key) as V;
    items.delete(key);
    items.set(key, value);
    return value;
  };
  /** @throws {never} */
  const set = (key: K, value: V): void => {
    if (items.has(key)) items.delete(key);
    items.set(key, value);
    while (items.size > limit) {
      const oldest = items.entries().next();
      if (oldest.done) break;
      const [evictedKey, evictedValue] = oldest.value;
      items.delete(evictedKey);
      options?.onEvict?.(evictedKey, evictedValue);
    }
  };
  /** @throws {never} */
  const has = (key: K): boolean => items.has(key);
  /** @throws {never} */
  const del = (key: K): boolean => items.delete(key);
  /** @throws {never} */
  const clear = (): void => {
    const prior = [...items.entries()];
    items.clear();
    for (const [key, value] of prior) options?.onEvict?.(key, value);
  };
  /** @throws {never} */
  const entries = (): ReadonlyArray<readonly [K, V]> => [...items.entries()];
  /** @throws {never} */
  const size = (): number => items.size;
  return { get, set, has, delete: del, clear, entries, size };
}
