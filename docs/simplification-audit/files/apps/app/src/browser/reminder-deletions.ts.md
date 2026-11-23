# apps/app/src/browser/reminder-deletions.ts
- Lines: 43 | Role: pure stage/settle/undo/guard logic for queued reminder deletions | Verdict: SIMPLIFY (generalise with calendar-deletions.ts)
- Importers: 4 (daily.ts, deleted-note-origins.ts, deletion-recovery.ts, reminder-store.ts). Text/path pins: specs/quint/application/manifest.json; refinement browser-deletion-poll.mjs; test/reminder-deletions.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-43 | C5 | Same algorithm as calendar-deletions.ts:20-55 (stage, settle, undo, guard) differing only in row equality and source revision field. | Generic `deletionJournal<Row>({rows,equals,sourceRevision})` in journal-retention.ts; both files become instantiations. | Medium; Quint browser-deletion-poll + test/reminder-deletions.test.mjs. |
| 2 | 6 | C1 | `journalBinding?:{scope:string;proposalId:string;operationHash:string}` (4 copies). | `JournalBinding` from journal-retention.ts. | None. |
| 3 | 20-21, 30-31 | C3 | "row without pendingDeletion equals snapshot" check written twice. | Local `matchesTarget(data,entry,id)`. | None. |
| 4 | 2 | D13 | Deep relative contracts import. | Alias. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| DeletableReminder/ReminderDeletion/ReminderDeletionState | type | 5-7 | calendar-deletions.ts equivalents | stay |
| journalBinding | type | 6 | calendar-deletions.ts:6, daily.ts:38, deletions.ts:22 | journal-retention.ts |

## Proposed end state
~20 lines instantiating the generic journal with reminder equality. Estimated lines after: 20 (current 43).

## Verification
test/reminder-deletions.test.mjs, browser-deletion-poll Quint harness, durable-delete-undo.spec.ts, reminder-delete-review.spec.ts.
