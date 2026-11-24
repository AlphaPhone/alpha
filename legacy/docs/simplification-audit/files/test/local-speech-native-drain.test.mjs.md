# test/local-speech-native-drain.test.mjs
- Lines: 42 | Kind: transplant (type-strips `apps/app/src/local-speech-playback.ts`, imports deleted by regex, `vm` with fake `registerPlugin`) | Verdict: DELETE
- Covers: stop-then-start waits for the cancelled native synthesis to unwind (native gate refuses a second request until then), for both `strictDrain` values; queued speech asks not to replace current playback. Duplicates: `specs/quint/refinement/native/renderer-speech-chunk.mjs` replays the RendererSpeechChunk model (cancel, drain, late handle) against the same source; `test/local-conversation-cleanup.test.mjs` covers the strict drain through `local-voice.ts`. Callers/importers: `npm test` glob; one of 5 importers of `test/fixtures/ts-source.mjs` (a twin of `test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-24 | T2 | Regex import deletion + `vm`. | Delete. | Low |
| 2 | 27-37 | T4, T8 | Real 300 ms wait asserted with `Date.now()-started>=250`: timing-dependent; duplicate of the model replay. | Delete. | Low |
| 3 | 38-42 | T3 | `replace:false` flag forwarded for queued speech: a one-line forward. | Delete. | Low |
| 4 | 4 | C7 | Uses `test/fixtures/ts-source.mjs` while siblings use `test/support/strip-types.mjs` or `node:module`'s `stripTypeScriptTypes`: three ways to strip types. | Delete with the transplant tests; both helpers go when their last importer goes. | Low |

## Proposed end state
File deleted; RendererSpeechChunk Quint replay is the coverage.
