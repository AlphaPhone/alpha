# specs/quint/refinement/application/reminder-refresh.mjs
- Lines: 85 | Kind: Quint ITF trace replay (model-generated scenarios, witnesses and random walks via `calendar-itf.mjs` `modelTraces`) against the real bundled reminder adapter (`reminder-adapter-fixture.mjs`) | Verdict: KEEP
- Covers: refresh generation fencing (a superseded read cannot publish), device-row merge, reminders-committed event, reminderOpened open/drop toast, unmount (live model `specs/quint/application/ReminderRefresh.qnt`). Duplicates: partial overlap with ReminderOpenIntent (open/drop of the reminderOpened intent). Callers/importers: test/quint-reminder-refresh.test.mjs (2 tests incl. mutation; 240 s). **Not** in `index.mjs`, so `npm run quint:refinement` does not run it; only `npm test` does.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | This is the target shape for refinement harnesses: model-generated traces, real module via bundling, ports only at native/storage boundaries, observation through public shell fields and recorded native calls. No product text slicing in this file (the one output splice lives in the shared fixture). | None. | — |
| 2 | — | T5 | The wrapper test's second case mutates the bundled adapter text (`code.replace(guard, …)`) to prove the replay fails. It tests the harness, pins a literal guard in product code, and doubles the run time. | Delete the mutation case in the wrapper test; drop the `mutate` pass-through here. | Low |
| 3 | — | T4/P1 | Registered only through its per-model test; sibling harnesses are registered in `index.mjs` too. | One registration mechanism (per-model runner from the manifest). | Low |
| 4 | — | B5 | Wrapper asserts exact trace counts (e.g. `result.traces === N`) that change whenever the model's scenario list changes. | Assert `> 0` and per-action coverage only. | None |
| 5 | 7-8 | — | Pins the two toast strings ("Couldn't open that reminder…", "Couldn’t refresh", with a typographic apostrophe). | Import the strings from the adapter if exported, else keep. | None |
| 6 | 47-73 | T4 | `reminderOpened` open/drop overlaps `ReminderOpenIntent`; both models are live (D11), so keep both, but the owner may merge the two models (open-intent is the more detailed navigation model). | Owner question. | Low |

## Proposed end state
Unchanged harness minus `mutate`; one wrapper case; per-model runner registration.
