# scripts/test-notes-action-flow.ts
- Lines: 29 | Kind: integration (real `NotesStore` on a file-backed storage + real `DeviceActions` with a controlled proposal HTTP boundary and file journal) | Verdict: MERGE into `test/integration/notes-agent-actions.test.ts` (with `test-notes-query-flow.ts`)
- Covers: agent read/update/delete of the selected note: stale revision cannot execute, review card copy ("Share selected note", "Update note", "Move selected note to Trash"), journal written before mutation, receipt-only recovery after a lost response never re-executes. Duplicates: browser `notes-trash*.spec.ts` cover Trash UI, not the DeviceActions journal. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 14 | A1 | Seeds data under `LEGACY_NOTES_KEY` ('alphaphone:prototype:notes:v1'), which D1 removes. | Seed `NOTES_KEY` through `new NotesStore(storage,[records])`. | Low |
| 2 | 17-22 | C3 | Proposal/request/journal fakes are the same as `test-notes-query-flow.ts:36-40`. | One `deviceActionHarness()` in the merged file. | None |
| 3 | 18, 20 | C1 | `body:any`, `input:any`. | Use `DeviceActions` constructor parameter types. | None |

Cases worth carrying: all three operations' stale refusal + approve once + receipt replay without second effect; review description never contains the note id.

## Proposed end state
One merged ~70-line integration file with a shared harness; script and shim entry deleted.
