# specs/quint/refinement/application/browser-tab-lifecycle.mjs
- Lines: 133 | Kind: Quint ITF replay driver, **source transplant** (three slices of `prototype/browser-adapter.ts` in `vm`; upstream tab session imported for real) | Verdict: PORT
- Covers: tab creation, tab limit (3), restored-tab retry then report, typing keeps tab, close during create, native `tabOpened`/`tabClosed`, against `BrowserTabLifecycle.qnt` (60 random walks × 40 steps). Duplicates: Playwright browser tab specs cover the UI but not the restore-retry counter. Callers/importers: `test/quint-browser-tab-lifecycle.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-40, 47-61 | T2 / T10 | Anchors: `'  function ensure('`→`'  async function command('`, `'  function forgetTabs(ids'`→`'  async function confirmBrowser('`, `"  void Browser.addListener('tabOpened',"`→`"  void Browser.addListener('notice',"` (all present). ~35 context bindings supplied by hand. | Same extraction as `browser-session-persistence.mjs`: a `browser-session-store.ts` (tabs + saved session + native tab listeners) with injected `Browser`, `tabs`, `state`, `shell`, `newTabId`; the adapter's render closure keeps only UI. | M |
| 2 | 36, 47 | A7 / D20 | Loads `createSessionSaver` from `browser/browser-poll.ts` and injects it, but the sliced adapter region does not use it (`git grep createSessionSaver apps` = definition only). D20 deletes it. | Drop the import now; otherwise the harness breaks when D20 lands. | L |
| 3 | 35 | T10 | `stripTypeScriptTypes` + data-URL import of `browser-poll.ts`. | Shared loader. | L |
| 4 | 76-79, 99-105 | — | `openTab` and `closeTab` re-implement the render-closure actions in the driver (documented). A port that exports those actions removes the reimplementation. | Export `openTab`/`closeTab` from the extracted store. | L |

## Proposed end state
Driver imports the extracted store and the upstream tab session; no `vm`, no `createSessionSaver`; same projection and traces.
