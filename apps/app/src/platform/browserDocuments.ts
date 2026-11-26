const database = "alpha.browser.documents.v1";
const records = "documents";

function failureOf(cause: unknown, fallback: string): Error {
  return cause instanceof Error ? cause : new Error(fallback, cause === undefined || cause === null ? undefined : { cause })
}

function connection(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1)
    let blocked = false
    request.onupgradeneeded = () => {
      if (blocked) request.transaction?.abort()
      else request.result.createObjectStore(records)
    }
    request.onblocked = () => {
      blocked = true
      reject(new Error("Close older tabs before opening browser storage"))
    }
    request.onerror = () => reject(failureOf(request.error, "Could not open browser storage"))
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

export async function browserDocumentTransaction<A>(mode: IDBTransactionMode, keys: readonly [string, ...string[]], change: (store: IDBObjectStore, rows: readonly unknown[]) => A): Promise<A> {
  const opened = await connection()
  try {
    return await new Promise((resolve, reject) => {
      const work = opened.transaction(records, mode)
      const store = work.objectStore(records)
      const reads = keys.map((key) => store.get(key))
      let waiting = reads.length
      let result: { value: A } | undefined
      let failed: unknown
      for (const read of reads) read.onsuccess = () => {
        waiting -= 1
        if (waiting > 0) return
        try { result = { value: change(store, reads.map((one): unknown => one.result)) } }
        catch (cause) {
          failed = cause
          work.abort()
        }
      }
      work.onabort = () => reject(failureOf(failed ?? work.error, "Browser storage transaction aborted"))
      work.oncomplete = () => result === undefined ? reject(new Error("Browser storage returned no record")) : resolve(result.value)
    })
  } finally { opened.close() }
}
