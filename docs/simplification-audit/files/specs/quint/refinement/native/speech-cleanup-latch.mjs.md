# specs/quint/refinement/native/speech-cleanup-latch.mjs
- Lines: 123 | Kind: Quint trace replay over a **source transplant** (T2/T10) | Verdict: PORT
- Covers: model `SpeechCleanupLatch` (live) — app speech and Cloud app speech chains latch after unconfirmed native cleanup, refuse successors, recover after a confirmed stop, ask for restart after a refused stop. Duplicates: `test/quint-speech-cleanup-latch.test.mjs` and `forward-replays.mjs` (registered `SpeechCleanupLatch`, owning bound 96 traces) run the same replay (T4). Callers/importers: `forward-replays.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-41 | T2/T10 | Reads `apps/app/src/local-speech-playback.ts` from `'export async function confirmSpeechRetirement'` to EOF; `apps/app/src/runtime/cloud-voice.ts` between `'export function cloudVoiceServiceLimit('` and `'/** Product registration only'`, and from `'let appSpeechRetirement:Promise<void>=Promise.resolve();'` to EOF; reads all of `runtime/app-speech.ts`; strips `^import`/`^export` lines and TS types (`test/support/strip-types.mjs`) and evaluates in `vm`. Anchors exist today; any reorder of `cloud-voice.ts` breaks it, and the Prettier commit (D9) will. | Use `loadProductModule` (`refinement/application/notes-files-media-itf.mjs`, esbuild bundle with stubs) on `runtime/app-speech.ts` and on `runtime/cloud-voice.ts`. Both entry points are already exported (`speakAppText` l.12, `speakCloudText` l.159). Stubs: `./connection-ui`, `../platform-plugins` (`registerPlugin` → stopPlayback port), `./local-voice`, `./voice-selection`, `../build-flags`, `./cloud-voice` (for the app chain), the `.eliza/.../tts-playback-activity.ts` import, `./cloud-voice-limit`, `./subscription-entitlement`, `./cloud-protocol`, `./development-*`, `./browser-cloud-resident`, `@capacitor/core`. `confirmSpeechRetirement` comes from the real `local-speech-playback.ts`. | M |
| 2 | 52-62 | – | The vm `box` re-declares the module's imported names as globals; with bundling these become the stub map above. | Replace. | – |
| 3 | 27-28 | T8 | `flush` = 4 `setImmediate` turns: a fixed settle count. Acceptable for a deterministic in-process replay. | Keep. | L |
| 4 | – | D11 | Renderer model replay filed under `refinement/native`. | Leave unless the families are regrouped. | – |

## Proposed end state
Same driver and projection; `compile()` becomes two `loadProductModule` calls with stub maps; no `strip-types`, no
`vm`. Run once (forward-replays); delete the per-model test.
