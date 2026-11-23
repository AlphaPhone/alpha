# test/calendar-deletions.test.mjs
- Lines: 44 | Kind: unit (esbuild bundle of real `browser/calendar-deletions.ts`, `performance.now` mocked) | Verdict: MERGE into `test/integration/calendar.test.ts` (2 cases)
- Covers: the browser Calendar's Undo-able deletion queue: row stays during Undo, settles exactly at expiry once, owner refusal pauses, provider revision drift conflicts, pending occurrence blocks series deletion, Undo is idempotent. Importers of the module: `browser/calendar-store.ts`, `browser/calendar.ts`, `browser/deletion-recovery.ts`, `browser/deleted-note-origins.ts`. Duplicates: `test/browser/calendar-delete-completion.spec.ts` (UI Undo). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | D7 | Bundled with `define:{'import.meta.env':'{}'}` so Node can load renderer code. | Use the shared integration loader (`browser-source.mjs`) instead of a per-file esbuild call. | None |
| 2 | 15-20 | A1 | `deadline.continuity='previous-renderer'` case: a deletion recorded by an earlier renderer run. That is reload continuity, not legacy data; keep. | Keep. | None |
| 3 | 8-14, 37-44 | T4 | Expiry/Undo idempotence overlaps the UI spec's Undo path. | Keep "settles exactly once at expiry" and "Undo twice returns same receipt" only. | Low |
| 4 | 21-36 | - | Revision drift and series/occurrence blocking are data-loss guards the UI spec does not reach. | Keep. | None |

## Proposed end state
Three compact cases in the calendar integration file (expiry/Undo once, owner refusal and revision drift, occurrence
vs series). File and its private esbuild call removed.
