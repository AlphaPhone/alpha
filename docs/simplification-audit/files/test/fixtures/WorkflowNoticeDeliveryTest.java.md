# test/fixtures/WorkflowNoticeDeliveryTest.java
- Lines: 39 | Kind: host-JVM integration of `WorkflowNoticeDelivery` (a pass-through wrapper) over upstream `NoticeDelivery`, with fake Storage and Poster. This tests upstream code (T5). | Verdict: DELETE, together with `test/workflow-notice-delivery.test.mjs` (which also runs `WorkflowNoticeRecoveryTest` and `WorkflowNoticeTapsTest`)
- Covers: at-most-once dispatch of step-result notices:
  - exact replay binding, and receipt mismatch on a changed title, body or binding;
  - denial;
  - storage faults before and after commit;
  - a late confirmation, an uncertain binder return, and bounded history (512);
  - text validation, and 12 concurrent publishes that post once.
- Duplicates: upstream `plugin-native-notifications/test/native-host/NoticeHostTest.java` and `notices.node.mjs`, and Alpha's instrumentation `WorkflowNoticeProcessDeathInstrumentedTest.java` (198 lines).
- Callers/importers: only `test/workflow-notice-delivery.test.mjs:12-13`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-37 | T5, T4 | Every assertion exercises `NoticeDelivery` (upstream). Alpha's class only supplies the slot names and approval text. | Delete. | Medium: same host-lane gap as `WorkflowApprovalNoticeTest.java.md` finding 4. |
| 2 | 13-37 | D8 | Statement soup: 25-statement lines. | Goes with the deletion. | None |
| 3 | - | - | If a merged `test/android/workflow-notices.test.mjs` is kept, carry two cases: 12 concurrent publishes post once, and a storage fault after commit answers `unknown` without reposting. | MERGE, optional. | - |

## Proposed end state
Delete the file. Step-notice delivery stays covered upstream and by the emulator process-death test. If the owner wants a host check, it carries the two optional cases above, in the single merged notice driver.
