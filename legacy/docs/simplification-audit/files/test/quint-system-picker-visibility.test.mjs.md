# test/quint-system-picker-visibility.test.mjs
- Lines: 18 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: System picker counter (`prototype/scan-pdf.ts`) and the owned file picker (`browser/file-picker.ts`) follow every SystemPickerVisibility step. Duplicates: `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 300, steps > 3000, 6 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 11-18 | T10 | Two canaries rewrite product text (`current?.abort();const controller`, `finally{systemPickers--;}`): they break on any reformat. | Drop from the PR lane. | Low |

## Proposed end state
- Runner row.
