# test/browser/voice-assistant-fixture.ts
- Lines: 68 | Kind: Playwright helper for the production lane: extends `flag-off-android` with a synthetic native voice path (live capture frames and VAD, local ASR route, end-of-turn scorer, local TTS segments and playback events, `heard` route validation) | Verdict: MERGE into `test/browser/harness/voice.ts` (on the shared bridge harness)
- Covers: nothing itself; gives voice specs `window.live` controls (`frames`, `finals`, `finishPlayback`, `holdNextReply`, `eot`, `noCanceller`) and records captures, stops, routes, spoken text, plays and forbidden calls. Duplicates: `voice-fixture.ts`, `cloud-voice-fixture.ts` (other voice fakes), stream-chunk rewriting duplicates logic in `flag-off-android.ts`. Callers/importers: `voice-assistant.production.spec.ts`, `chat-dictation-api.spec.ts`, `listener-invocation.production.spec.ts`, `voice-stop-speaking.spec.ts` (rg over `test`). Survives: all four importers are KEEP/MERGE candidates.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 14, 32-33 | P3 / D2-like | Wraps `Capacitor.nativePromise`, `nativeCallback` and `flagOff.emit` over the base fake (a monkey-patch chain on the test bridge); the order of `flagOffAndroid` then this init script matters. | Register voice handlers in the typed harness bridge instead of wrapping. | Low |
| 2 | 17-20 | C4 | Rewrites `done` SSE chunks to add `messageId`/`userMessageId` because "the generic chat fixture omits them". | Make the base resident stream emit correlated ids; delete the rewrite. | None |
| 3 | 41-48 | — | Validates the `heard` body shape exactly as the pinned upstream route does and records violations in `forbidden`. Useful contract check at the boundary. | Keep. | None |
| 4 | 65 | — | Unknown `AlphaVoiceCloud` methods throw and are recorded: the right default (contrast `telephony-fixture.ts`). | Keep as the harness default. | None |
| 5 | 11 | — | Deletes the `cloud:production` slot to force the local route. | Harness option `cloudAccount:false`. | None |

## Proposed end state
`harness/voice.ts` exports a `voice` fixture option for the shared `test.extend`: `{echoCancelled, eot, holdNextReply}` plus typed accessors for captures, routes, spoken, heard and forbidden. It composes handlers on the harness bridge instead of wrapping `nativePromise`, and the base resident stream carries message ids. Delete this file when the four importers move.
