# test/quint-changed-models.test.mjs
- Lines: 31 | Kind: tooling unit (pure functions `selectChangedModels`, `proofPhases`, `importedModelPaths` of `scripts/ci/check-changed-models.ts`) | Verdict: KEEP → MERGE into `test/tooling/quint.test.mjs` (follows the script into `scripts/check-quint.ts --changed-since`)
- Covers: a change to a model, a source it consumes, `upstream.lock.json`, a manifest entry, the checker, or an imported model selects exactly the owning proofs (incl. transitive composition owners). Duplicates: none. Callers/importers: `npm test` glob only; `scripts/ci/check-changed-models.ts` backs `npm run quint:changed`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-31 | keep | Selection is what lets CI skip unaffected proofs (pipeline goal P1). Small, deterministic, no I/O. | Keep the four cases. | Low |
| 2 | 20-25 | P2 | Asserts `proofPhases` includes `compare` for `expectedViolations`/`currentTemporalChecks`; `compare` is tied to historical-model comparison (`specs/quint/legacy`, P6). | Drop those two assertions when the legacy family and `compare` phase retire. | Low |
| 3 | all | — | Scripts review merges `check-changed-models.ts` into `check-quint.ts`. | Re-point imports when that lands. | Low |

## Proposed end state
Four selection cases in `test/tooling/quint.test.mjs`, importing from wherever the selection function lives after the merge.
