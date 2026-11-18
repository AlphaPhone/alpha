# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowNoticeTapInstrumentedTest.java
- Lines: 187 | Role: Workflow step notices in a disposable secondary user: cold/warm/failed-capture/consumed-replay tap routes, and the Ask action's purpose and exact-revision consumption, under a restored synthetic owner. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/ci/pending-recovery-ui.py:24` phases `workflow-notice-tap` and `workflow-notice-ask` (gate `workflowNoticeTap=1`). Text/path pins: `scripts/ci/test-pending-recovery-phases.py:59,64` (fully qualified class), the two method names selected by `pending-recovery-ui.py`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 35, 93-127 | T5 / B5 | A 35-line main-looper "hold" harness (`holdEntered/releaseHold/holdFinished` latches, a release thread, `coldReadinessQueued` instance field mutated from `tapBridgeReady`) whose stated purpose is test-machinery regression: "Releasing 1.5 s afterward deterministically exceeds the obsolete 1 s cap." It tests `TestUiDispatch` timeouts, which `UiDispatchInstrumentedTest` already covers (`TestUiDispatch.postForFixture` callers: only these two classes). | Replace lines 93-127 with `cold.send(); JSONObject one=pending(firstToken); ...` and drop the `coldReadinessQueued` field and its countDown (lines 15, 35). | Low: product behaviour (cold tap captured) is still asserted. |
| 2 | 16-20 | C3 | `call()` promise bridge (`window.__workflowNoticeTap`). | `WebViewTestDriver.call`. | Low. |
| 3 | 22-37 | C3 / C4 | `tapBridgeReady` re-implements the live-activity scan plus a focus requirement; `resumedIntent` (49-53) and the inline warm-capture loop (137) scan `getActivitiesInStage(RESUMED)` again. | Use `WebViewTestDriver.liveActivity(MainActivity.class)` (proposed) for all three. Keep the "never launch or resend" read-only semantics. | Low. |
| 4 | 64, 151 | C3 | `notice()` and `noticePresent()` tag lookups; four sibling copies in the workflow test files. | Shared `WorkflowNoticeTestSupport.row/present`. | None. |
| 5 | 62 | C3 | `route(owner,run)` identical to `WorkflowApprovalNoticeInstrumentedTest:157` (modulo owner source). | `WorkflowNoticeOwnerFixture.route`. | None. |
| 6 | 63 | C6 | `"remote:"+origin` credential slot literal; `WorkflowNoticeOwnerFixture.PREFS` clear duplicated cleanup. | Move `forgetOwner` into `WorkflowNoticeOwnerFixture` (it owns those keys). | Low; P15 coupling as in the fixture report. |
| 7 | 81-88, 162-164 | C3 | "post once, poll receipt while unknown" loop twice in this file; once more in `WorkflowNoticeProcessDeathInstrumentedTest:106-114`. Note the second copy (164) does not assert `unknown` while polling. | One `awaitPublished` helper with the stricter (first) semantics. | Low. |
| 8 | 94 | A8 | Comment references "the obsolete 1 s cap" (history narration). | Goes with #1. | None. |
| 9 | whole | D8 | Many 300-500-char lines (137, 149). | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 16-20 | 12 files | `WebViewTestDriver.call` |
| `tapBridgeReady`, `resumedIntent` | helper | 22-37, 49-53 | `WebViewTestDriver:21-27`, `VoicePermissionDeniedInstrumentedTest:33-37` | `WebViewTestDriver.liveActivity` |
| `pending(token)` | helper | 38-47 | polling loops in `WorkflowApprovalNoticeInstrumentedTest:72-90,179` | `WorkflowNoticeTestSupport.awaitPendingTap` |
| `route` | helper | 62 | `WorkflowApprovalNoticeInstrumentedTest:157`, `WorkflowNoticeOwnerFixture:25` | `WorkflowNoticeOwnerFixture.route` |
| `forgetOwner` | helper | 63 | none | `WorkflowNoticeOwnerFixture` |
| `notice`, `noticePresent` | helper | 64, 151 | 4 workflow test files | `WorkflowNoticeTestSupport` |

## Proposed end state
Two tests (names pinned) with the looper-hold harness removed and shared helpers for bridge calls, activity lookup, notice rows, route building and publication polling. About 120 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` phases `workflow-notice-tap` and `workflow-notice-ask` on an emulator (test-mocks build); `python3 scripts/ci/test-pending-recovery-phases.py`; `UiDispatchInstrumentedTest` (`--classes UiDispatch`) remains the TestUiDispatch coverage.
