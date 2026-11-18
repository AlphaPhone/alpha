# android/app/src/main/java/ai/alphacompute/alphaphone/DailyAppsPlugin.java
- Lines: 235 | Role: Capacitor `DailyApps`: reminder plugin subclass plus system hand-offs (camera, files, maps, mail ...), selected-document calls, Clock hand-off and assistant surface info. | Verdict: SIMPLIFY
- Importers: Registered in `MainActivity`; renderer `apps/app/src/daily.ts`, `main.tsx` (`surfaceInfo`, `closeAssistant`), `apps/app/src/browser/daily.ts` (browser twin), `prototype/context-selection.ts` (mime contract). Text/path pins: `test/clock-native-contract.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/plugin-worker-guard.test.mjs:30,56-57` (source text), `test/context-selection.test.mjs`, `test/browser/journey-j04-android.production.spec.ts`; androidTest `ReminderTimingInstrumentedTest` (`surfaceInfo`); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 32, 135-137 | A8 | `// MVP-DEFERRED:` commented-out Contacts import, `phone`/`messages`/`contacts` actions. | Delete the comments; restore from git if the features land. | none |
| 2 | 49-53, 59, 66-70 | A4 | `openAssistant`, `surfaceInfo.assistant`, `closeAssistant` test `getActivity() instanceof AlphaAssistActivity`, an Activity disabled under P-78. | With the P-78 deletion set: drop `openAssistant`/`assistantInvoked`, return `assistant:false` or remove the field, and simplify `closeAssistant` (renderer `main.tsx:227` and `daily.ts:64,70` updated together). | low |
| 3 | 55, 57, 195 | P18 | `LateLaunch.ask` wrappers. | Base-class fix (cross-file). | low |
| 4 | 72-79 | C3 | Eight one-line `documents(call,()->SelectedDocumentCalls.x(call,()->SelectedDocumentAccess.documents(getContext())))`. | Private `Supplier docs=()->SelectedDocumentAccess.documents(getContext())` field; keep eight `@PluginMethod`s (Capacitor needs them). | none |
| 5 | 81-86 | C3 | `clockInteger` twin of `ClockAgentReview.integer` and `CalendarAvailabilityJournalResult.whole`. | Shared `Json.wholeNumber`. | none |
| 6 | 174 | B3 | `Uri.parse(string(call,"url","https://example.com"))` - a missing URL silently opens example.com. | Refuse a missing URL (`IllegalArgumentException`), or confirm the renderer always passes it. Behaviour change: owner question. | low |
| 7 | 182 | D10 | `autofill` maps to `Settings.ACTION_SETTINGS`, same as `settings`. | Keep (documented); fine. | none |
| 8 | 31, 95-96 | D8 | FQ `ai.eliza.plugins.system.clock.ClockHandoff` x4 inline, 400-char resolve line. | Imports. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| ACTIONS | const | 32 | renderer action list in apps/app/src/daily.ts | stay |
| clockInteger | helper | 81-86 | ClockAgentReview.integer | Json util |
| mimeTypes | helper | 120-131 | renderer context-selection.ts mime contract | stay |
| number | helper | 113-117 | - | stay |
| base/finish/resolveResult | helpers | 229-234 | - | stay |

## Proposed end state
Same plugin methods minus assistant hooks; deferred comments gone; ~215 lines. Could split document calls into `SelectedDocumentsPlugin` but the renderer calls them on `DailyApps` - not worth the rename. Estimated lines after: 215.

## Verification
`test/plugin-worker-guard.test.mjs`, `test/clock-native-contract.test.mjs`, j04 production journey, androidTest ReminderTiming.
