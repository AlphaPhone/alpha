# test/fixtures/WorkflowNoticeRecoveryTest.java
- Lines: 23 | Kind: host-JVM integration of upstream `NoticeRecovery.recover` with Alpha's `WorkflowNoticeDelivery::receipt` (T5) | Verdict: DELETE
- Covers: a resident action journal entry left at `applying` for a `post_notification` operation recovers to `succeeded` from the notice receipt without reposting. Any change to the owner, session, enrollment, digest or body is refused, an invalid phase is refused, and terminal entries stay.
- Duplicates: upstream `plugin-native-notifications/test/native-host/NoticeHostTest.java` (6 `NoticeRecovery` references) and Alpha's `ResidentWorkflowCrashInstrumentedTest.java` / `WorkflowNoticeProcessDeathInstrumentedTest.java` on the emulator.
- Callers/importers: only `test/workflow-notice-delivery.test.mjs:12,14`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-21 | T5 | Tests the upstream recovery function. Alpha contributes only the receipt lookup. | Delete. | Low |
| 2 | 6 | C3 | Local SHA-256 hex helper (one of the ~10 Java copies). | Goes with the deletion. | None |

## Proposed end state
Delete the file. Recovery of interrupted notice actions is covered upstream and on the emulator.
