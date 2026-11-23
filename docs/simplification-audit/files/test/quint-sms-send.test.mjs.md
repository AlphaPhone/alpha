# test/quint-sms-send.test.mjs
- Lines: 5 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Messages adapter follows SmsSend scenarios/witnesses/random walks; accepted-empty and retired-uncertain SMS cannot dispatch (`services/sms-send-replay.mjs`). Duplicates: `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`) (SmsSend). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (asserted inside the case functions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 5 | carry | Case 2 is a hand scenario (empty SMS, retired uncertain SMS, fresh identity): the only non-replay check. | Turn it into model scenarios if they are not; keep in the runner row. | Low |

## Proposed end state
- Runner row.
