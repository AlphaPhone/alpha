# specs/quint/refinement/application/reminder-todo-attempt.mjs
- Lines: 107 | Kind: Quint ITF trace replay (model-generated scenarios, witnesses and random walks via `calendar-itf.mjs` `modelTraces`) against the real bundled reminder adapter (`reminder-adapter-fixture.mjs`) | Verdict: KEEP
- Covers: undated to-do save: one id per attempt reused on retry, lost/refused answers, read-back, done/reopen/remove decisions, no second write while saving (live model `specs/quint/application/ReminderTodoAttempt.qnt`). Duplicates: none found. Callers/importers: test/quint-reminder-todo-attempt.test.mjs (2 tests incl. mutation; 240 s). **Not** in `index.mjs`, so `npm run quint:refinement` does not run it; only `npm test` does.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | This is the target shape for refinement harnesses: model-generated traces, real module via bundling, ports only at native/storage boundaries, observation through public shell fields and recorded native calls. No product text slicing in this file (the one output splice lives in the shared fixture). | None. | — |
| 2 | — | T5 | The wrapper test's second case mutates the bundled adapter text (`code.replace(guard, …)`) to prove the replay fails. It tests the harness, pins a literal guard in product code, and doubles the run time. | Delete the mutation case in the wrapper test; drop the `mutate` pass-through here. | Low |
| 3 | — | T4/P1 | Registered only through its per-model test; sibling harnesses are registered in `index.mjs` too. | One registration mechanism (per-model runner from the manifest). | Low |
| 4 | — | B5 | Wrapper asserts exact trace counts (e.g. `result.traces === N`) that change whenever the model's scenario list changes. | Assert `> 0` and per-action coverage only. | None |
| 5 | 10-11 | — | Classifies toasts by regex on copy ("Saved", "Unconfirmed", "…Nothing was saved."). | Keep; hoist copy to one map. | None |
| 6 | 71-72 | — | `startDecision` peeks ahead in the trace for the matching `finishDecision` to know which handler to call — the model names the decision late. Works, but couples replay to trace order. | Model could name the decision at start; owner/model change, optional. | Low |

## Proposed end state
Unchanged harness minus `mutate`; one wrapper case; per-model runner registration.
