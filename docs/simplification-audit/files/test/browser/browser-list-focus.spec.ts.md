# test/browser/browser-list-focus.spec.ts
- Lines: 101 | Kind: Playwright spec, chromium, 2 tests; UI plus React-fiber state reads and a Quint refinement check run inside the test | Verdict: MERGE into `journeys/browser.spec.ts` (UI assertions); move/drop the Quint trace
- Covers: closing an earlier tab keeps keyboard focus and activation on the same tab; removing an earlier bookmark keeps focus on the same link and Enter opens it. Duplicates: `maps-list-focus`, `notes-photos-list-focus` (same keyed-list-focus pattern, other chunks). Callers/importers: none; imports `specs/quint/refinement/check-traces.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 69-75 | P15/T10 | Imports `captureInputs/checkTraces/qset` into the Playwright runner; hashes 8 source files (including itself) and runs Quint against model `BrowserSession` in a UI test. `scripts/check-quint.ts` does not run this receipt. | Remove from the e2e spec. If the BrowserSession focus trace is wanted in the formal lane, generate it from `specs/quint/refinement/application/browser-tab-lifecycle.mjs`. | Medium: owner wants Quint at 100 %; this trace is not part of the counted suite. |
| 2 | 10-22 | T6 | `browserState` walks `__reactFiber$` to `vget('browser')`. | Assert visible tab chooser rows and `toBeFocused()`. | Low. |
| 3 | 60, 95 | ok | `click()` via `evaluate` to keep focus where it is: documented, deliberate. | Keep. | None. |
| 4 | 82-86 | P2 | Bookmarks seeded through `registerPlugin('AlphaBrowser').setBookmark`. | Seed via the browser plugin stub or the bookmark UI. | Low. |
| 5 | 25 | P11 | 120 s timeout. | Default. | None. |

## Proposed end state
Two steps in `journeys/browser.spec.ts` (tab close keeps focus; bookmark remove keeps focus), pure UI. The Quint trace leaves the browser lane.
