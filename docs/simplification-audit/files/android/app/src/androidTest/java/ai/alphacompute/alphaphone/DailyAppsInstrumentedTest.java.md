# android/app/src/androidTest/java/ai/alphacompute/alphaphone/DailyAppsInstrumentedTest.java
- Lines: 327 | Role: `DailyApps` plugin journeys: Calendar form creates and reviewed-deletes a native reminder; capability inventory; dangerous browser/calendar inputs rejected; document-picker cancel; reminder notification post/tap/retained tap/refused direct cancel/reviewed deletion; root Back behaviour per variant/HOME role. | Verdict: SIMPLIFY (split)
- Importers: none. Uses `ReminderTestAccess` (androidTest class in upstream package), `ChatContinuityInstrumentedTest.alphaIsHome`.
  Text/path pins: `scripts/android-instrumentation.ts:193` (`DailyApps: {}`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-23, 24-45 | B4 / C3 | Every helper takes an unused `BoundedActivityScenario<MainActivity> scenario` parameter: `evaluate(scenario, js){return WebViewTestDriver.evaluate(js);}`; plus private `ready`/`result`/`begin`/`uiWait` copies | Drop the parameter; use shared `WebViewTestDriver.call/until` | None |
| 2 | 5, 13-14 | A7 | Unused imports `KeyEvent`, `CountDownLatch`, `TimeUnit` | Delete | None |
| 3 | 83-132, 185-290 | C5 | Two reminder deletion journeys (Calendar UI path and notification path) both drive `confirmReminderDeletion` + `awaitCommittedCancellation`; overlap with the 16 `Reminder*` instrumentation classes (research P20) | Keep the Calendar-UI creation + notification tap; move the reviewed-deletion assertions to one place (the Reminder deletion suite) | Medium: confirm which Reminder* class already asserts StrictMode/no main-thread IO (264-277) before moving |
| 4 | 296-325 | D11 | `rootBackStaysWhileHomeAndOtherwiseLeavesAlpha` is a launcher/back-dispatch test inside the DailyApps class | Move to `LauncherHomeInstrumentedTest` (or a `BackDispatch` class) | Low |
| 5 | 133-151 | T3 | `nativeCapabilityInventoryIsExplicit` asserts an exact action set from `capabilities()` — a contract check of one plugin method | Keep (cheap, catches PRD scope leaks like phone/messages/contacts); fine as is | — |
| 6 | 51-71 | C3 | Accessibility BFS for a native dialog (twin of CameraScan.nativeSave, ClockAgentReview.find) | `UiNodes` | None |
| 7 | 226 | C6 | `"cloud:production"` literal | slot constant | None |
| 8 | 229, 240, 312, 318 | T8 | Fixed 1.5 s / 300 ms sleeps for negative windows ("does not open") | Keep as observation windows; name them (`NEGATIVE_WINDOW_MS`) | None |
| 9 | 257 | D8 | ~500-char JS builder for a reminder cancel binding hash | Move to a helper `reminderCancelAttempt(id)` | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `evaluate`/`ready`/`result`/`begin`/`uiWait` | helper | 21-45 | ClockAgentReview, ConnectionInstrumentedTest, CloudVoice | `WebViewTestDriver` |
| `confirmReminderDeletion` | helper | 51-71 | Reminder deletion tests (native review dialog clicks) | `ReminderReviewDriver` |
| `focused()` | helper | 73-76 | activity focus polls in Reminder*/Calendar* tests | `BoundedActivityScenario.awaitFocus` |
| `awaitCommittedCancellation` | helper | 78-82 | Reminder* | `ReminderReviewDriver` |

## Proposed end state
DailyApps keeps inventory, input-rejection, picker-cancel and Calendar-created reminder + tap; Back-dispatch test moves to the
launcher class; deletion review helpers move to a shared Reminder driver; unused parameter/imports gone. Estimated 327 -> ~230 lines here.

## Verification
`--classes DailyApps` on both variants (flag-off and `--test-mocks`, since the tap path branches on
`ELIZA_DEV_ALLOW_TEST_MOCKS`), plus the destination class of the Back test with `--home-role`.
