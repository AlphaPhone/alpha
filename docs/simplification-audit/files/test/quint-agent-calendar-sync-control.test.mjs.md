# test/quint-agent-calendar-sync-control.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `AgentCalendarSyncControl`, driver `specs/quint/refinement/application/agent-calendar-sync-control.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: linked Calendar control keeps exact review and destination ownership through readback, on the agent-side path. Product code: `apps/app/src/runtime/agent-calendar.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `agent-calendar-sync-control.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===36`, `checkpoints===267`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/agent-calendar-sync-control.mjs`): esbuild-compiles `agent-calendar.ts` (3 slice sites remain). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | all | D4 | Models the **agent-side** sync control in `agent-calendar.ts`, which D4 names as the product path; it does not read the client-side linked-sync stack being deleted. | Keep. | Low |

## Proposed end state
File deleted. `AgentCalendarSyncControl` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
