# specs/quint/refinement/application/browser-note-recording-journal.mjs
- Lines: 238 | Kind: Quint refinement harness (direct `import` of `apps/app/src/browser/note-recording-journal.ts`) | Verdict: KEEP (shrink after D1)
- Covers: browser pending note-recording journal: clips published before manifest, failed clip retry, text preserved across held publication, binding/owner checks, retirement fencing, against `BrowserNoteRecordingJournal.qnt`. Duplicates: run by `test/quint-browser-note-recording-journal.test.mjs` and aggregate `index.mjs:48,129` (T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | — | Real module imported directly; port is a closed in-memory document map. Target shape. | Keep. | — |
| 2 | 35, 145-156, 231-232 | A1 | The `offset` dimension and schedule "legacy offset segments recover text without standalone clip rows" exist only for `browser/voice.ts:52-58` ("Older pending rows contain no completion markers…"), listed as a legacy reader in delete-candidates B171 (D1). | When that reader is deleted: drop `offsetMs` from `PendingNoteSegment` and the journal branches (`note-recording-journal.ts:11,21,32,42,62`), the `offset` field from the model, `fixture(count, offset)` and the last schedule. | M |
| 3 | 14-20 | C3 | Local `call`, `tick`, `deferred` duplicate `support.mjs`. | Import shared helpers. | L |
| 4 | 191-192 | B5 | Hashes model, source and driver before/after. | Follow receipt decision. | L |

## Proposed end state
15 schedules without the offset case, model without `offset`, shared helpers, single run lane.
