# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowApprovalNoticeProcessDeathInstrumentedTest.java
- Lines: 155 | Role: Approval notice across main-process death (run from the `WorkflowNoticeProcessRunner` helper process): survives and is captured once; withdrawn on a signed-out cold start (test-mocks and flag-off variants). | Verdict: SIMPLIFY (+ MERGE overlap with `WorkflowNoticeProcessDeathInstrumentedTest#approvalNoticeOpensOnlyItsApprovalAfterProcessDeath`)
- Importers: none. Run by `scripts/android-workflow-native.ts:97,99,101` (phase `approval-notice-recovery`, runner `WorkflowNoticeProcessRunner`). Text/path pins: those three method names; `test/native-campaign-evidence.test.mjs:38,48,70` (class name, `workflowApprovalNoticeProcessDeath` and `workflowOwnerPhase` args); registry campaign string `scripts/android-instrumentation.ts:292`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-108 vs `WorkflowNoticeProcessDeathInstrumentedTest:155-197` | T4 | Both prove "a pending approval notice survives main-process death and the restarted main captures exactly its token" in the same helper process with the same owner fixture. This file posts through the main bridge (prepare run) and adds idempotent re-post checks; the other posts natively and adds a second, untouched approval. Two campaigns (`android-workflow-native.ts approval-notice-recovery` and `pending-recovery-ui.py workflow-approval-process-death`) run them. | Keep this method (it covers the bridge post and re-post refusal); fold the "second approval stays `new`" assertion into it and delete `WorkflowNoticeProcessDeathInstrumentedTest#approvalNoticeOpensOnlyItsApprovalAfterProcessDeath` plus its `pending-recovery-ui.py` phase. | Medium: `pending-recovery-ui.py` reads that method's `workflowApprovalProcessDeath` result; update the script and `scripts/ci/test-pending-recovery-phases.py` together. Owner decision. |
| 2 | 56, 114 | A7 | Unused locals: `WorkflowNoticeDelivery delivery=WorkflowNoticeTapsFactory.delivery(context);` in the first two methods (lines 96, 100-101 deliberately build fresh instances; line 114's `delivery` is never read). Line 120 `long end;` declared before use at 124 only. | Delete both `delivery` declarations; declare `end` where assigned. | None. |
| 3 | 22, 37, 42, 63, 118, 147 | C6 / C3 | `APP="ai.alphacompute.alphaphone"` duplicated in `WorkflowNoticeProcessDeathInstrumentedTest:23`; launch-intent build `getLaunchIntentForPackage(APP)...setAction(WorkflowNoticeTaps.ACTION).setData(PREFIX+token)` written twice (37, 42). | Use `BuildConfig.APPLICATION_ID` (or `context.getPackageName()`); one `tapIntent(context,token)` helper. | None. |
| 4 | 23-33 | C3 | `approvals()`/`notice()` tag lookup — see `WorkflowApprovalNoticeInstrumentedTest.java.md` #2. | Shared `WorkflowNoticeTestSupport`. | Low. |
| 5 | 103 | B5 | `addResults("workflowApprovalNoticeProcessDeath", {...pids...})` — no reader (`git grep workflowApprovalNoticeProcessDeath -- scripts test`: only arg/gate uses; no `INSTRUMENTATION_RESULT` parser). | Delete line 103. | None. |
| 6 | 52, 112, 134 | C3 | `assertEquals(APP+":workflowNoticeTest",Application.getProcessName());assertTrue(uid/100000>0)` preamble ×3 here, ×2 in `WorkflowNoticeProcessDeathInstrumentedTest`. | `WorkflowNoticeTestSupport.assertHelperProcessInOwnedUser()`. | None. |
| 7 | 64, 67, 82, 119, 123 | D4 | Calls `WorkflowNoticeProcessDeathInstrumentedTest.awaitMain/killMainWithoutTasks/sendOriginalTap/Identity/mainPids` — process-death helpers live inside another test class (also used by `ReminderTapProcessDeathInstrumentedTest`). | Move them to a `MainProcessControl` support class (see that report). | Low. |
| 8 | whole | D8 | Many 300-500-char lines (69, 103, 145). | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `APP` | const | 22 | `WorkflowNoticeProcessDeathInstrumentedTest:23`, `WorkflowLegacyReminderUpgradeInstrumentedTest:26` literal | `BuildConfig.APPLICATION_ID` |
| `approvals`, `notice` | helper | 23-33 | `WorkflowApprovalNoticeInstrumentedTest:52,158`, `WorkflowNoticeProcessDeathInstrumentedTest:85,142` | `WorkflowNoticeTestSupport` |
| `assertOriginalPublication` | helper | 34-40 | none | keep local |
| `awaitTapCancellation` | helper | 41-46 | none | keep local |

## Proposed end state
Three methods (names unchanged, pinned by the runner); one absorbs the "other approval untouched" check; unused locals and the unread evidence bundle removed; notice/process helpers from shared support classes. About 120 lines.

## Verification
`ALPHA_BUILD_ARCHIVE=... ALPHA_TEST_MOCKS_ARCHIVE=... node scripts/android-workflow-native.ts --phase=approval-notice-recovery` (both archives); `node --test test/native-campaign-evidence.test.mjs`; if #1 is applied also `python3 scripts/ci/test-pending-recovery-phases.py` and `python3 scripts/ci/pending-recovery-ui.py`.
