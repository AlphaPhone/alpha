# specs/quint/refinement/application/reminder-tap-tokens.mjs
- Lines: 121 | Kind: Quint ITF trace replay (model-generated scenarios, witnesses and random walks via `calendar-itf.mjs` `modelTraces`) against the real bundled reminder adapter (`reminder-adapter-fixture.mjs`) | Verdict: KEEP
- Covers: single-flight tap check with queued recheck, token capture/confirm, question review consume/release, target changed/unlisted, background blocking (live model `specs/quint/application/ReminderTapTokens.qnt`). Duplicates: overlaps RetainedReminderTapAdmission (post-render admission of the same token). Callers/importers: test/quint-reminder-tap-tokens.test.mjs (2 tests incl. mutation; 280 s). **Not** in `index.mjs`, so `npm run quint:refinement` does not run it; only `npm test` does.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | This is the target shape for refinement harnesses: model-generated traces, real module via bundling, ports only at native/storage boundaries, observation through public shell fields and recorded native calls. No product text slicing in this file (the one output splice lives in the shared fixture). | None. | — |
| 2 | — | T5 | The wrapper test's second case mutates the bundled adapter text (`code.replace(guard, …)`) to prove the replay fails. It tests the harness, pins a literal guard in product code, and doubles the run time. | Delete the mutation case in the wrapper test; drop the `mutate` pass-through here. | Low |
| 3 | — | T4/P1 | Registered only through its per-model test; sibling harnesses are registered in `index.mjs` too. | One registration mechanism (per-model runner from the manifest). | Low |
| 4 | — | B5 | Wrapper asserts exact trace counts (e.g. `result.traces === N`) that change whenever the model's scenario list changes. | Assert `> 0` and per-action coverage only. | None |
| 5 | 66-70 | — | Drops the model's `interactionAt` field from comparison because it is unobservable; documented inline. Fine. | None. | — |
| 6 | — | T4 | `RetainedReminderTapAdmission` covers the post-render admission of the same token; the manifest notes the split (manifest ~l.6247). Once that harness is ported onto `reminder-adapter-fixture.mjs`, both could become one harness file with two model replays. | Owner question: merge the two models or keep the split. | Low |

## Proposed end state
Unchanged harness minus `mutate`; reads tap flags through an exported adapter state instead of the fixture's output splice.
