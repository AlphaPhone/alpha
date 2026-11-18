# test/quint-runtime-update-pause-refinement.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Durable native update pause and exact wrapper refine real JVM readback (`native/runtime-update-pause.mjs` over upstream `ElizaAgentService.java` and `plugin-native-agent`). Duplicates: `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces + skipped = 12, checkpoints 106). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10 | Driver anchors six text positions in upstream Java (`indexOf`). | PORT where possible; upstream Java cannot be changed here (D14), so compile the class and call it. | Medium |

## Proposed end state
- Runner row.
