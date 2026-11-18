# specs/quint/services/LifeOpsScheduledTaskRoute.qnt
- Lines: 147 | Kind: Quint model, live (services manifest); upstream-only sources (`vendor/eliza/plugins/plugin-scheduling/src/routes/scheduled-tasks.ts`, `scheduled-task/runner.ts`, `schema.ts`, `state-log.ts`) | Verdict: KEEP (upstream-lock lane; upstream bug report)
- Covers: the LifeOps scheduled-task HTTP route and in-memory runner: owner list and filter validation, exact edit/snooze/complete/reopen, one claim wins a fire race, egress only after claim and guard, completion before egress settles as raced (7 runs, 2 invariants). Duplicates: `PersonalAssistantScheduledTaskCustody` (same fixture in `configured` mode, different scope). Callers/importers: manifest; `refinement/services/lifeops-scheduled-task-route.mjs` (uses `test/fixtures/lifeops-scheduled-task-route.mjs`, which bundles the real upstream modules), also imported by `personal-assistant-scheduled-task-custody.mjs`; `test/quint-lifeops-scheduled-task-route.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 117-125, 144-146 | — | `ExactOccurrenceEgress` and `NoOlderOccurrenceRestore` are desired properties the upstream runner **violates**; `occurrenceFenceGapTest` asserts the violation (an occurrence ABA: an old claim can egress after complete→reopen). This is a real upstream bug kept as a witness. | Report upstream (D14 follow-up); when fixed upstream, move both into `safety` and invert the run. | None now |
| 2 | manifest | P6 | Upstream-only; runs on every PR. | Upstream-lock lane. | None |
| 3 | `test/fixtures/lifeops-scheduled-task-route.mjs:60-70` | T10 | In `configured` mode (custody model) the fixture slices upstream `runtime-wiring.ts` between literal anchors. Not used by this model's runs, but shared fixture. | Covered in the custody/fixture reports: import the exported policy upstream. | Low |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged until upstream fixes the occurrence fence; runs only when the upstream pin changes; the bug is listed as an upstream follow-up.
