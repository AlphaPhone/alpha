# specs/quint/services/PreparedWorkflowWorker.qnt
- Lines: 68 | Kind: Quint model of build tooling (services family, live; 6 tests) | Verdict: KEEP (D11); path-gate
- Covers: `scripts/prepared-workflow-worker.ts` `ensurePreparedWorkflowWorker`: reuse only an exact valid worker for the current stamp + lock, never reuse partial/corrupt output, refuse a build whose provenance changed mid-build, a fresh directory permits retry. Sources exist (`prepared-workflow-worker.ts`, `local-agent-source.ts`, `workflow-worker-artifact.ts`, `build-workflow-worker.ts`). Duplicates: `test/prepared-workflow-worker.test.mjs` (same module, same reuse/refusal cases) and `test/android-build-path.test.mjs` mention. Callers/importers: manifest; harness `refinement/services/prepared-workflow-worker.mjs` (imports `ensurePreparedWorkflowWorker`, `verifyWorkerArtifact`, `workerHash` and runs them; no slicing); wrapper `test/quint-prepared-workflow-worker.test.mjs` (scripts report: DELETE, T4) + aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-33, 62-63 | B5 | `provenanceDriftRefusesBuildTest` models the script's post-build re-hash of stamp and lock; the script report (#2) deletes that re-hash because the artifact is verified against `expected` right after. | Drop the `unchanged` term from `finish` and the test when the script drops the re-hash. | Low |
| 2 | — | T4 | `test/prepared-workflow-worker.test.mjs` exercises the same reuse/refusal paths on the same module. | Keep one: the Quint campaign (it imports the module) or the host test, not both. | Low |
| 3 | 38-41 | — | `corruptManifest` vs `corrupt` differ only in clearing stamps; both are reached by tests. | Keep. | — |

## Proposed end state
~60-line model without the mid-build drift branch; one check of the module; runs only when worker scripts or the upstream pin change.
