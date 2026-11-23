# test/quint-agent-calendar-mutation.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `AgentCalendarMutation`, driver `specs/quint/refinement/application/agent-calendar-mutation.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Agent Calendar serializes writes and defers the latest refresh. Product code: `apps/app/src/runtime/agent-calendar.ts` (via `buildAgentCalendar` from `agent-calendar-refresh.mjs`); model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `agent-calendar-mutation.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===24`, `checkpoints===134`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/agent-calendar-mutation.mjs`): compiles the real module through the refresh driver, plus local slices (4 sites). | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Medium |
| 4 | model | A1 | `AgentCalendarMutation.qnt` still declares `Preservation` (`same/changed/pending/unreadable/transport`), `preservationReply` and `changedPreservationNeverDispatchesTest`; the driver keeps `legacySnapshot()` and the message "Saved app calendar changed; review preservation before continuing". This worktree already deleted `apps/app/src/runtime/legacy-calendar-preservation.ts` (A1), so model and driver now describe a step the product no longer has. | Revise model and driver in the A1 change: remove the preservation action, state and scenario; re-run `quint:check` and the replay. Not optional: the model must stay at 100 % (D11). | High |
| 5 | all | T4 | Same controller as the `scripts/test-agent-calendar-mutation-flow.ts` child suite (research P3 table). | Keep the replay; the child suite is a delete in test-01. | Low |

## Proposed end state
File deleted. `AgentCalendarMutation` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
Runner entry plus a revised model without the preservation branch.
