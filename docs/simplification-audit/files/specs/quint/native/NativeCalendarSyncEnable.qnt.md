# specs/quint/native/NativeCalendarSyncEnable.qnt
- Lines: 103 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP pending Q-CAL-1 (DELETE with the Android `CalendarSyncBridge` stack if the owner confirms)
- Covers: native Calendar sync consent: explicit enable under a lease epoch, CAS-retried pause that fences an in-flight enable, both cloud-write and deletion gates read the committed consent. Duplicates: renderer-side linked sync models (`services/CalendarSync`, `CalendarLinkedSync`) cover the stack D4 deletes; this one covers the Android half kept by D18. Callers/importers: `native/manifest.json` (9 tests, 5 invariants, 3 upstream `sharedSources`), harness `refinement/native/calendar-sync-enable.mjs` + `calendar-sync-enable-platform.mjs`; `test/quint-native-calendar-sync-enable.test.mjs`; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | A2 (owner) | Sources are the Android sync files `CalendarSyncBridge/Consent/Snapshot/Mutation/ReceiptRecovery.java` that `cross-file-actions.md` Q-CAL-1 asks the owner to confirm or delete. | If Q-CAL-1 = delete, delete this model, its harness pair, `CalendarSyncEnableTraces*`, the test wrapper and the manifest entry in the same change; lower `test/quint-checker.test.mjs` floors. | M |
| 2 | harness | - | Product files compile whole. `calendar-sync-enable-platform.mjs:31-36,205-208` `.replace`s anchors in **stub** sources (CalendarContract/ContentValues/Uri/ContentResolver fixtures), not product code. | None (fixture text). | L |
| 3 | 4-6 | - | `cloudWriteAllowed`/`deletionAllowed` are always equal (`BothGatesUseCommittedConsent`). Intentional: two gates read one consent. | None. | - |
| 4 | test wrapper | T4, B5 | Run twice; wrapper pins `traces 9`, `checkpoints 80`, `observedFields 18`. | One runner; `> 0`. | L |

## Proposed end state
Kept while D18 keeps the Android sync bridge; removed as one unit with that bridge if the owner answers Q-CAL-1 "delete".
