# test/browser/native-speech.production.spec.ts
- Lines: 99 | Kind: Playwright spec, production project, 7 tests; UI-driven chat voice on a fake native speech bridge, plus fiber walks, a legacy-Notes path and one source transplant | Verdict: MERGE into `journeys/voice.spec.ts` (production project); delete the Maps and legacy-Notes cases
- Covers: in the flag-off production bundle, Talk captures, transcribes and replies on-device with no Cloud route; unavailable local speech falls back to keyboard; Stop during transcription refuses a late transcript; one mic, no Transcribe launcher; offline still captures and refuses network inference. Duplicates: Maps case duplicates `dev-maps-voice.spec.ts` (9 tests on the real Maps UI); Notes read-aloud cases overlap `note-read-aloud.spec.ts`. Callers/importers: none; imports `helpers/native-notes.ts` (legacy Notes), `flag-off-android.ts`, `native-speech-fixture.ts`, `../support/strip-types.mjs` (Maps case only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61-74 | T2 | Maps case reads `.eliza/client-features/.../navigation-voice.ts` and `apps/app/src/maps/navigation-voice.ts` as text, strips imports and types, and evals them with stubs. Inside the production lane it never touches the bundle. | Delete. `dev-maps-voice.spec.ts` drives the real guidance. | None |
| 2 | 31-40, 57-59, 93-97 | T6, A1 | `noteSpeech` walks the React fiber to call `notes.ed.readAloud()`, and `openRetainedNativeNotes` seeds and selects legacy "Previous notes" (D1). | Delete the Notes test (57-59) and the Notes half of the offline test (93-97). Canonical read-aloud is asked of Alpha; cover it in the voice journey by asking in chat if the owner keeps it (see chunk questions). | Coverage: offline on-device read-aloud |
| 3 | 10-19, 50, 90 | T6 | `retainedVoiceTranscript` reads `renderVals().chatRecorder` through the fiber to assert the failure text and retained transcript. | Assert visible copy (status/alert text) and, for the retained transcript, the visible recovery affordance. Drop the fiber walk. | Low |
| 4 | 23-26 | T8 | `utterance` polls the fixture's sample log twice to pace synthetic speech. | Move into `native-speech-fixture` as `speak(page)`; keep it there once. | None |
| 5 | 44-46 | A8 | "Issue #395" comment; asserts internal stage names and a turn id. | Keep the turn-linking assertion if the owner wants it; drop the issue reference. | Low |
| 6 | 28, every test | ok | `noCloud` asserts no foreign request and no forbidden Cloud call. | Becomes a fixture-level `afterEach` guard in the voice journey. | None |

## Proposed end state
Five steps in `journeys/voice.spec.ts` run by the production project: local round trip (Talk, transcribe, reply, Stop), local-unavailable keyboard fallback, Stop refuses late transcript, single mic control, offline capture with refused inference. Network fence as a fixture guard. No fiber walks, no transcript of Maps source, no legacy Notes.
