# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxFixtureActivity.java
- Lines: 8 | Role: `MainActivity` subclass that swaps `AlphaConnectionPlugin`/`AlphaCloudSignInPlugin` registrations for the Inbox fixtures. | Verdict: KEEP
- Importers: `InboxDraftInstrumentedTest`, `VoicePermissionDeniedInstrumentedTest`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | - | Minimal, correct seam (`registerPlugin` override). No issue. | None. | - |

## Local types and helpers
None.

## Proposed end state
Unchanged (8 lines).

## Verification
Compiles with the androidTest APK; exercised by the Inbox draft and voice-permission campaigns.
