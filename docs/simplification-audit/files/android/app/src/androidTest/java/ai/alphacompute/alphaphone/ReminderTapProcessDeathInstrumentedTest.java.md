# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderTapProcessDeathInstrumentedTest.java
- Lines: 95 | Role: from the separate `:workflowNoticeTest` instrumentation process, a captured reminder tap survives main-process death and opens the reminder on a plain launcher start. | Verdict: SIMPLIFY
- Importers: none; imports `WorkflowNoticeProcessDeathInstrumentedTest.Identity/awaitMain/killMainWithoutTasks/sendOriginalTap`. Text/path pins: `scripts/android-instrumentation.ts:290` (`campaign: "python3 scripts/ci/pending-recovery-ui.py ..."`); `scripts/ci/pending-recovery-ui.py:24` (`'ReminderTapProcessDeathInstrumentedTest','capturedReminderTapSurvivesMainDeathWithoutAnotherNotificationIntent','reminderTapProcessDeath'`, CI); `scripts/ci/test-pending-recovery-phases.py:72`. Process name `":workflowNoticeTest"` (`:42`) pins the instrumentation manifest's process.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-15 | D10 | Shared process-death primitives live as statics on another test class (`WorkflowNoticeProcessDeathInstrumentedTest`). | Move `Identity`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap` into a `ProcessDeathDriver` support class; both tests import it. | none |
| 2 | 26-39 | C3 | `visibleNode`/`awaitVisible` accessibility search duplicates `PrototypeFlow.accessibleLabel`, `RealClock.find/waitNative`, `PhotosMultiShare.nodes`. | `AccessibilityTestDriver`. | none |
| 3 | 92 | B5 | Builds an evidence JSON bundle (`addResults("reminderTapProcessDeath", {beforePid, afterPid, postTime, notificationSends, routeConsumed, ...})`). grep `routeConsumed`/`notificationSends`/`recoveryLaunch` in `scripts/ci/*.py`: 0 hits — no consumer; the assertions above already prove each field. | Delete line 92. | none |
| 4 | 21 | C6 | `APP="ai.alphacompute.alphaphone"`; `context.getPackageName()` gives the same. | Use `context.getPackageName()`. | none |
| 5 | 55-56, 62-63, 86-87 | C3 | Three hand-written `do{...;sleep}while(deadline)` polls. | One `await(Supplier<Boolean>,ms,label)` helper. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `notice(manager,id)` | helper | 22-25 | `notification(id)` in 4 Reminder tests | `ReminderTestSupport` |
| `visibleNode` / `awaitVisible` | helper | 26-39 | 4 files | `AccessibilityTestDriver` |

## Proposed end state
Same campaign test; process-death primitives in a support class; shared accessibility and polling helpers. ~85 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` (CI resident-android), `scripts/ci/test-pending-recovery-phases.py`; also `WorkflowNoticeProcessDeath` (shares the primitives).
