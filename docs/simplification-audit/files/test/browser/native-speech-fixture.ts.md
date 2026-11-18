# test/browser/native-speech-fixture.ts
- Lines: 50 | Kind: Playwright support fixture (Android `AlphaVoiceCloud` local speech fake on top of `flagOffAndroid`) | Verdict: **KEEP + MOVE** to `harness/voice-native.ts`
- Covers: fakes on-device capture, metrics, local transcription (with hold), local synthesis/playback, cancel and voice-turn marking; patches the flag-off stream emitter to add durable message IDs; optional offline network status. Importers (grep over `test`, `scripts`, `specs`): `test/browser/native-speech.production.spec.ts`, `test/browser/chat-dictation-api.spec.ts`. Both are voice journeys that survive, so the fixture survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 13, 17-23 | D3 | Reaches into `window.flagOff` internals (`slots`, `persist`, `emit`) of `flag-off-android.ts`. | Give the bridge harness explicit options (`signedOut`, `streamDoneIds`) instead of mutating its internals. | Low |
| 2 | 17-23 | — | Rewrites the provider stream's `done` chunk to add message IDs that "the generic text-chat fixture omits". | Make the generic fixture emit the IDs; delete the rewrite. | Low |
| 3 | 40 | A8 | "Issue #395" reference in a comment. | Drop the issue number; keep the explanation. | none |
| 4 | 27, 29-48 | C4 | One of several speech fakes (`cloud-voice-fixture.ts`, `generic-cloud-speech-fixture.ts`, `cloud-notes-voice-fixture.ts`). | Put the voice fakes in one `harness/voice.ts` with local/Cloud presets. | Low |

## Proposed end state
`harness/voice.ts` exports `nativeLocalSpeech(page, {offline})` built on the typed bridge harness without poking
`flagOff` internals. The two voice specs import it. The stream ID rewrite moves into the generic chat fixture.
