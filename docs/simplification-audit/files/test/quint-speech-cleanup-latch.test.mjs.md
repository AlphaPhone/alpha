# test/quint-speech-cleanup-latch.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: App speech and Cloud app speech follow every SpeechCleanupLatch trace with the real retirement gate (`native/speech-cleanup-latch.mjs` over `local-speech-playback.ts`, `runtime/app-speech.ts`, `runtime/cloud-voice.ts`). Duplicates: `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 96, checkpoints > 2500). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10 | Driver vm-evaluates speech modules with stripped imports (3 vm sites, 2 anchors). | PORT to `sourceModule`. | Medium |

## Proposed end state
- Runner row.
