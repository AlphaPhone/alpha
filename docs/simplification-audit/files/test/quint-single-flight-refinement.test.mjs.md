# test/quint-single-flight-refinement.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper (legacy/core, upstream code) | Verdict: DELETE (with `specs/quint/legacy`, P6)
- Covers: Upstream AgentRuntime room-read memo shares reads and fences invalidated results (`specs/quint/legacy/core/check-single-flight-refinement.mjs`, `refinement/services/core-runtime/module.mjs`). Duplicates: `scripts/check-quint-refinement.ts` legacy family via `specs/quint/refinement/legacy/index.mjs`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; the harness hard-codes this test path as a driver source (`check-single-flight-refinement.mjs:149`) and `specs/quint/legacy/core/README.md:98` names it..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-14 | P6/T5 | Models upstream-only `vendor/eliza/packages/core` behaviour. | Delete together with the harness (the harness breaks without this path otherwise). | Low |

## Proposed end state
- Gone with legacy/core; upstream follow-up.
