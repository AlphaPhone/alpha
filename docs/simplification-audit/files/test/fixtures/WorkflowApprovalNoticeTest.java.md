# test/fixtures/WorkflowApprovalNoticeTest.java
- Lines: 232 | Kind: host-JVM integration of Alpha's notice config wrappers (`WorkflowNoticeDelivery.java`, 47 lines; `WorkflowNoticeTaps.java`, 13 lines) over the upstream ledger (`ai.eliza.plugins.notifications.NoticeDelivery/NoticeOwner/NoticeRoutes/NoticeCoordinator` from the prepared native source), with fake Storage and Poster. In practice it is a test of upstream code (T5). | Verdict: DELETE, together with its runner `test/workflow-approval-notice.test.mjs`
- Covers: phone-step approval notices. Each approval ID posts once and times out at its expiry. A tap still opens the run after restart. A decision withdraws the notice, also before the publish and when the ledger refuses. A full ledger refuses cleanly, the original error survives cleanup, an owner change fences and quietly resumes, and the owner tuple is origin+owner+agent.
- Duplicates:
  - `vendor/eliza/plugins/plugin-native-notifications/test/native-host/NoticeHostTest.java` covers `postApproval` (14 calls), `resumeApproval`, `withdrawOtherOwners`, "history is full" and `NoticeRecovery`.
  - Upstream `test/android-consumer/.../NoticeDeliveryTest.java` covers `publishApproval` and `expireApprovals` on a device.
  - Alpha's `android/app/src/androidTest/.../WorkflowApprovalNoticeInstrumentedTest.java` (183 lines) and `WorkflowApprovalNoticeProcessDeathInstrumentedTest.java` (155 lines) cover the same behaviour on the emulator.
- Callers/importers: only `test/workflow-approval-notice.test.mjs:14-15`, which compiles it and greps "PASS". `git grep` finds no other reference.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 70-104 | A1 | "Receipts written before the shared ledger was adopted still read": literal bytes written by the "retired in-app ledger" at dfacccb3, plus the interrupted `applying` rows it left. The renamed package starts empty, so no such receipts exist. | Delete. Nothing in Alpha's product reads a different format: the slot names are unchanged and upstream owns the reader. | None |
| 2 | 220-221 | A1 (upstream) | "old ownerId-only fence fails closed / validated tuple replaces legacy fence" tests a legacy reader inside upstream `NoticeRoutes`. | Delete here. List it as an upstream follow-up (D14). | None |
| 3 | 94, 228-229 | T-constant | Asserts slot-name literals and `STEP_NOTICE_TIMEOUT_MS==24h`. | Delete. These are constants. | None |
| 4 | 22-69, 105-212 | T5, T4 | Everything else drives the upstream `NoticeDelivery`/`NoticeCoordinator` state machine through Alpha's pass-through methods (`WorkflowNoticeDelivery` only forwards). Upstream's own host suite and Alpha's instrumentation cover it. | Delete. If the owner wants an Alpha-side host check while the emulator lane is manual, merge only these cases into one `test/android/workflow-notices.test.mjs` with one Java driver: (a) each approval ID posts at most once and withdrawn approvals never repost, (b) a tap after a fresh `WorkflowNoticeTaps` instance opens the run, (c) an owner change withdraws and the old tap is refused, (d) a full ledger refuses with no OS post. | Medium: the host verify lane loses its only quick check of Alpha's approval-notice wiring. The emulator lane (`android-emulator.yml`) is workflow_dispatch. |
| 5 | 8-9 | C3 | `rejects` and `require` helpers duplicate those in `WorkflowNoticeDeliveryTest.java` and `WorkflowNoticeTapsTest.java`. | They go with the deletion. In a merged driver, use one copy. | None |

## Proposed end state
- The file and its runner are deleted.
- Approval-notice behaviour stays covered by upstream `NoticeHostTest.java` (upstream CI) and by Alpha's two approval-notice instrumentation tests on the emulator.
- If a host check is kept, it is the four merged cases above, in one file shared with the other three notice fixtures.
