# test/browser/browser-speech.spec.ts
- Lines: 101 | Kind: Playwright, chromium, 9 tests + 2 loops (16 runs); tests 1-2 module-in-page, tests 3+ real Notes recorder UI over `cloud-notes-voice-fixture` | Verdict: MERGE into `journeys/notes.spec.ts` (recorder cases) and DELETE tests 1-2
- Covers: (1-2) `BrowserVoice` local-speech status/transcription without/with a developer local agent; (3+) Notes voice recorder saves playable audio without upload, sign-in or transcription, handles mic denial, transcription failure codes, discard confirmation, and account change during save. Duplicates: recorder save/playback also in `notes-audio-journey.spec.ts`, `canonical-notes.spec.ts`, `journey-b-voice-note-actions.spec.ts`, `voice-preparation-ownership.spec.ts`; local-agent-required copy also asserted via `voice-fixture.ts`. Callers/importers: chromium only; imports `cloud-notes-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-53 | T6 / P3 | Tests 1-2 construct `new BrowserVoice()`, overwrite `connectionController.getBrowserSpeechAgent`, poke `(voice as any).capture.clips` and call `transcribeLocalRecording`. `getBrowserSpeechAgent` is the developer resident-in-browser route (`connection-ui.tsx:2523`), not a product path. | Delete. The "no wasm/worker loaded" guarantee belongs in `audit-production-bundle` (no speech engine in the bundle). | Low |
| 2 | 82-86 | T4 | Six failure codes each run a full app boot for the same assertion (audio saved, no upload). | One or two representative codes. | None |
| 3 | 96 | P2 | Account switch simulated by `connectionController.close()` from an in-page import. | Harness `connection.switchOwner()` or drive Settings sign-out. | Low |
| 4 | 59, 68, 73, 80, 85, 90, 100 | T7 | `uploads` counter and `noPhysicalOrLocalVoice` repeated in every test. | `afterEach` assertion in the journey. | None |

## Proposed end state
In `journeys/notes.spec.ts` (voice-note section): record → Stop → playable note, no upload, no sign-in prompt; mic denial opens Access review and retry records; one transcription failure still saves audio; Discard needs confirmation; save held across account change saves nothing under the new owner. Global `afterEach` checks zero uploads and no foreign requests. Delete the two `BrowserVoice` module cases and this file.
