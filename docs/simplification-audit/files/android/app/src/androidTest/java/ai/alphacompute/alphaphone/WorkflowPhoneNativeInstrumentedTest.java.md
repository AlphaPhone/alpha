# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowPhoneNativeInstrumentedTest.java
- Lines: 99 | Role: Native workflow scope: action-journal private read result survives recreation without leaking into passive history; denied Calendar grant returns no events; selected-calendar range read excludes other accounts and refuses overflow; morning/evening digest share one calendar source. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/android-workflow-native.ts:88` (`workflowPhoneNative`, `workflowPhoneDenied` gates). Text/path pins: the four method names in that case list; `test/native-campaign-evidence.test.mjs:123,158` (class name, `#deniedCalendarGrantReturnsNoEvents`). Slot formats `action-journal:v1:<scope>:entry:<proposal>` / `:index` are persisted — keep.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-25 | C3 | `js`, `ready`, `call`, `sha` are copies of `WorkflowDraftNativeInstrumentedTest:14-17`. | Shared `WebViewTestDriver.until/call` and `TestHashes.sha256Hex`. | Low. |
| 2 | 57, 68, 97 | C3 | Fixture calendar insert/delete via sync-adapter URI (`CalendarContract.Calendars.CONTENT_URI.buildUpon().appendQueryParameter(CALLER_IS_SYNCADAPTER,"true")...`) built 3× in this file; other Calendar instrumentation classes (12 `Calendar*`, research P20) build their own. | A `TestCalendars` androidTest helper: `create(resolver,account)` / `delete(resolver,uri,account)` / `event(...)`; use in all Calendar* tests. | Low. |
| 3 | 43-47, 68, 97 | C3 | Primary-failure/suppressed-cleanup idiom 3× (also `WorkflowDraftNativeInstrumentedTest:30`). | `TestCleanup.run(body, cleanup)`. | None. |
| 4 | 63, 77 | C3 | `AppNavigation.liveMode();js(AppNavigation.request("Workflows"));ready(AppNavigation.selected("Workflows"));ready("window.__alphaTestNavigation?.status==='complete'")` twice. | `AppNavigation.go("Workflows")`. | None. |
| 5 | 81 | C4 | In-memory `NativeDigestSources.Storage` HashMap adapter (twin in `WorkflowLegacyReminderUpgradeInstrumentedTest:34`). | `MapStorage` helper if both survive; otherwise inline stays. | None. |
| 6 | 89-90, 95 | A1 (minor) | Synthetic reminder row labelled "an upgraded one-off legacy alarm" with `.put("legacyAlarm",true)`; `NativeDigestSources` has no branch on `legacyAlarm` (only a comment at `NativeDigestSources.java:79`). | Drop the `legacyAlarm` key and the comment wording; the row still tests an open reminder whose `dueAt` precedes the window. Rename id `"legacy"` → `"open"` (assert at 95 accordingly). | None. |
| 7 | 27, 57-68, 97 | D8 | Lines up to ~900 chars (57, 61, 64, 66, 97). | Formatter; split the calendar fixture into named steps. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `enabled` | helper | 21 | Assume-gate one-liners in many classes | keep |
| `js`/`ready`/`call` | helper | 22-24 | `WorkflowDraftNativeInstrumentedTest:14-16` | `WebViewTestDriver` |
| `sha` | helper | 25 | `WorkflowDraftNativeInstrumentedTest:17` + 33 SHA-256 sites | `TestHashes.sha256Hex` |
| `calendar`, `event` | helper | 57-58 | Calendar* instrumentation tests | `TestCalendars` |
| anonymous `NativeDigestSources.Storage`/`Reader` | class | 81, 87-91 | `WorkflowLegacyReminderUpgradeInstrumentedTest:34,38-41` | `MapStorage` (androidTest) |

## Proposed end state
Same four tests; helpers from shared driver/hash/calendar/cleanup classes; no `legacyAlarm` fixture key; formatted. About 75 lines.

## Verification
`node scripts/android-workflow-native.ts` default `workflow` phase (both variants, Calendar permissions granted) and the denied-permission run; `node --test test/native-campaign-evidence.test.mjs`.
