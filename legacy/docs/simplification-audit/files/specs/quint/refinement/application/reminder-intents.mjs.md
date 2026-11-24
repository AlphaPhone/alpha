# specs/quint/refinement/application/reminder-intents.mjs
- Lines: 173 | Kind: Quint ITF trace replay against the real bundled reminder adapter (`reminder-adapter-fixture.mjs`), with two journal limits shrunk in the bundled output | Verdict: KEEP (small PORT for the limit splice)
- Covers: reminder creation and operation journals across reminders — record retained before dispatch, history full of pending creations refuses, late saves found by reconciliation, abandoned forms/decisions, receipts acknowledged, recovery only reads (live model `ReminderIntents.qnt`). Duplicates: `ReminderDecision` covers one reminder's decision journal in depth (manifest note ~l.9056 states the split). Callers/importers: `test/quint-reminder-intents.test.mjs` (2 tests incl. a mutation case, 280 s each). Not in `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-20 | T10 | Rewrites `REMINDER_CREATION_LIMIT = 32` → `2` and `REMINDER_ACTION_LIMIT = 100` → `2` in the **bundled output**; the constants live in upstream `.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-journal.ts:93,305`. Asserted present, so failure is loud, but depends on esbuild's printing and on upstream naming. | Upstream follow-up (D14): let the journal store take its limits as a parameter (or export a `withLimits` factory); then pass `{creations: 2, actions: 2}` here. Until then keep. | Low |
| 2 | 98-101, 138-141, 148 | — | `hold('secureRead', count, skip)` choreography encodes how many journal reads precede the pause point; brittle if the adapter adds a read, but failure is explicit ("an admitted save retains its record first"). | Keep. | Low |
| 3 | — | T5 | Wrapper mutation case (`if (created && !dispatched)` → `if (created)`) pins a literal guard. | Delete the mutation case; drop `bounded(mutate)` composition to just `bounded`. | Low |
| 4 | — | T4/P1 | Not registered in `index.mjs`. | Per-model runner. | Low |

## Proposed end state
Harness unchanged except limits passed as configuration (after the upstream change) and no `mutate`; one wrapper case.
