# scripts/test-clock-handoff-flow.ts
- Lines: 127 | Kind: source transplant (`prototypeScript('clock-adapter.ts', ...)` strips and runs the adapter in `vm` with fake `DailyApps`, storage, document) | Verdict: DELETE; REWRITE kept cases into `test/browser/journeys/workflows.spec.ts`
- Covers: the reviewed Clock (alarm) handoff: invalid time refused, review invalidated by edits, one dispatch per confirm, repeat-day chips only when native supports them, lost response shows Unknown and is never retried after recreation, storage failure and hidden page block dispatch, mock mode never reaches native. Duplicates: `test/browser/agent-clock-handoff.spec.ts`, `journey-c-alarms.spec.ts`, `clock-repeat.production.spec.ts`, `test/browser-clock.test.mjs`, `test/clock-native-contract.test.mjs`. Callers/importers: `test/adapter-contracts.test.mjs`; listed as a source path in `test/fixtures/workflow-clock-admission.mjs:21` (`workflowClockSources`, used by `specs/quint/refinement/application/workflow-clock-admission.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 66 | T2 | Transplanted adapter with 20 injected bindings; breaks on any adapter refactor (D2 work). | Delete. | L |
| 2 | 77-126 | T3/D8 | Loops the whole scenario twice (`mockBuild` true/false) mutating module globals. | Journey per build project (chromium = test-mocks, production project = flag-off). | L |
| 3 | — | cross-file | `workflowClockSources` names this script as a source file of the Quint clock-admission harness. | Remove the entry when deleting (otherwise the harness fails on a missing file). | M |

## Proposed end state
Journey cases (chromium unless noted): (a) lost native response shows "Unknown" and reopening does not redispatch; (b) a failed slot write shows "Can't reach Clock" with no dispatch; (c) repeat chips hidden without `clockRepeatDaysVersion`; (d) production project: mock connection mode fails closed with no native call. Script deleted; `workflow-clock-admission.mjs` list updated.
