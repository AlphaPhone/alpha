# specs/quint/application/OwnNoticeQuestion.qnt
- Lines: 72 | Kind: Quint model (live; transplant harness) | Verdict: KEEP + PORT harness
- Covers: Asking about one of the phone's own notifications: dismiss releases the tap, Home/blur cancels, a spent tap still drafts the question, review closes once. Duplicates: test/own-notice-question.test.mjs also loads the same harness (two wrappers for one replay: T4). Callers/importers: manifest row (own-notice-question.ts, 7 symbol pins); harness specs/quint/refinement/application/own-notice-question.mjs; wrappers test/quint-own-notice-question.test.mjs and test/own-notice-question.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | own-notice-question.mjs:24-27 | T2 | `compile()` reads browser/content-question.ts and prototype/own-notice-question.ts, deletes `import` lines by regex, strips `export`, strips types and runs both in `vm.runInNewContext` with hand-supplied globals. | PORT: bundle `own-notice-question.ts` (already exports `reviewOwnNoticeQuestion`) with esbuild and stub its imports. | M |
| 2 | wrappers | T4 | Two host tests import the same harness. | Keep one wrapper (test/quint-own-notice-question.test.mjs); see test chunk. | L |
| 3 | manifest symbols | T10 | Pins closure-local names `canceled`, `composing`, `ended`, `consumed`. | Drop symbol pins. | L |

## Proposed end state
Model unchanged; harness imports the real module; one wrapper; file pin only.
