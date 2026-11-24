# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowNoticeProcessDeathInstrumentedTest.java
- Lines: 198 | Role: (a) Shared process-death toolkit (`Identity` from /proc, `mainPids`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap`) and (b) two tests: a step notice's original PendingIntent relaunches an absent main and is captured; an approval notice is captured for exactly its approval. | Verdict: SPLIT (toolkit → `MainProcessControl.java`) + SIMPLIFY
- Importers: 2 other classes call its static helpers — `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, `ReminderTapProcessDeathInstrumentedTest`. Run by `scripts/ci/pending-recovery-ui.py:24` phases `workflow-notice-process-death` and `workflow-approval-process-death` (runner `WorkflowNoticeProcessRunner`). Text/path pins: `scripts/ci/test-pending-recovery-phases.py:28,36,79,85,121` (fully qualified class + both method names), `scripts/ci/pending-recovery-ui.py:33` parses result key `workflowApprovalProcessDeath`, registry `scripts/android-instrumentation.ts:291`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-84 | D11 / D4 | Process-death helpers live in a test class and are imported by two other test classes: "Package-visible: WorkflowApprovalNoticeProcessDeathInstrumentedTest and ReminderTapProcessDeathInstrumentedTest prove the same death boundary." | Move `Identity`, `mainPids`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap` (lines 23-84, ~60 lines) to `androidTest/.../MainProcessControl.java`; update the three callers. | Low (pure move). |
| 2 | 142-197 | T4 | `approvalNoticeOpensOnlyItsApprovalAfterProcessDeath` overlaps `WorkflowApprovalNoticeProcessDeathInstrumentedTest#pendingApprovalNoticeSurvivesProcessDeathAndOpensItsExactApprovalOnce` (same fixture, runner, death boundary, exact-token capture). | Fold its unique check (a second approval stays `state=new` and its notice remains) into the other class and delete this method + `approvalNotice()` helper + the `workflow-approval-process-death` phase in `pending-recovery-ui.py` and its test. | Medium; owner decision; campaign scripts change in the same commit. |
| 3 | 85-89, 142-146 | C3 | Two near-identical tag lookups `notice()` and `approvalNotice()` in this file (differ only in message and the id-0 assertion). | One shared `WorkflowNoticeTestSupport.row(manager,id)`. | None. |
| 4 | 99-100 | C4 / D4 | Hand-written `WorkflowNoticeDelivery.Storage` adapter over `AlphaCredentialStore`, then `new WorkflowNoticeTaps(storage)` / `new WorkflowNoticeDelivery(storage,new WorkflowNoticePoster(context))` — exactly what main's `WorkflowNoticeTapsFactory.create/delivery(context)` does (and what line 163 of this same file uses). | Replace lines 99-100 with `WorkflowNoticeTapsFactory.create(context)` / `.delivery(context)`. | None. |
| 5 | 23, 94, 159 | C6 / C3 | `APP` literal; helper-process/owned-user preamble duplicated (see `WorkflowApprovalNoticeProcessDeathInstrumentedTest.java.md` #3, #6). | `BuildConfig.APPLICATION_ID`; shared preamble assertion. | None. |
| 6 | 136 | B5 | `addResults("workflowNoticeProcessDeath", ...)` has no reader (only `workflowApprovalProcessDeath` at 193 is parsed by `pending-recovery-ui.py:33`). | Delete line 136. | None. |
| 7 | 106-114 | C3 | "publish once, then poll receipt while `unknown`" loop — same in `WorkflowNoticeTapInstrumentedTest:81-88,162-164`. | `WorkflowNoticeTestSupport.awaitPublished(Supplier<String> receipt)`. | Low. |
| 8 | whole | D8 | Lines up to ~400 chars (126, 136, 193). | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Identity` | class | 25-42 | used by `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, `ReminderTapProcessDeathInstrumentedTest` | `MainProcessControl` |
| `mainPids`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap` | helper | 43-84 | same callers | `MainProcessControl` |
| `APP` | const | 23 | `WorkflowApprovalNoticeProcessDeathInstrumentedTest:22` | `BuildConfig.APPLICATION_ID` |
| `notice`, `approvalNotice` | helper | 85-89, 142-146 | 3 other workflow test files | `WorkflowNoticeTestSupport` |
| anonymous `WorkflowNoticeDelivery.Storage` | class | 99 | main `WorkflowNoticeTapsFactory.storage` | delete; use factory |

## Proposed end state
This file keeps one test (`originalNoticeLaunchesAbsentMainAfterOrdinaryProcessDeath`, name pinned) using `MainProcessControl`, `WorkflowNoticeTapsFactory` and shared notice helpers: about 55 lines. New `MainProcessControl.java` holds ~60 moved lines.

## Verification
`python3 scripts/ci/test-pending-recovery-phases.py` (host, pins class/method names) and `python3 scripts/ci/pending-recovery-ui.py` on an emulator; `ReminderTapProcessDeathInstrumentedTest` and `WorkflowApprovalNoticeProcessDeathInstrumentedTest` campaigns after the move.
