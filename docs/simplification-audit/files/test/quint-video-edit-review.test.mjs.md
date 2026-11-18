# test/quint-video-edit-review.test.mjs
- Lines: 20 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Mounted video editor follows every VideoEditReview step (`native/video-edit-review.mjs` over `prototype/video-edit-review.ts`). Duplicates: `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`) (same 600 traces, same action list at `forward-replays.mjs:52`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 600, steps > 3000, 12 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` via `specs/quint/refinement/native/forward-replays.mjs` (imported by `native/index.mjs:69`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 13-20 | T10 | Two canaries rewrite literal product text (`loaded=false;video.pause();updateControls();`, the save line). | Drop from the PR lane. | Low |

## Proposed end state
- Runner row.
