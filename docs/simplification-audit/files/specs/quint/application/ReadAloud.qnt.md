# specs/quint/application/ReadAloud.qnt
- Lines: 89 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Message Listen vs note read-aloud replace each other; new audio waits for the old to stop; only a reading that played to the end reports finished. Duplicates: none in Quint. Behaviour also exercised by `test/local-speech-playback.test.mjs`, `test/read-aloud-direct.test.mjs`, `test/browser/note-read-aloud.spec.ts` (not trace-linked). Callers/importers: manifest entry only (9 symbol pins in `prototype/local-speech-playback.ts`, `voice-adapter.ts`); README row. No refinement harness, no test imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | T10 | Tied to code only by 9 word-bounded symbol pins (`cancelCurrent`, `stopSpeaking`...). Nothing executes the real `installLocalSpeechPlayback` against the model's traces, so the model can drift silently. | Drop symbol pins (pin the two files). Optional later: a bundled-import harness like `reminder-refresh.mjs` (needs `local-speech-playback.ts` to export its controller factory, not only `installLocalSpeechPlayback(Component)`). | L |
| 2 | 62,86-87 | - | `lostContextStopsMessageTest` expects `stops == 1` from a reading that never played; fine, but `StopsNeedStarts` (s.stops <= s.starts) is the only bound on counters. | None. | - |

## Proposed end state
- Keep the model as is; it models live code (`local-speech-playback.ts` is production).
- Manifest: replace `symbols` with file pins once T10 pin removal lands (`quint-lib.ts:238-244`).
- When the Stage F rename of the two `local-speech-playback.ts` files (D11) happens, update `sources`.
- Coverage gap to note: no refinement evidence; journey `journeys/voice.spec.ts` (read a note aloud, tap Listen on a message) is the behavioural backstop.
