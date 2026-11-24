# apps/app/src/browser/journal-retention.ts
- Lines: 72 | Role: pure retention rules for browser Calendar/Reminder operation journals (LemmaScript-verified) | Verdict: SIMPLIFY
- Importers: 4 (calendar-deletions.ts, calendar.ts, daily.ts, reminder-deletions.ts). Text/path pins: LemmaScript-files.txt; specs/quint/application/manifest.json; refinement browser-deletion-poll.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-13, 29 | A1 | "Rows without a time predate this policy; they count as oldest" — `at===undefined` branch exists for pre-policy rows. | Only if owner confirms no pre-policy data: make `at` required and drop the undefined branch + its Lemma ensures (lines 24, 29). | Needs owner sign-off; LemmaScript proof changes. |
| 2 | 49 | C1 | `type Deletion` local; `journalBinding` shape repeated in reminder-deletions.ts:6, calendar-deletions.ts:6, daily.ts:38, deletions.ts:22. | Export `JournalBinding` and `Deletion` from here. | None. |
| 3 | 1 | D13 | Deep relative import of contracts/deletion-window although alias `@elizaos/contracts/deletion-window` exists. | Use alias. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Deletion | type | 49 | calendar-deletions.ts, reminder-deletions.ts ReminderDeletion | export here |
| JournalBinding (new) | type | - | reminder-deletions.ts:6, calendar-deletions.ts:6, daily.ts:38, deletions.ts:22 | here |

## Proposed end state
Same verified functions; exported JournalBinding/Deletion types; optional removal of the no-time legacy branch. Estimated lines after: 70 (current 72).

## Verification
LemmaScript (npm run verify), browser-deletion-poll Quint harness, test/reminder-deletions.test.mjs, durable-delete-undo.spec.ts.
