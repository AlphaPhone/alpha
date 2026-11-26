/**
 * The browser's IndexedDB, which happy-dom does not draw: databases of out-of-line keyed object stores, kept in memory
 * for one journey. It answers as a WebView does, a turn later, and holds a structured clone of each value; it offers
 * only what Alpha's stores open, put, get and delete.
 */
type Listener = (() => void) | null;

class Request<T> {
  result = undefined as T;
  error: DOMException | null = null;
  onsuccess: Listener = null;
  onerror: Listener = null;
  onupgradeneeded: Listener = null;
}

const later = (work: () => void) => { void Promise.resolve().then(work); };

export function memoryIndexedDB() {
  const databases = new Map<string, Map<string, Map<IDBValidKey, unknown>>>();
  const database = (stores: Map<string, Map<IDBValidKey, unknown>>) => ({
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => { stores.set(name, new Map()); },
    close: () => {},
    transaction(names: string | string[], mode: IDBTransactionMode = "readonly") {
      const transaction = { oncomplete: null as Listener, onabort: null as Listener, error: null as DOMException | null, objectStore };
      function objectStore(name: string) {
        const store = stores.get(name);
        if (store === undefined || !(typeof names === "string" ? [names] : names).includes(name)) throw new DOMException(name, "NotFoundError");
        const answer = <T>(work: () => T) => {
          const request = new Request<T>();
          later(() => { request.result = work(); request.onsuccess?.(); });
          return request;
        };
        const writing = () => { if (mode !== "readwrite") throw new DOMException("readonly", "ReadOnlyError"); };
        return {
          get: (key: IDBValidKey) => answer(() => structuredClone(store.get(key))),
          put: (value: unknown, key: IDBValidKey) => { writing(); const kept = structuredClone(value); return answer(() => { store.set(key, kept); return key; }); },
          delete: (key: IDBValidKey) => { writing(); return answer(() => { store.delete(key); }); },
        };
      }
      later(() => later(() => transaction.oncomplete?.()));
      return transaction;
    },
  });
  return {
    open(name: string) {
      const request = new Request<ReturnType<typeof database>>();
      later(() => {
        const known = databases.get(name);
        const stores = known ?? new Map<string, Map<IDBValidKey, unknown>>();
        databases.set(name, stores);
        request.result = database(stores);
        if (known === undefined) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}
