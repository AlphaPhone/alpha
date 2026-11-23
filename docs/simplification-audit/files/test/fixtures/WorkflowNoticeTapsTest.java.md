# test/fixtures/WorkflowNoticeTapsTest.java
- Lines: 81 | Kind: host-JVM integration of `WorkflowNoticeTaps` (13 lines, `extends NoticeRoutes` with Alpha's slot names) over upstream `NoticeRoutes`, with a fake store (T5) | Verdict: DELETE
- Covers: the durable notice tap queue:
  - route tokens are stable per operation and a changed route is refused;
  - a capture needs a `succeeded` receipt, and failed writes change nothing;
  - pending taps survive recreation, are consumed once and have bounded retention (512);
  - Ask purpose: capture, settle, cancel, and rotation on repost;
  - approval Ask: an owner switch fences, expiry and withdrawal release, and the receipt is untouched.
- Duplicates: upstream `plugin-native-notifications/test/native-host/NoticeTapInboxTest.java` and `NoticeHostTest.java`. On the emulator: Alpha's `WorkflowNoticeTapInstrumentedTest.java` (187 lines) and `ReminderNoticeQuestionInstrumentedTest.java` (Ask).
- Callers/importers: only `test/workflow-notice-delivery.test.mjs:12,15`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-79 | T5, T4 | All behaviour is upstream `NoticeRoutes`. The Alpha class adds only constants. | Delete. | Medium: host lane gap, as in `WorkflowApprovalNoticeTest.java.md`. |
| 2 | 23 | A8 | Comment "Old ledgers need no migration". | Goes with the deletion. | None |
| 3 | 67-77 | B5-ish | Seeds 509 rows by hand to test the 512 cap. | Goes with the deletion. | None |
| 4 | - | - | Optional MERGE case, if a host notice driver is kept: a pending tap survives a fresh `WorkflowNoticeTaps` instance and is consumed exactly once. | - | - |

## Proposed end state
Delete the file. Tap routing stays covered upstream and by the emulator tap and Ask instrumentation tests. Once all three Java notice fixtures are gone, `test/workflow-notice-delivery.test.mjs` is deleted too.
