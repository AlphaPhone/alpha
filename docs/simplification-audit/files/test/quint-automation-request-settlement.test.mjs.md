# test/quint-automation-request-settlement.test.mjs
- Lines: 26 | Kind: Quint replay wrapper (model `AutomationRequestSettlement`, driver `specs/quint/refinement/services/automation-request-settlement.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the automation journal settles complete and partial source schedules correctly (unknown deletions retained, lists cannot prove earlier runs). Product code: `automations-adapter.ts`, `home-cards.ts`, `automations-protocol.ts`, `workflow-intents.ts`, `workflow-local-time.ts`; model live (in `specs/quint/services/manifest.json`). Duplicates: the same campaign runs again in `runServicesRefinement()` (`specs/quint/refinement/services/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `automation-request-settlement.mjs`; the campaign also runs in the services aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===6`, `checkpoints===35`, 7 `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/services/automation-request-settlement.mjs`): strips/evals source (3 eval sites, 2 slices). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | 18-26 | B5 | Two mutation canaries rewrite product source text (`source.replace("&&complete('automations')", '')`) to prove the oracle fails: a one-time harness validation run on every `npm test` (2 x up to 180 s), and pinned to exact source strings. | Delete the canaries. | Low |

## Proposed end state
File deleted. `AutomationRequestSettlement` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
