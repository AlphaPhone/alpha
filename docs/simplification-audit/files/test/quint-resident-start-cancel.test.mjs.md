# test/quint-resident-start-cancel.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: AlphaLocalAgentPlugin start, cancel, stop and shutdown recheck match every ResidentStartCancel step (host JVM). Duplicates: `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 76, steps > 1000, reached 11). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |

## Proposed end state
- Runner row.
