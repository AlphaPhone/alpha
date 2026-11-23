# specs/quint/refinement/application/bookmarks-hydration.mjs
- Lines: 78 | Kind: Quint refinement harness (transplant: sliced adapter region evaluated in `vm`) | Verdict: KEEP model, PORT harness
- Covers: Browser bookmark queue — save waits for the first read, refresh coalescing, damaged web bookmark document offers recovery, disposed reads change nothing, native read failure reported — against `BookmarksHydration.qnt` (114 lines, live). Duplicates: Playwright browser bookmark specs cover the happy path; none cover damaged/disposed ordering. Callers/importers: `test/quint-bookmarks-hydration.test.mjs` only (not in `index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-31 | T2/T10 | Slices `prototype/browser-adapter.ts` from `'  let bookmarkRead:'` to `'  const state = () =>'`, string-replaces the literal `"await import('../browser/preference-documents')"` (must occur exactly once) with a port, strips types and runs it in `vm` with stubs for `session`, `disposed`, `Capacitor`, `CapacitorException`, `ExceptionCode`, `Browser`, `state`, `refresh`, `report`, `shell`; reads closure variables `bookmarkRefreshQueued`, `bookmarkHydrated`, `bookmarkRecovery` by name. | Extract `prototype/browser-bookmarks.ts` exporting `createBookmarkQueue(deps)` returning `{refresh, save, load, snapshot()}`; `browser-adapter.ts` uses it. Import with `bundledSource`; `snapshot()` replaces reading closure variables. | Med |
| 2 | 36 | D8 | Mis-indented class declaration. | Fix during port. | None |
| 3 | 73-78 | (keep) | Model-walk replay through shared `browser-model-traces.mjs` (scenarios + witnesses + random). | Keep. | – |

## Proposed end state
~60 lines driving an imported bookmark-queue module through the shared trace replayer; same scenarios/witnesses.
Wired into the single manifest-driven runner. Product prerequisite: bookmark queue extracted from `browser-adapter.ts`.
