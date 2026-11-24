# specs/quint/refinement/native/CalendarSyncEnableTraces.java
- Lines: 145 | Kind: Quint refinement driver (host-JVM; real `CalendarSyncBridge`, `CalendarSyncSnapshot`, `CalendarSyncMutation`, `CalendarSyncReceiptRecovery`, `CalendarSyncConsent`, `AlphaCalendarPlugin` with closed provider/credential ports) | Verdict: KEEP (D18: the Android half of Calendar sync stays)
- Covers: native Calendar sync enable consent: prepare/review lease, consent dialog, enable held before/after the CAS journal read, pause racing enable, pause retries and exhaustion, fresh enable after pause, and that the Cloud-write and deletion gates follow the committed state. Duplicates: host javac tests `test/calendar-sync-mutation.test.mjs` / `test/fixtures/CalendarSyncMutationTest.java` cover mutation, not consent. Callers: `native/calendar-sync-enable.mjs:10-48`; test `test/quint-native-calendar-sync-enable*.test.mjs` via the native family.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29 | dependency | Uses `CalendarSyncSnapshotTest.Provider` from `test/fixtures/CalendarSyncSnapshotTest.java`, a host-javac unit-test class. If the host unit tests are deleted (D10), this harness breaks. | Move `Provider` into the native platform fixture (`calendar-sync-enable-platform.mjs` or a `CalendarProviderPort.java` beside this file) before deleting `CalendarSyncSnapshotTest`. | Medium (ordering) |
| 2 | — | owner question | D18 keeps the native bridge pending Q-CAL-1; if the owner later retires Android Calendar sync, this driver, its model `NativeCalendarSyncEnable` and platform file go together. | None now. | — |
| 3 | 30, 43-45 | — | Provider asserts no mutation during consent: good negative check on real code. | Keep. | — |

## Proposed end state
Unchanged scenarios; the content-provider fake lives with the refinement fixtures instead of a unit-test class.
