# specs/quint/services/WorkflowLifecycleChange.qnt
- Lines: 263 | Kind: Quint model (live; product workflow remove/restore) | Verdict: KEEP; PORT harness (`workflow-lifecycle-change-replay.mjs` uses the text-transplanting `workflow-adapter-fixture.mjs`)
- Covers: reviewed removal/restore recorded in a pending journal before send; release only on known outcome (reply, receipt, version moved); owner-confirmed resend of a retained never-received change applies once; interrupted runs cancelled first; ongoing run blocks. Duplicates: none (closest: `WorkflowAuthoring` uses the same mutation-identity idea for saves). Callers/importers: `quint:check` (15 runs, 7 witnesses); `refinement/services/workflow-lifecycle-change-replay.mjs` via `forward-replays.mjs` (aggregate) and `test/quint-workflow-lifecycle-change.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T2 / T10 | Replay drives the real adapter through `workflow-adapter-fixture.mjs`, which `readFileSync`s `prototype/workflow-adapter.ts`, strips imports and evaluates it in `vm`. | Same port as the WorkflowExecution harness: import the adapter module with real dependencies and stub ports. | Medium |
| 2 | manifest | T10 | 17 symbol pins (`lifecycleReview`, `lifecycleKey`, `beforeDispatch` …) in a 485-line minified file. | Drop `symbols`. | Low |
| 3 | test | T4 / T9 | Runs in forward replays and again in its own test, which respawns `node --import tsx` itself (280 s). | One execution; configure tsx once for the suite. | Low |
| 4 | 1-263 | — | Largest model in this chunk but each action carries a doc comment and the 15 runs map to real recovery stories. No simplification worth a model edit. | None. | — |

## Proposed end state
Model unchanged; manifest pins files only; replay imports the real adapter; one execution per lane.
