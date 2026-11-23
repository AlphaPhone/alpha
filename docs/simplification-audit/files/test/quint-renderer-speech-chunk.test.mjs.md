# test/quint-renderer-speech-chunk.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: `playOwnedSpeech` over a synthetic voice plugin follows every RendererSpeechChunk trace (`native/renderer-speech-chunk.mjs`). Duplicates: `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-12 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 92, checkpoints > 2000, 10 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver:44 | T10 | Driver regex-strips imports/exports from `apps/app/src/local-speech-playback.ts` and evaluates it in a vm (ci-and-formal §2.6). | PORT: import `local-speech-playback.ts` through `sourceModule` with the voice plugin as a stubbed specifier. | Medium |

## Proposed end state
- Runner row; driver imports the module.
