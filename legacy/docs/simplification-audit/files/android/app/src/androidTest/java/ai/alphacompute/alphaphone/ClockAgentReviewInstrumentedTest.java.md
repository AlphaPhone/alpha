# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ClockAgentReviewInstrumentedTest.java
- Lines: 78 | Role: journal-bound native owner review for agent Clock hand-offs (reserve -> review dialog -> confirm with nonce; denial/unavailable; cancel; retire; recreation), all Clock intents intercepted. | Verdict: SIMPLIFY
- Importers: none. Uses `ai.eliza.plugins.reminders.ReminderTestAccess` (androidTest copy in the upstream package) for `digest`.
  Text/path pins: `scripts/ci/pending-recovery-ui.py:24` phase `('clock-agent-review','ClockAgentReviewInstrumentedTest','journalBoundOwnerReviewManualSelectionCancellationAndRecreation','clockAgentReview','1')`, asserted by `scripts/ci/test-pending-recovery-phases.py:90`; runs in `.github/workflows/resident-android.yml:606` (recovery-ui job). No `CLASS_REGISTRY` entry (reachable through the campaign list).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-32 | C3 / T7 | Private `js`, `waitFor`, `begin`/`result`/`bridge` promise-capture helpers (`window.__clockAgentResult=null;Capacitor.nativePromise(...)`) — same shape in ConnectionInstrumentedTest:38-47, CloudDelegationCallback:22-27, CloudVoice:21-24, DailyApps:31-41 | One `WebViewTestDriver.call(plugin, method, args) -> JSONObject` that resolves `{ok,value,error}` | Low |
| 2 | 40-42 | C3 | Recursive `find(AccessibilityNodeInfo,label)`, `button(label)`, `visible()` (three poll loops) | Shared `UiNodes.click(label)` / `UiNodes.await(label)` (or UiAutomator `By.text`) | Low |
| 3 | 47, 77 | C3 / C5 | `ActivityMonitor` that intercepts the four AlarmClock actions is written three times (here 47+77, ClockHandoff:27-29, ClockRepeatDays:42, RealClock) | `ClockIntents.intercept(Instrumentation, List<Intent>)` helper beside `ClockHistoryFixture` | Low |
| 4 | 77 | D11 | `private static boolean SetActions(String)` — capitalised method name | rename `isClockAction` (moves with #3) | None |
| 5 | 46-72 | D8 | Whole flows on single lines (47 is ~600 chars; 68-72 each run a full scenario) | Formatter; split each scenario into a named private method (`showNeedsNoDialog`, `cancelFails`, `retiredNonceFails`, `recreationReoffers`) | Low |
| 6 | 74 | C6 | Literal slot `"action-journal:v1:"+scope+":entry:"+id` / `":index"` | Reference the journal's slot builder (`AlphaActionJournal` / upstream constant) | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`, `waitFor` | helper | 28-29 | ~77 poll copies | `WebViewTestDriver` |
| `begin`/`result`/`bridge` | helper | 30-32 | ConnectionInstrumentedTest, CloudDelegationCallback, CloudVoice, DailyApps | `WebViewTestDriver.call` |
| `operation(action)`/`reserve(op)` | helper | 33-39 | journal reserve in `ActionJournal*` tests | keep |
| `find`/`button`/`visible` | helper | 40-42 | CameraScan:64-87, DailyApps:51-71, RealClock | `UiNodes` |
| `SetActions` | helper | 77 | ClockHandoff:28 inline, RealClock | `ClockIntents.isClockAction` |

## Proposed end state
Same single @Test and phase name (pinned by pending-recovery-ui.py). Shared bridge/poll/UI-node helpers replace the
private ones; Clock interception comes from `ClockIntents`; scenarios split into named steps. Estimated 78 dense lines ->
~70 formatted lines (net logical reduction, not line count).

## Verification
`python3 scripts/ci/test-pending-recovery-phases.py`; the `clock-agent-review` phase of `scripts/ci/pending-recovery-ui.py`
(resident-android.yml recovery-ui job, secondary user); `specs/quint/refinement/native/clock-review.mjs` is unaffected (it
compiles main classes only).
