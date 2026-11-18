# test/browser/cloud-voice-fixture.ts
- Lines: 33 | Kind: Playwright fixture/helper | Verdict: **MERGE** into `harness/plugins/voice.ts` (with `cloud-notes-voice-fixture.ts`)
- Covers: installs a closed Cloud account (`connectionController.getCloudEnvironment/getCloudClient`) and replaces `BrowserVoice.prototype.transcribeRecording` and, optionally, `synthesize/play/stopPlayback` so speech stays in the page. Duplicates: `cloud-notes-voice-fixture.ts:26-39` (same overrides with more knobs), `generic-cloud-speech-fixture.ts`, `voice-fixture.ts` (research P18: seven voice fixtures). Callers/importers (9): `dev-sensors`, `dev-workflow-concurrency`, `journey-a-conversation`, `journey-b-voice-note-actions`, `notes-audio-journey`, `speak-replies`, `voice-levels`, `voice-save-ownership`, `workflow-presentation-execution` (all `.spec.ts`). Survives: yes, most importers are kept journeys.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | P2 | Overrides `connectionController` methods to fake a signed-in Cloud account. | Harness `cloud.signedIn()` at the bridge/secure-store boundary. | Medium: 9 specs. |
| 2 | 13-31 | P3 | Patches four `BrowserVoice.prototype` methods. | Typed `AlphaVoiceCloud` handler in `harness/bridge.ts`. | Medium. |
| 3 | 23, 29 | D10 / P12 | Writes into `window.speechFixture`, which another fixture (`voice-fixture.ts`) owns; the coupling is implicit and throws if that fixture is absent (`w.speechFixture.current=`). | One typed `__alphaTest.voice` recorder owned by the voice harness. | Low. |
| 4 | 14, 20 | B3 | Each stub re-checks the account binding it was just given. | Keep one assertion in the harness (the binding is the thing under test for account changes). | none |

## Proposed end state
Delete this file. `harness/plugins/voice.ts` exports `voice.cloud({transcript, queueSpeech})` built on the typed bridge, shared by Notes, chat-voice and workflow journeys; the seven voice fixtures collapse into it.
