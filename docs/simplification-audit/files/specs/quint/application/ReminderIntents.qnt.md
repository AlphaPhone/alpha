# specs/quint/application/ReminderIntents.qnt
- Lines: 217 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Durable reminder creation/operation records retained before native dispatch; recovery only reads; bounded histories need owner discard. Duplicates: ReminderDecision (operation journal at decision level); ReminderTodoAttempt (to-do creation id reuse). Distinct enough. Callers/importers: `reminder-intents.mjs` (`checkReminderIntents`) <- `test/quint-reminder-intents.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based (bundled real adapter via `reminder-adapter-fixture.mjs`). | None. | - |
| 2 | 111-117 | A5? | `ownerDiscard` is kept out of `step` because "the Android reminder screens offer no such action"; scenarios `fullHistoryNeedsOwnerDiscardTest`/`ownerDiscard*` describe an action the product does not have. | Owner question: is there a product path that frees a full pending history? If not, the two `ownerDiscard*` runs document a dead end (history full forever) rather than a feature; keep them as witnesses but rename to say so. | L |
| 3 | manifest | T10 | 18 symbol pins. | File pins only. | L |

## Proposed end state
- Keep; models live `runtime/reminder-creations.ts`, `reminder-deletions.ts`, `reminder-journal-store.ts`.
- Answer the full-history owner question (see finding 2); no structural change.
