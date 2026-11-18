# test/browser/cloud-notes-voice-fixture.ts
- Lines: 56 | Kind: Playwright fixture/helper (closed Cloud voice + Notes recorder stand-in) | Verdict: **MERGE** into `harness/plugins/voice.ts` (with `cloud-voice-fixture.ts`)
- Covers: nothing by itself; installs a closed Cloud account and replaces `BrowserVoice`/`BrowserAudioCapture` methods so voice specs never touch a microphone, speaker or provider. Duplicates: `cloud-voice-fixture.ts` (same `connectionController.getCloudEnvironment/getCloudClient` override and `BrowserVoice.prototype.transcribeRecording/synthesize/play/stopPlayback` patches), plus the other 5 voice fixtures listed in research P18. Callers/importers (5): `browser-speech.spec.ts`, `dev-connected-voice.spec.ts`, `responsive-surfaces.spec.ts`, `voice-owned-navigation.spec.ts`, `voice-preparation-ownership.spec.ts`. Exports used: `cloudNotesVoiceFixture` 5, `noPhysicalOrLocalVoice` 5, `notesRecorder`/`openNotesRecorder`/`recordAndFinish` 3, `savedVoiceNotes` 2.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-47 | P3 / T6 | Replaces 13 product methods on `BrowserVoice.prototype` and `BrowserAudioCapture.prototype` inside the page. A rename silently disables the fault injection. | Fake at the plugin boundary: a typed `AlphaVoiceCloud` handler in `harness/bridge.ts` that records starts/stops/uploads and answers transcripts. | Medium: the voice specs that depend on hold/billing/failure knobs must be ported together. |
| 2 | 36 | A3 | `transcribePairedRecording` stub for the paired-agent voice path, which is deleted (C4/D5, `runtime/paired-voice.ts`). | Drop with C4. | none |
| 3 | 52 | A1 | `openNotesRecorder` opens Notes through `openLegacyNotes` ("Previous notes"), a legacy source deleted under D1. | Open the canonical Notes view through `nav.openApp('Notes')`. | Medium: 3 importers break when the legacy source goes. |
| 4 | 55 | P2 | `savedVoiceNotes` reads `browser-notes-document.readBrowserNotesRaw()` through an in-page import. | Assert the saved voice note in the Notes list (visible row), or through the bridge's notes store. | Low. |
| 5 | 8-18 | P13 / C3 | Sign-in-status route stub, foreign-request fence, offline selection seed and permission-walkthrough seed are copied inline; the same `__alpha-browser-cloud` stub is in `compact-viewport.spec.ts:68-74`. | Harness `app()` auto-fixture. | none |
| 6 | 19 | P12 | Fixture state lives on `window.cloudNotesVoice` with ~25 untyped fields; `release` vs `releaseSave` naming. | `window.__alphaTest.voice` typed recorder. | none |
| 7 | 2 | — | `dev-connected-voice.spec.ts` (one importer) is a paired/connected-voice spec likely deleted with C4; the other 4 importers survive. | The helper survives in merged form. | none |

## Proposed end state
Delete this file. `harness/plugins/voice.ts` exports one `voice` fixture (`voice.cloud({transcript, hold, failure})`, `voice.counts()`, `voice.release()`), built on the typed bridge, used by the voice and Notes-recording journeys. `notesRecorder`/`recordAndFinish` move to `harness/nav.ts` as visible-control helpers over canonical Notes.
