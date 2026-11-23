# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxFixtureScope.java
- Lines: 6 | Role: two mutable statics (`phase`, `runId`) shared by the Inbox fixture plugins and the tests that arm them. | Verdict: MERGE into android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxFixtureConnection.java (low priority)
- Importers: `InboxDraftInstrumentedTest`, `InboxFixtureConnection`, `VoicePermissionDeniedInstrumentedTest`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | D4 | A 6-line holder `static String phase,runId;` whose only reader is `InboxFixtureConnection`. | Move the two statics onto `InboxFixtureConnection` (`InboxFixtureConnection.phase/runId`) and update the 3 call sites. | Low |
| 2 | 4 | - | Not `volatile`, written on the test thread and read on Capacitor threads. | `volatile` when moved. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `phase`, `runId` | const (mutable static) | 4 | none | `InboxFixtureConnection` |

## Proposed end state
File removed; fields live on `InboxFixtureConnection`. 0 lines here.

## Verification
androidTest compile; Inbox draft and voice-permission campaigns.
