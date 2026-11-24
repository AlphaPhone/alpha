# test/browser/voice-stop-speaking.spec.ts
- Lines: 54 | Kind: Playwright spec, chromium (build flags routed off), 2 tests | Verdict: MERGE into `journeys/voice.spec.ts` (assistant section)
- Covers: `Stop speaking` appears only while Alpha speaks, is at least 44×44, interrupts playback once, the conversation re-arms listening, and the cut reply is marked "Interrupted before this reply was played"; it is absent when capture fails. Duplicates: assistant playback/stop partly in `voice-assistant.production.spec.ts` and `voice-composer-recovery.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D5/T6 | Routes `/src/build-flags.ts` to a hand-written flags module to imitate the flag-off build on the dev server. It must list every export (`updateChannelCheckEnabled` is being deleted, D8). | Run this step in the production project on the real flag-off bundle (`voice-assistant.production.spec.ts` already does), or drop the route. | Medium: route breaks whenever `build-flags.ts` changes. |
| 2 | 10 | T6 | Patches `VoiceAssistantSession.prototype.start` to count `interruptSpeech` calls. | Count native `stopPlayback` calls at the bridge (the fixture already counts `stopped`, line 38); delete the prototype patch. | None. |
| 3 | 32 | ok | Touch-target size check. | Keep (or leave to the accessibility sweep). | None. |
| 4 | 18 | T8 | `waitForTimeout(150)` between synthetic speech frames. | Use fixture timestamps; no sleep. | Low. |
| 5 | 46-54 | ok | Failure case is a cheap assertion. | Fold into the same journey's capture-failure step. | None. |

## Proposed end state
Two steps in the assistant section of `journeys/voice.spec.ts`, preferably in the production project: speak → `Stop
speaking` visible → tap → listening again, one playback stop, interrupted marker; capture failure → no `Stop speaking`.
Needs `harness/voice.ts` (assistant fixture) and `flag-off-android` helpers. File deleted.
