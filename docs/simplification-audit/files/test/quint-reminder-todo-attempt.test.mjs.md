# test/quint-reminder-todo-attempt.test.mjs
- Lines: 19 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: ReminderTodoAttempt traces replayed against the reminder adapter (`specs/quint/refinement/application/reminder-todo-attempt.mjs` over `prototype/reminder-adapter.ts`). Duplicates: Not in `application/index.mjs`, so this file is the only runner. Reminder flows are also driven by `test/browser/reminder-*.spec.ts`, `host-reminder-recovery.spec.ts`, `browser-reminder-edit-recovery.spec.ts`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 17, 6 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | 13-19 | T10 | Source-mutation canary: asserts the product contains the literal `todoOwner.todoAttempt?.body === body ?` and rewrites it. Any reformat (Prettier, D9) or the planned `runReminderOperation` consolidation (cross-file-actions, reminder-adapter row) breaks the test without a behaviour change. | Drop the per-model canary from the PR suite. The checker's ability to fail is proven once in `test/quint/tooling.test.mjs`; an opt-in mutation lane can keep source mutants if wanted. | Medium |
| 3 | driver | T10 | The driver builds the adapter from text slices of `reminder-adapter.ts`. | PORT: export the reminder operations (tap, refresh, decision, intents, todo attempt) from a reminder module with ports; import it. | Medium |

## Proposed end state
- Runner row ReminderTodoAttempt; no canary in the PR lane.
- The five reminder models (Decision, Intents, Refresh, TapTokens, TodoAttempt) share one ported reminder fixture.
