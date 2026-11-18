# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarDeletionReviewInstrumentedTest.java
- Lines: 82 | Role: native delete review (Cancel / queue / Undo / expiry) through `AlphaCalendar.inspectDeletion/removeScoped` and `AlphaDeletions.undo` | Verdict: SIMPLIFY
- Importers: none. Registry `CalendarDeletionReview` (secondary user, `scripts/android-instrumentation.ts:278`). Text/path pins: registry entry only.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-45 | C3 | `clickReview` accessibility BFS that also checks title/details. | `NativeUiDriver.awaitTexts(...)` + `click(label)`. | Low |
| 2 | 21 | C3 | `foreground()` = `CalendarAgentCrud.awaitReviewForeground`. | `CalendarUiTestDriver.awaitFocus`. | Low |
| 3 | 22-23 | C3 | `begin/result` promise-to-window pattern (CalendarAgentCrud:37, BrowserReading.settle). | Shared `invoke(plugin,method,args)` in `WebViewTestDriver`. | Low |
| 4 | 28 | C6 | `"ai.alphacompute.alphaphone"` package literal; use `context.getPackageName()`. | Replace. | Low |
| 5 | 46, 52-54, 78 | C3 | `present`, owned calendar, exact cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 6 | whole | T4 (check) | Overlaps `ScopedCalendarDeletionInstrumentedTest` (same plugin methods, provider rows) and `CalendarDeletionRestart` (deadline 10 s); not in my chunk — compare when reviewing that file. | Merge into one "Calendar deletion" journey class if they assert the same transitions. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until` | helpers | 19-20 | all Calendar tests | `CalendarUiTestDriver` |
| `foreground` | helper | 21 | CalendarAgentCrud:27 | `CalendarUiTestDriver.awaitFocus` |
| `begin/result` | helpers | 22-23 | CalendarAgentCrud:37,23 | `WebViewTestDriver.invoke` |
| `clickReview` | helper | 24-45 | NativeUiDriver family | `NativeUiDriver` |
| `present` | helper | 46 | 2 twins | `CalendarProviderFixture` |

## Proposed end state
One journey method on shared helpers. Est. ~65 lines (less if merged with ScopedCalendarDeletion).

## Verification
`node scripts/android-instrumentation.ts --classes CalendarDeletionReview` (secondary user lifecycle helper).
