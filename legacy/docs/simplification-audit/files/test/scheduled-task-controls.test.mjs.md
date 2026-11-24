# test/scheduled-task-controls.test.mjs
- Lines: 56 | Kind: transplant fixture (`test/fixtures/scheduled-task-controls.mjs` bundles `automations-adapter.ts` with stub ports) + Quint refinement call | Verdict: DELETE
- Covers: a scheduled-task "Run now" receipt with a wrong/missing id stays Unknown and locked; terminal manual schedules offer only Reopen; confirmed absence closes detail; failed refresh disables actions. Duplicates: `checkScheduledTaskControls` also runs in `specs/quint/refinement/application/index.mjs:143` via `test/quint-application-refinement.test.mjs` (T4); browser `dev-workflow-*.spec.ts` drive "Run now". Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-49 | T2 | Scenario tests over a transplant fixture. | Delete. | Low |
| 2 | 51-56 | T4/B5 | Re-runs one aggregate component and asserts `traces === 20`, `driverInputsBound`. | Delete. | Low |

## Proposed end state
File deleted. The fixture stays while `specs/quint/refinement/application/scheduled-task-controls.mjs` imports it (T10
port candidate). The Unknown/locked receipt case goes to `journeys/workflows.spec.ts` if the dev workflow specs lack it.
