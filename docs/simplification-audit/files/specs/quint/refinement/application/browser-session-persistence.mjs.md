# specs/quint/refinement/application/browser-session-persistence.mjs
- Lines: 85 | Kind: Quint ITF replay driver, **source transplant** (slices `apps/app/src/prototype/browser-adapter.ts`, strips types, runs in `vm` with 30 hand-built context bindings) | Verdict: PORT
- Covers: saved-tabs writer of the Browser adapter: hydration gate, change detection, one write in flight + one queued, rejected-write backoff, clear fencing, against `BrowserSessionPersistence.qnt`. Duplicates: none for the native-write queue. Callers/importers: `test/quint-browser-session-persistence.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-27, 47 | T2 / T10 | Product text anchors: `'  function forgetTabs(ids'` → `'  async function clearSiteData() {'` in `browser-adapter.ts` (both present today, lines 308 and 404). The region expects ~25 free variables (`saveQueue`, `saveEpoch`, `failedSnapshot`, `retryAt`, `retryDelay`, `sessionRead`, `sessionHydrated`, `clearingData`, `snapshotRevision`, `lastGeometry`, `tabInfo`, `newTabId`, `shell.vset` …) supplied by the context at lines 33-46. Any rename, split or Prettier run breaks it. | Extract the saved-tabs writer from the adapter closure into `apps/app/src/browser/browser-session-store.ts` exporting `createBrowserSessionStore({Browser, tabs, state, shell, reviews, report, now, newTabId})` → `{restoreSession, saveSession, clearBrowsingData, forgetTabs, snapshot(): {sessionRead, sessionHydrated, clearingData, retryAt}}`. The adapter calls it; the driver imports it through `loadBundled`. Shared with `browser-tab-lifecycle.mjs`. | M |
| 2 | — | A8 / doc drift | `specs/quint/application/manifest.json:5168` and `specs/quint/application/README.md:66` say this model covers `createSessionSaver`/`saveRetryDelay`; the driver does not use them (the adapter has its own writer). D20 deletes `createSessionSaver`. | Fix both texts when D20 lands; the model stays (it models the adapter's live writer). | L |
| 3 | 13 | — | Uses `test/support/strip-types.mjs`; after the port this import goes. | — | L |

## Proposed end state
Driver of ~50 lines: `const {createBrowserSessionStore} = await load()`; controlled `Browser` port and clock; same observation projection. No anchors, no `vm`.
