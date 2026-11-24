# test/quint-refinement-harness.test.mjs
- Lines: 170 | Kind: tooling (tests `specs/quint/refinement/check-traces.mjs`) | Verdict: KEEP, MERGE into `test/quint/tooling.test.mjs`
- Covers: The shared refinement checker: Quint literal encoding, input-hash binding (model, manifest, source changes refused), divergent observation rejected, safety-invariant failure, tool-exit vs mismatch, generated-input snapshots. Duplicates: none; this is the only proof that the checker can fail. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-170 | keep | Real checker against the real Quint CLI with synthetic traces. It gates every refinement receipt, so it is release-relevant tooling. | Carry all six cases into `test/quint/tooling.test.mjs`. | Low |
| 2 | 54-76, 78-90 | T10 note | Uses live models `VadSegmentation`, `ApplicationComposition`, `DevelopmentHost` as canaries; if one of those models is deleted or renamed the tooling test breaks. | Point the canaries at a fixture model under `test/fixtures/quint/` (data only), so model churn cannot break checker tests. | Low |
| 3 | 144-165 | side effect | Writes a snapshot into `test-results/quint-refinement/input-snapshots` in the repo and deletes it in `finally`. | Acceptable; keep the cleanup. | Low |
| 4 | 99 | flake | Mutates `process.env.NODE_OPTIONS` for the process; safe only because node:test runs each file in its own process. | Keep it in its own `test()` and restore in `finally` (already done); do not merge into a file that runs tests concurrently in-process. | Low |

## Proposed end state
- Lives in `test/quint/tooling.test.mjs` with model-state and source-bundle cases.
- Canary models come from fixtures, not live product models.
