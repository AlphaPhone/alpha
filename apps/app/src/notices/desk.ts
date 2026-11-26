// spec/app/notices/index.md, "Story: Open what I tapped"

/** Subscribable snapshot shelf shared by the notices desk services. */
export function createDeskStore<T>(build: () => T): {
  readonly snapshot: () => T;
  readonly subscribe: (listener: () => void) => () => void;
  readonly emit: () => void;
} {
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
