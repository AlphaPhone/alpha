# specs/quint/native/RendererSpeechChunk.qnt
- Lines: 108 | Kind: Quint model (live) | Verdict: KEEP; harness PORT
- Covers: one owned speech chunk in the renderer (`playOwnedSpeech`/`speakChunk` in `apps/app/src/local-speech-playback.ts`): listeners registered before synthesis, busy-speaker retry for queued speech, abort during prepare stops late playback, one terminal outcome, dispose always runs, strict vs bounded cleanup. Duplicates: none at model level (`SpeechCleanupLatch` models the chain above it). Callers/importers: manifest (7 `symbols`); `refinement/native/renderer-speech-chunk.mjs` via `forward-replays.mjs:8,20`; per-model wrapper `test/quint-renderer-speech-chunk.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 43-46 | T10 / T2 | `compile()` reads `apps/app/src/local-speech-playback.ts` as text, regex-strips `^import` and `^export`, strips types with `test/fixtures/ts-source.mjs` and evaluates it in `vm` with fake `Capacitor`, `registerPlugin`, `planLocalSpeech`, `nativeVoiceTurnId`. Any import change or reformat breaks it. | PORT: esbuild-bundle `apps/app/src/local-speech-playback.ts` (it already exports `playOwnedSpeech`, which takes `voice` as a parameter) with a plugin that maps `@capacitor/core`, `./platform-plugins`, `./runtime/voice-timing` to port modules; run the bundle in the same `vm` box so `setTimeout`/`clearTimeout` stay controlled. Same shape as `refinement/native/telephony.mjs:12-21`. | low |
| 2 | manifest `symbols` | T10 | Seven symbol pins (`speakChunk`, `dispose`, `strictDrain`, `preparation`…) are regex-checked against the file. Stage F plans to move the file to `runtime/voice/native-speech-playback.ts` (cross-file-actions §1, line 819). | Pin the file only; the harness import proves the symbols exist. | low |
| 3 | harness imports | C3 | This harness uses `test/fixtures/ts-source.mjs#stripTypeScriptTypes`; the sibling `speech-cleanup-latch.mjs` uses `test/support/strip-types.mjs`. Two helpers for one job, both disappear with the port. | Delete with the port. | none |
| 4 | forward-replays.mjs:42 + test wrapper | B5 / T4 | Exact count `RendererSpeechChunk: 92` asserted in two places; the wrapper re-runs the aggregate's campaign. | One runner; assert `> 0`. | low |
| 5 | 82 (`listeningSetup`) | — | Shared prefix run, fine. | none | — |

## Proposed end state
Model unchanged. Harness imports the real module through esbuild with three port modules instead of evaluating a
regex-edited copy. Manifest pins the path only. Runs once in the native aggregate. Behaviour covered: renderer
speech chunk lifecycle (a voice and read-aloud path every turn uses).
