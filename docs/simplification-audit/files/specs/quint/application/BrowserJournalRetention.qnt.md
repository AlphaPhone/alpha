# specs/quint/application/BrowserJournalRetention.qnt
- Lines: 142 | Kind: Quint model (live, 7 runs, explicit `invariants`/`bounds`) | Verdict: KEEP (shrink with A1 decision)
- Covers: retention of the browser Calendar/Reminder operation journals at the production cutoffs (200 definite receipts, 30 days, 127 settled deletions; unacknowledged creations and unresolved deletions never trimmed; replay claims dropped with their deletion). Duplicates: LemmaScript contracts on `journalRowRetires`, `deletionSettled`, `settledDeletionsToTrim` in `apps/app/src/browser/journal-retention.ts:21-48` prove the same per-row predicates; the model adds the list-level cohort and claim behaviour. Callers/importers: manifest; harness `browser-journal-retention.mjs` (278 lines, + `.md`) imports the real module via `services/support.mjs` `sourceModule` and `test/fixtures/browser-daily-stores.mjs`; `test/quint-browser-journal-retention-refinement.test.mjs` **and** aggregate (index.mjs:77).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 36, 48, 95, 104, 118-119 | A1 | The `dated: false` receipt (`legacyReceipts`, `receiptsAtCountKeepStableLegacyOrderTest`) models rows "without a time [that] predate this policy" (`journal-retention.ts:12-13, 29`). Per D1 no such data can exist; the product report for `journal-retention.ts` already proposes removing the `at === undefined` branch pending owner sign-off. | When the product branch goes: drop `dated` from `Receipt`, the `-1/0` undated stamps, `legacyReceipts`, the undated init and rename the first run; update harness traces and the Lemma `ensures` at `journal-retention.ts:23-24`. | Low (Lemma + model + harness change together) |
| 2 | 32 | — | `receipts.length() <= 205`, `deletions.length() <= 136` guards are bounds for the simulator, not behaviour. | None | — |
| 3 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
Same module without the undated-receipt dimension once D1 removes the product branch (~125 lines). Harness keeps importing the real retention functions and stores. One test entry point.
