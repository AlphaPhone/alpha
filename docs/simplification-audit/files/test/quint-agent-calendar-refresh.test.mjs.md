# test/quint-agent-calendar-refresh.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `AgentCalendarRefresh`, driver `specs/quint/refinement/application/agent-calendar-refresh.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Agent Calendar keeps only authorized feed results and next-event readback. Product code: `apps/app/src/runtime/agent-calendar.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `agent-calendar-refresh.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===25`, `checkpoints===237`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/agent-calendar-refresh.mjs`): esbuild-compiles the real `agent-calendar.ts` (good tie; one slice site remains). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |

## Proposed end state
File deleted. `AgentCalendarRefresh` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
Check the driver after the A1 constructor change to `AgentCalendar` (test-01 reports the scenario test broke on it).
