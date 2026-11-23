# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarUiTestDriver.java
- Lines: 38 | Role: shared Calendar UI helper — `until` with diagnostics and a real touch on a rendered event | Verdict: KEEP (grow into the one Calendar UI driver)
- Importers: 2 — `CalendarCrudInstrumentedTest` (until, tapVisibleEvent), `CalendarFlowInstrumentedTest` (tapVisibleEvent). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | C3 | The best `until` of the Calendar tests (diagnostics include tap events); 7 Calendar classes keep their own `until/eval` instead (AgentCrud:20-21, DeletionReview:19-20, ExternalEditor:29-30, Flow:28-31, Range:21-22, Truncation:19-20, Crud:19). | Make this the only one; add `click(label)`, `open()` (Calendar + declineStartupAccess), `chooseDate(date)`, `eventButton(title)`, `awaitFocus()`. | Low |
| 2 | 24-26 | C3 | Foreground-focus wait = `CalendarAgentCrud.awaitReviewForeground:27-36` = `CalendarDeletionReview.foreground:21`. | Extract `awaitFocus()` here and reuse. | Low |
| 3 | 27-35 | C3 | WebView-coordinate touch injection; BrowserSignins/BrowserWebFeatures `tap()` do the same for the child WebView. | Share the coordinate→screen conversion with `BrowserTestDriver.tapChild` via one `TouchInjector.tap(WebView, cssX, cssY, cssWidth)`. | Low |
| 4 | 13, 25 | D8 | Long single-line diagnostics/focus code. | Formatter. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 12-14 | 7 Calendar classes | here |
| `tapVisibleEvent` | helper | 15-37 | BrowserSignins.tap, BrowserWebFeatures.tap (child WebView) | here; touch part → `TouchInjector` |

## Proposed end state
The Calendar UI driver: `until`, `click`, `open`, `chooseDate`, `eventButton`, `awaitFocus`, `tapVisibleEvent`.
Grows to ~70 lines while removing ~120 lines of copies from 9 Calendar classes.

## Verification
All Calendar UI classes via `node scripts/test-calendar-regression.ts` (CalendarFlow, CalendarCrud, CalendarRange, CalendarTruncation, CalendarAgentCrud).
