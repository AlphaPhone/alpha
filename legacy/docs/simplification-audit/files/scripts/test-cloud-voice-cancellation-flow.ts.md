# scripts/test-cloud-voice-cancellation-flow.ts
- Lines: 44 | Kind: source transplant (`test/fixtures/cloud-voice-view.mjs` strips and `vm`-runs renderer files and upstream `cloud-speech-chunks.ts`) with a fake clock | Verdict: DELETE; REWRITE two cases into `test/browser/journeys/voice.spec.ts`
- Covers: Notes read-aloud over Cloud speech: Stop retires exactly that playback, a new voice capture waits for the old speaker's confirmed retirement, a retired owner's callbacks cannot settle new playback, a held listener is removed after abort, a late synthesis after cancel is stopped by id. Duplicates: `test/browser/note-read-aloud.spec.ts`, `test/cloud-voice-profile.test.mjs`, `test/browser/native-speech.production.spec.ts`. Callers/importers: `test/adapter-contracts.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-8 | T2 | Whole view evaluated as transplanted text with `box.React={createElement:()=>null}` and `VoiceActivity` stubbed. | Delete. | L |
| 2 | 19 | A8 | Assertion message refers to "the old500ms timeout" (history). | Gone. | L |
| 3 | 24-43 | T3 | Owner-change, held-listener and late-synthesis cases poke `f.driver` internals; they are cloud-voice driver behaviour, not UI. | If kept, port to an integration test that imports `cloud-voice.ts` with the typed `AlphaVoiceCloud` fake (after Stage F makes it Node-importable). | M |

## Proposed end state
Journey cases: (a) Read aloud, Stop, then start voice: capture starts only after the bridge confirms playback stop; (b) cancel during synthesis: late playback id is stopped and nothing plays. Script deleted; `cloud-voice-view.mjs` loses an importer.
