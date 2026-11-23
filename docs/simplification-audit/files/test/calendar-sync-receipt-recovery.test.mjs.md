# test/calendar-sync-receipt-recovery.test.mjs
- Lines: 21 | Kind: test 1 host-JVM unit (real `CalendarSyncReceiptRecovery.java` + `test/fixtures/CalendarSyncReceiptRecoveryTest.java`); tests 2-3 source-text (index order and regexes over `CalendarSyncBridge.java`) | Verdict: KEEP test 1 (Gradle JVM); DELETE tests 2-3
- Covers: interrupted native Calendar write receipts recover only from the exact observed owner/event/postcondition; a full receipt journal (128) refuses a new write before recording or dispatch; pruning keeps the owner fence. Duplicates: none. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-4 | - | Real recovery logic against a fixture main. | Move to Gradle. | None |
| 2 | 5-12 | T1 | Capacity-before-record-before-dispatch checked by `indexOf` of literal statements. | Delete; if the owner wants it, extract the "admit new operation" step from the bridge into `CalendarSyncReceiptRecovery` and test "129th unconfirmed write refused, nothing recorded". | Medium |
| 3 | 14-21 | T1 | Three regexes on the prune call's argument text. | Delete; prune semantics are in `CalendarSyncReceiptRecovery.prune`, cover them in the JVM test. | Low |

## Proposed end state
The JVM recovery test runs under Gradle and gains a case for prune keeping other owners' receipts. Source-order checks
are gone; a capacity case is added once the admission step is a callable method.
