# test/prepared-workflow-worker.test.mjs
- Lines: 45 | Kind: tooling integration (real `buildPreparedWorkflowWorker` and `stageWorkerArtifact` over temp dirs with a fake producer module) | Verdict: MERGE into `test/tooling/android-build.test.mjs` (workflow-worker section)
- Covers: the product build delegates to upstream's generic workflow-artifact producer with the admitted source identity, verifies the output manifest, and refuses reuse, outside/symlinked/overlapping outputs and provenance drift before importing the producer. Duplicates: `test/quint-prepared-workflow-worker.test.mjs` + `specs/quint/refinement/services/prepared-workflow-worker.mjs` (refinement of `ensurePreparedWorkflowWorker`), `test/android-build-path.test.mjs:10`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-26 | keep | Real script, real fs, fake producer: the right shape for a tooling test. | Keep. | Low |
| 2 | 29-45 | keep | Overlap refusal happens before the producer is imported (producer throws if imported). Good guard. | Keep. | Low |
| 3 | all | T4 | The `PreparedWorkflowWorker` refinement replays `ensurePreparedWorkflowWorker` on the same script. | Check which refusals the refinement covers; keep the non-overlapping ones only. | Low |
| 4 | 37 | C3 | Local snapshot-hash walker. | Use `scripts/lib/hash.ts` walker once it exists. | Low |

## Proposed end state
Two cases in `test/tooling/android-build.test.mjs` (delegation + verification; overlap refused before import), minus any
refusal the Quint refinement already replays. File deleted.
