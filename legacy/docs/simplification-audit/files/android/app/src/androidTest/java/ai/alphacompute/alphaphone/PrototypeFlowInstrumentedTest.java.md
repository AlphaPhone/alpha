# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PrototypeFlowInstrumentedTest.java
- Lines: 147 | Role: navigation of every MVP app with physical Back, deferred apps absent, Wallet/payment refusal in production, hidden-layer focus, and a note create/delete/undo journey. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:282` (`PrototypeFlow: { note: "the Wallet method runs on a flag-off build only ..." }`); runner reachability scan.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | A7 | Unused imports `CountDownLatch`, `TimeUnit`, `AtomicReference`. | Delete. | none |
| 2 | 21-30, 44-50 | D10 | Every helper takes `BoundedActivityScenario<MainActivity> s` and never uses it (`eval(s,js)` just calls `NotesSecureFixture.evaluate(js)`). | Drop the parameter from `eval/waitFor/click/home/ready/open/fill`. | none |
| 3 | 22 | D11 | Evaluates through `NotesSecureFixture.evaluate` (a Notes fixture) rather than `WebViewTestDriver.evaluate`. | Use `WebViewTestDriver.evaluate`. | low |
| 4 | 17-18 | A8 | Javadoc points at `LiveAgentInstrumentedTest.realProviderProposesAndUserApprovesPersistedLocalNote`, a class listed in `NOT_RUN_BY_A_RUNNER` (never runs). | Delete the sentence. | none |
| 5 | 20 | D11 | Class name "PrototypeFlow" describes history ("reference UI"), not the journey (MVP app navigation and refusals). | Rename to `AppNavigationInstrumentedTest` (update `CLASS_REGISTRY` key). | low |
| 6 | 102-117 | C3 | `accessibleLabel` BFS duplicates `PhotosMultiShare.nodes`, `RealClock.nodes/find`, `ReminderTapProcessDeath.visibleNode`. | `AccessibilityTestDriver`. | none |
| 7 | 46-49 | C3 | React value-setter idiom (`Object.getOwnPropertyDescriptor(...,'value').set.call`) duplicated in 6+ files. | `WebViewTestDriver.setValue(selector,value)`. | none |
| 8 | 71-101 | A3 (keep) | Wallet test asserts the PRD-deferred Wallet (AP-13) has no route, capability or native action on a flag-off build. This is a product rule, not dead code. | Keep; it is the runtime twin of the bundle audit. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval` / `waitFor` | helper | 21-28 | ~40 androidTest files | `WebViewTestDriver` |
| `button` / `click` | helper | 29-30 | `PosterCalendarJourney.button`, `RealClock.click`, `RemoteAgent.click` | `WebViewTestDriver.clickLabel` |
| `home` (Back probe) | helper | 31-43 | `ChatContinuity`/`Shell` Back helpers (not verified line-by-line) | keep here |
| `fill` | helper | 46-50 | 6+ value-setter copies | `WebViewTestDriver.setValue` |
| `accessibleLabel` / `accessible` | helper | 102-117 | see finding 6 | `AccessibilityTestDriver` |

## Proposed end state
Same four tests. Drop unused imports and the unused scenario parameter, use `WebViewTestDriver`/`AccessibilityTestDriver`,
delete the stale Javadoc reference, optionally rename the class. ~120 lines.

## Verification
`--classes PrototypeFlow` on a flag-off build (Wallet method; view methods skip when P-43 sign-in is required) and on the test-mocks pair (view methods).
