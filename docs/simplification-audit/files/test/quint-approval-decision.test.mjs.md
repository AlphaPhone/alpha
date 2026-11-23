# test/quint-approval-decision.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (model `ApprovalDecision`, driver `specs/quint/refinement/services/approval-decision-replay.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the real workflow adapter follows every step of the ApprovalDecision scenarios and random walks. Product code: workflow adapter via `workflow-adapter-fixture.mjs` and `inbox-workflows-model-traces.mjs`; model live (in `specs/quint/services/manifest.json`). Duplicates: none (not in any family aggregate; this wrapper is its only runner). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Thin wrapper; this is the only place the campaign runs. | Delete after `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) registers the model (it must be added to the family registry explicitly). | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: none | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/approval-decision-replay.mjs`): fixture-built adapter; 3 slice sites in the replay. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 2-7 | T9 | Re-execs itself under `--import tsx` when started without a loader (24 files do this). | Runner runs once with the loader it needs (or Node type stripping); drop the self re-exec. | Low |
| 5 | 10-11 | T4 | Two cases (scenarios, random walks) not part of the services aggregate. | Register both in the runner. | Low |

## Proposed end state
File deleted. `ApprovalDecision` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
