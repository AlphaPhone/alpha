# specs/quint/application/BookmarksHydration.qnt
- Lines: 114 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: Browser bookmarks queue: refreshes coalesce, a save reads first when not hydrated, a disposed adapter changes nothing, and a damaged saved list is reported once per episode with a recovery offer (web only). Models: `prototype/browser-adapter.ts` (bookmark queue), `browser/browser-surface.ts`, `browser/preference-recovery.ts`, `browser/preference-documents.ts` (exist; 13 symbol pins present). Duplicates: Playwright browser bookmark specs. Callers/importers: manifest (5 tests, 3 witnesses); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/bookmarks-hydration.mjs` via `test/quint-bookmarks-hydration.test.mjs` only (asserts `traces === 48`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 23-29 | T10 / T2 | Slices `browser-adapter.ts` from `'  let bookmarkRead:'` to `'  const state = () =>'`, rewrites the literal `await import('../browser/preference-documents')`, strips types, evals. | PORT: extract the bookmark queue into `prototype/browser-bookmarks.ts` (store port injected) and import it. | Medium. |
| 2 | wrapper | B5 | Exact trace count assertion. | Drop. | Low |
| 3 | harness | — | Damaged-list recovery is not a legacy reader (it handles corrupt current-format data); unaffected by D1. | Keep. | — |

## Proposed end state
Model unchanged; harness imports an extracted bookmark-queue module.
