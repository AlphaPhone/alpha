# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarAgentCrudInstrumentedTest.java
- Lines: 123 | Role: agent Calendar operations through `AlphaCalendar.executeAgent` with native review; direct option saves (all-day, zone, RRULE); ACTION_INSERT handoff | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts:63,65` (methods `reviewedNativeCreateReadUpdateDeleteAndStaleRevision` with `calendarAgent=1`, `directSaveReadsBackAllDayChosenZoneAndRrule` with `calendarOptions=1`) and `scripts/test-installed-upgrade.ts:118` (`--bridge`). Text/path pins: `test/calendar-regression-runner.test.mjs:29-54` (method names, gate names), `test/fixtures/isolated-native-campaign.mjs`, `test/browser/calendar-proposal-review.production.spec.ts:18` (comment).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 105-122 | T9 / A7 | `insertHandoffIsInterceptedWithPrefilledFields` has no gate and no runner selects it: test-calendar-regression only runs the two named methods of this class (grep `insertHandoffIsIntercepted`: 0 hits outside this file). | Either add a `['CalendarAgentCrudInstrumentedTest',…,'insertHandoffIsInterceptedWithPrefilledFields']` case to `scripts/test-calendar-regression.ts` (and the runner test) or delete it (−18 lines). Renderer still calls `insertHandoff` (`apps/app/src/prototype/calendar-adapter.ts:240`), so prefer adding the case. | Low |
| 2 | 22, 42-49 | C3 | Two hand-written accessibility BFS walks (`nativeClick`, `reviewShows`). | `NativeUiDriver.click(label)` / `awaitTexts(...)`. | Low |
| 3 | 27-36 | C3 | `awaitReviewForeground` = `CalendarDeletionReviewInstrumentedTest.foreground:21` = focus wait inside `CalendarUiTestDriver.tapVisibleEvent:24-26`. | `CalendarUiTestDriver.awaitFocus()`. | Low |
| 4 | 37, 58, 83, 85, 113 | C3 (local) | `eval("window.__calendarAgentResult=null;Capacitor.Plugins.AlphaCalendar.X(...).then(value=>…,error=>…)")` written 5×. | `private void invoke(String method,Object args)`; same helper serves CalendarDeletionReview.begin. | Low |
| 5 | 54, 76 | C3 | READ/WRITE_CALENDAR grant loop (12 androidTest files). | `CalendarProviderFixture.grantCalendar()`. | Low |
| 6 | 39, 70 | A8 | Changelog references "Upstream review wording (elizaOS/eliza#35913)" and "Patch 0041". | Describe the behaviour only. | Low |
| 7 | 98-99 | T3 / T5 | `CalendarEventOptions.parse` rejection cases are pure upstream parser unit tests inside an emulator method. | Move to upstream plugin-native-calendar host tests; keep provider read-back here. | Low |
| 8 | 59-66 | D8 | Six 200-400 char lines each holding a full CRUD step. | One statement per line. | Low |
| 9 | 51 | C3 | `exists(context,id)` = `CalendarDeletionReview.present:46` = `CalendarDeletionRestart.present:27-31`. | `CalendarProviderFixture.present(id)`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until` | helpers | 20-21 | every Calendar test; `CalendarUiTestDriver.until` | `CalendarUiTestDriver` |
| `nativeClick/reviewShows` | helpers | 22, 42-49 | CalendarCrud:71-72, CalendarDeletionReview:24-45, BrowserWebFeatures:65-90 | `NativeUiDriver` |
| `assertReviewReleased` | helper | 24 | none | keep |
| `awaitReviewForeground` | helper | 27-36 | CalendarDeletionReview:21, CalendarUiTestDriver:24-26 | `CalendarUiTestDriver.awaitFocus` |
| `CHANGE_REVIEW` | const | 41 | upstream review copy | keep |
| `exists` | helper | 51 | CalendarDeletionReview:46, CalendarDeletionRestart:27 | `CalendarProviderFixture` |
| `eventId/provider` | helpers | 72-73 | none | keep |

## Proposed end state
Three methods (handoff method wired into the regression runner), shared review/accessibility/foreground/provider helpers,
no changelog references, upstream parser cases moved upstream. Est. ~95 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarAgentCrudInstrumentedTest` (both methods); `node --test test/calendar-regression-runner.test.mjs`;
`node scripts/test-installed-upgrade.ts calendar --bridge` (until CalendarUpgrade is deleted, see that report).
