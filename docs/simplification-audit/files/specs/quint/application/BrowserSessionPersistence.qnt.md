# specs/quint/application/BrowserSessionPersistence.qnt
- Lines: 136 | Kind: Quint model (live, 7 runs, invariants + 4 witnesses, symbol pins) | Verdict: KEEP model; PORT harness
- Covers: the browser adapter's saved-tabs writer: nothing written before the launch read succeeds or while clearing, one write in flight with one queued, change detection, back-off after a rejected write, failed Clear retries the unchanged snapshot. Duplicates: `BrowserSession` (unread record, clear; merge target, see that report), `test/browser-session-persistence.test.mjs` (host test of `createSessionSaver`, which D20 deletes). Callers/importers: manifest (sources `browser/browser-poll.ts`, `prototype/browser-adapter.ts`; sharedSources `BrowserSessionStore.java`); harness `browser-session-persistence.mjs` (85 lines); only `test/quint-browser-session-persistence.test.mjs` runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness:25-47 | T10 | Slices `browser-adapter.ts` between `'  function forgetTabs(ids'` and `'  async function clearSiteData() {'`, strips types and runs the region in `vm.runInNewContext` to get `restoreSession`, `saveSession`, `clearBrowsingData`. | Extract the adapter's session persistence (`restoreSession`, `saveSession`, `clearBrowsingData`, `forgetTabs` and their closure state: `sessionHydrated`, `clearingData`, `lastSaved`, `failedSnapshot`, `retryAt`, `retryDelay`, `saveEpoch`) into an exported factory, e.g. `createBrowserSessionStore({Browser, tabs, session, now})` in `apps/app/src/browser/` or `prototype/browser-session.ts`, used by `browser-adapter.ts`; the harness imports it. One factory also serves `BrowserTabLifecycle` and `BrowserSurfacePresentation`. | Medium (product extraction) |
| 2 | 24, 43-46 | — | The model's back-off is the adapter's inline `retryDelay = min(60000, retryDelay*2)` (`browser-adapter.ts:339-342`), not `createSessionSaver`. | D20 deletion of `createSessionSaver` does **not** retire this model. Fix the stale text: `specs/quint/application/README.md:66` and manifest abstraction (manifest.json:5168) name `createSessionSaver`/`saveRetryDelay`. | Low |
| 3 | 107-111 | A8 | Comment "Regression for the older helper's passed-over-write hole" narrates history. | Reword to state the property. | None |
| 4 | manifest | T10 | Symbol pins on adapter closure names (`sessionHydrated`, `clearingData`, `savedSnapshot`, …). | Replace with the new module's exported names after the port. | Low |

## Proposed end state
Model unchanged apart from comments. Harness imports the extracted session-store factory (no slicing, no `stripTypeScriptTypes`, no `vm`). Manifest/README text names the real functions.
