# specs/quint/native/SpeechCleanupLatch.qnt
- Lines: 114 | Kind: Quint model (live) | Verdict: KEEP; harness PORT
- Covers: the four owned-speech retirement chains (voice surface, read aloud, app speech, Cloud app speech): a successor waits for cleanup, an unconfirmed cleanup latches its chain, app/Cloud chains make one native stop and reopen only on a confirmed stop, voice/reading stay closed until restart, Transcribe entry names the unconfirmed media. Duplicates: none (`RendererSpeechChunk` is the chunk below it). Callers/importers: manifest (14 `symbols` over `voice-adapter.ts`, `prototype/local-speech-playback.ts`, `app-speech.ts`, `cloud-voice.ts`, `local-speech-playback.ts`); `refinement/native/speech-cleanup-latch.mjs` via `forward-replays.mjs:7,18`; `application/manifest.json` reference; per-model wrapper `test/quint-speech-cleanup-latch.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 29-41 | T10 / T2 | `compile()` reads `local-speech-playback.ts` and slices from `'export async function confirmSpeechRetirement'` to EOF; reads `cloud-voice.ts` and slices between `'export function cloudVoiceServiceLimit('` and `'/** Product registration only'`, plus from `'let appSpeechRetirement:Promise<void>=Promise.resolve();'` to EOF; regex-strips imports/exports; evals in `vm` with ~20 hand-written globals (`connectionController`, `speechRoute`, `cloudRuntimeEnabled`, `developmentCloudVoiceEnabled`, …). Most fragile harness in this chunk; any edit to `cloud-voice.ts` comments breaks it. | PORT: esbuild-bundle `runtime/app-speech.ts` (`speakAppText`) and `runtime/cloud-voice.ts` (`speakCloudText`, already exported at line 159) with an alias plugin mapping `connection-ui`, `voice-selection`, `platform-plugins`, `@capacitor/core` and the build flags to port modules. Restart = re-import a fresh bundle. | medium (cloud-voice has a wide import graph) |
| 2 | harness 17 | C3 | Uses `test/support/strip-types.mjs`; sibling harness uses `test/fixtures/ts-source.mjs`. | Gone with the port. | none |
| 3 | 1-5, harness 7-12 | — | Only `app` and `cloud` chains are replayed; `voice`/`reading`/Transcribe entry are projected away. Model claims four chains; the header should say which two are refined. | Add one line to the header. | none |
| 4 | manifest symbols | T10 | 14 symbol pins incl. `MEDIA_UNCONFIRMED_NOTICE`, `stopVoiceConversation`, `retainSpeechRetirement`. Stage F renames/moves `local-speech-playback.ts` (cross-file-actions line 819). | Pin files only. | low |
| 5 | forward-replays.mjs:42 + wrapper | B5 / T4 | Count `SpeechCleanupLatch: 96`; wrapper re-runs it. | One runner, `> 0`. | low |

## Proposed end state
Model unchanged except a header line. Harness imports the two real chain modules through esbuild with explicit port
modules instead of slicing three text ranges; it then survives the Stage F voice-folder move. Behaviour covered:
speech retirement after unconfirmed native cleanup (no other test covers the latch end to end).
