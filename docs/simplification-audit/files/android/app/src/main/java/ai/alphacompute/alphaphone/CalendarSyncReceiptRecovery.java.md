# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncReceiptRecovery.java
- Lines: 34 | Role: Settles sync-journal receipts from observed provider state and prunes settled receipts at the cap. | Verdict: KEEP
- Importers: `CalendarSyncBridge`. Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`; `specs/quint/refinement/native/calendar-sync-enable.mjs`; `test/calendar-sync-receipt-recovery.test.mjs` + `test/fixtures/CalendarSyncReceiptRecoveryTest.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-33 | C6 | Caps 128/64 rows are also spelled in `CalendarSyncBridge.java:199-200` (`>=128`). | Expose `MAX_RECEIPTS=128` here and use it in the bridge. | none |
| 2 | 22, 31 | D8 | FQ `java.util.ArrayList`/`Comparator` inline. | Imports. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Settled | interface | 18 | CalendarSyncBridge lambda only | stay |

## Proposed end state
Unchanged; 34 lines. Estimated lines after: 34.

## Verification
`test/calendar-sync-receipt-recovery.test.mjs`.
