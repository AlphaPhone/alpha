# test/quint-shared-recording.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Shared recording bridge fences permission epochs and cancellation barriers (`native/shared-recording.mjs`, patched upstream `plugin-local-inference`). Duplicates: `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (trace count, 3 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 5 | cost | 360 s budget. | Runner timeout. | Low |

## Proposed end state
- Runner row.
