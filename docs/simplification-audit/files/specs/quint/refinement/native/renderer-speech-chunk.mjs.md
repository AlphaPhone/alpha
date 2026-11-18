# specs/quint/refinement/native/renderer-speech-chunk.mjs
- Lines: 132 | Kind: Quint MBT replay over a source transplant (regex-stripped TypeScript evaluated in `vm`) | Verdict: PORT
- Covers: `playOwnedSpeech`/`speakChunk` in `apps/app/src/local-speech-playback.ts`: listener registration, prepare/play busy retry (100 ms), abort during prepare stops late playback, strict vs bounded cleanup (500 ms), terminal events while waiting for the speaker, unqueued busy failure. Model `RendererSpeechChunk`. Duplicates: none. Callers/importers: `native/forward-replays.mjs:8`, `test/quint-renderer-speech-chunk.test.mjs`.

Product text read: `apps/app/src/local-speech-playback.ts` (line 44). Regexes: `/^import .*;\n/gm` (drops imports) and `/^export /gm`; then `stripTypeScriptTypes(…, {mode:'strip'})` from `test/fixtures/ts-source.mjs`. Stubbed globals: `Capacitor`, `registerPlugin`, `planLocalSpeech`, `nativeVoiceTurnId`, `setTimeout`, `clearTimeout`, `AbortController`, `DOMException`, `crypto`, `console`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-46, 64-68 | T2/T10 | Transplant: imports are deleted and replaced by sandbox globals. A multi-line import, a re-export, or moving the file (two `local-speech-playback.ts` exist, D11) breaks it; a changed import is silently replaced by the stub. | Load the real module with `loadBrowserModule('apps/app/src/local-speech-playback.ts')` as `native-stream-bridge.mjs` does. `playOwnedSpeech` is already exported and takes the plugin as an argument, so no product change is needed for the plugin port. | Medium |
| 2 | 64-66 | — | The driver needs control of the 100 ms retry and 500 ms cleanup timers, which the module reads from globals. | During replay install the fake `setTimeout`/`clearTimeout` on `globalThis` (restore in `close`), or use `node:test` mock timers. No product export needed. | Low |
| 3 | 23-24 | C3 | `flush`, `gate` redefined. | Shared helpers. | None |

## Proposed end state
~110 lines: same driver and projection, module loaded through esbuild, timers injected via globals; no regex over product source and no `stripTypeScriptTypes` dependency.
