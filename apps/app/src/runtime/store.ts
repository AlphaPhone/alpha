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
