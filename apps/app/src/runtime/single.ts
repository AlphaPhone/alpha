/**
 * Whether this page is the one page over this origin's store, from now until it closes. Two pages over one store
 * would each take up the other's attempts as its own and write over the other's kept states, so the second is told
 * no, and builds no machine.
 */
export function single(): Promise<boolean> {
  if (!("locks" in navigator)) return Promise.resolve(true);
  return new Promise((told) => {
    void navigator.locks.request("alpha.page", { ifAvailable: true }, (lock) => {
      told(lock !== null);
      return lock === null ? undefined : new Promise<never>(() => {});
    });
  });
}
