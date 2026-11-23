# test/quint-room-handler-queue.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (legacy/core, upstream code) | Verdict: DELETE (with `specs/quint/legacy`, P6)
- Covers: Upstream `vendor/eliza/packages/core/src/runtime/room-handler-queue.ts` follows two translated TLA+ profiles (`specs/quint/legacy/core/check-room-handler-queue-refinement.mjs`). Duplicates: `scripts/check-quint-refinement.ts` legacy family via `specs/quint/refinement/legacy/index.mjs`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | P6/T5 | Models upstream-only code via a historical TLA+ conversion. No alphaphone source is involved; the bundle is built from the vendor checkout plus `scripts/core-state-patch.ts`. | Delete with `specs/quint/legacy/core`. Upstream owns this behaviour (D14 follow-up if the model is worth keeping upstream). | Low |
| 2 | 8-11 | T4 | Pins `[true,5,90]` and `[true,1,22]` exact counts. | – | Low |

## Proposed end state
- Gone. Listed as an upstream follow-up.
