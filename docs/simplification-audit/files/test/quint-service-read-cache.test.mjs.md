# test/quint-service-read-cache.test.mjs
- Lines: 6 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Real read cache and store binding follow model scenarios and random walks; a document keeps its newest entries within the entry bound (`services/service-read-cache-replay.mjs` over `runtime/service-read-cache-store.ts`). Duplicates: `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`) (ServiceReadCache via `runServiceReadCacheReplay`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (none here; the case functions assert). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 2-6 | indirection | The test body lives in exported `runServiceReadCacheCaseN` functions in the spec harness: the test file is three pointers. | One runner row; case 3 (entry bound) becomes a scenario in the model or is dropped. | Low |

## Proposed end state
- Runner row.
