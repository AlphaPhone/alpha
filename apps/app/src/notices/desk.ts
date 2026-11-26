// spec/app/notices/index.md, "Story: Open what I tapped"

interface DeskStore<T> {
  /** @throws {never} */
  snapshot(): T;
  /** @throws {never} */
  subscribe(listener: () => void): () => void;
  /** @throws {never} */
  emit(): void;
}

/** Subscribable snapshot shelf shared by the notices desk services. @throws {never} */
export function createDeskStore<T>(build: () => T): DeskStore<T> {
  const listeners = new Set<() => void>();
  let current = build();
  return {
    snapshot: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      current = build();
      for (const listener of [...listeners]) listener();
    },
  };
}
