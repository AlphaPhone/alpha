# specs/quint/refinement/application/reminder-decision.mjs
- Lines: 146 | Kind: Quint ITF trace replay (model-generated scenarios, witnesses and random walks via `calendar-itf.mjs` `modelTraces`) against the real bundled reminder adapter (`reminder-adapter-fixture.mjs`) | Verdict: KEEP
- Covers: reminder Done / Snooze / Delete: journal lookup first, read-back of a journaled decision without resending, conflict with a different journaled decision, selected-revision check, record retained before native, leave/reopen, refresh acknowledgement, one write at a time (live model `specs/quint/application/ReminderDecision.qnt`). Duplicates: test/browser/reminder-decision-review.spec.ts (mounted review flow, not the journal races). Callers/importers: test/quint-reminder-decision.test.mjs (2 tests incl. a mutation case; 280 s timeout each). **Not** in `index.mjs`, so `npm run quint:refinement` does not run it; only `npm test` does.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | This is the target shape for refinement harnesses: model-generated traces, real module via bundling, ports only at native/storage boundaries, observation through public shell fields and recorded native calls. No product text slicing in this file (the one output splice lives in the shared fixture). | None. | — |
| 2 | — | T5 | The wrapper test's second case mutates the bundled adapter text (`code.replace(guard, …)`) to prove the replay fails. It tests the harness, pins a literal guard in product code, and doubles the run time. | Delete the mutation case in the wrapper test; drop the `mutate` pass-through here. | Low |
| 3 | — | T4/P1 | Registered only through its per-model test; sibling harnesses are registered in `index.mjs` too. | One registration mechanism (per-model runner from the manifest). | Low |
| 4 | — | B5 | Wrapper asserts exact trace counts (e.g. `result.traces === N`) that change whenever the model's scenario list changes. | Assert `> 0` and per-action coverage only. | None |
| 5 | 70, 89, 111, 117 | — | Asserts toast copy by regex (`/^Unconfirmed$/`, `/^(Done|Snoozed)/`, `/^Changed$/`). Copy is user-visible behaviour, acceptable; one constant map would make copy changes one edit. | Hoist the copy regexes into one object at the top. | None |
| 6 | 130-136 | — | After each step, re-taps all three decisions to prove no second native call starts: a cheap, valuable invariant. | Keep. | — |

## Proposed end state
Unchanged harness minus the `mutate` pass-through; one wrapper test (`traces > 0`, every action replayed); registered in the single per-model runner.
