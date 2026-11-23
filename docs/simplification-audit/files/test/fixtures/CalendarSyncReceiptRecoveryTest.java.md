# test/fixtures/CalendarSyncReceiptRecoveryTest.java
- Lines: 45 | Kind: Java fixture, single-class unit (`CalendarSyncReceiptRecovery.observe` and `prune`) | Verdict: MERGE into the Gradle JVM calendar suite
- Covers: a dispatching write is recovered as saved only when the observed event matches its owner, event and body hash; pruning keeps queued deletions, unknown outcomes and in-flight rows, bounds terminal history and never crosses owner scopes. Duplicates: none. Callers/importers: `test/calendar-sync-receipt-recovery.test.mjs:3`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | Pure JSON-in/JSON-out, but the retention/recovery rules decide whether an unconfirmed write is reported as saved or a queued deletion is lost: risky and unreachable from a journey. | Fold into the calendar suite. | Medium if deleted |
| 2 | 23-24 | T1 (mild) | Exact retention counts (63, 122) pin the prune constants. | Keep, but derive from the class constant if one exists. | Low |

## Proposed end state
`receiptRecoveryIsOwnerScoped` and `pruneKeepsUncertainRows` methods in the Gradle `CalendarSyncTest`. Importer deleted.
