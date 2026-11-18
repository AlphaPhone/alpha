# specs/quint/refinement/services/task-scheduler/fixture.mjs
- Lines: 170 | Kind: harness fixture for the historical CoreTaskScheduler campaign | Verdict: DELETE (move `until` to `refinement/support.mjs` first)
- Covers: single-agent controlled timer/DB/worker fixture around the upstream scheduler + TaskService for `index.mjs`. Duplicates: `runtime-fixture.mjs` is the multi-agent superset over the same source and ports. Callers/importers: `index.mjs:5` (`schedulerFixture`) and `runtime-fixture.mjs:3` (`until` only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-170 | P6 | Only consumer of `schedulerFixture` is the legacy-model campaign `index.mjs`. | Delete with it. | Low |
| 2 | 17-23 | C3 | `until` (100 × setImmediate) is the one export the live runtime fixture needs; twin of `services/support.mjs` `until`. | `runtime-fixture.mjs` imports `until` from the shared support module. | None |
| 3 | 11-15 | C3 | Private `deferred` twin. | Gone. | None |

## Proposed end state
File deleted; `runtime-fixture.mjs` imports `until`/`deferred` from `specs/quint/refinement/support.mjs`.
