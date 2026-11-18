# test/quint-calendar-agent-selection.test.mjs
- Lines: 19 | Kind: Quint replay wrapper (model `CalendarAgentSelection`, driver `specs/quint/refinement/application/calendar-agent-selection.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the Calendar adapter follows every CalendarAgentSelection step (open/inspect/refresh/provider change/form). Product code: `apps/app/src/prototype/calendar-adapter.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: none (not in any family aggregate; this wrapper is its only runner). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Thin wrapper; this is the only place the campaign runs. | Delete after `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) registers the model (it must be added to the family registry explicitly). | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===38`, 12 `actions.*>0`, `sources.includes(calendar-adapter.ts)`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/calendar-agent-selection.mjs`): loads and optionally rewrites the adapter source. | Driver review belongs to the specs chunk: PORT any text slice to an import of the exported function. | Low |
| 4 | 13-19 | B5 | Mutation canary: replaces the literal `token === agentSelectionEpoch` with `true` and expects the replay to fail. Pins an exact source string; costs a second 280 s run. | Delete the canary. | Low |
| 5 | all | T4 | Not in the application aggregate. | Register in the runner. | Low |

## Proposed end state
File deleted. `CalendarAgentSelection` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
