# test/reminder-deletions.test.mjs
- Lines: 40 | Kind: unit (esbuild bundle of real `browser/reminder-deletions.ts`) | Verdict: MERGE into `test/integration/calendar.test.ts`
- Covers: Staged reminder deletion: Undo restores the exact original occurrence after due time; expiry cancels once; paused intents cannot dispatch; renderer clock change never dispatches; revision drift refuses Undo; repeat Undo is idempotent. Duplicates: Quint `ReminderDecision`/`ReminderIntents` replay `runtime/reminder-deletions.ts` (a different file); Playwright `reminder-action-storage.spec.ts`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | ok | Bundles and imports the real module (no slicing). | Keep the import; drop esbuild once a plain import works under the test loader. | Low |
| 2 | 7-40 | T3 | Pure-function unit tests with `performance.now` mocked; but the Undo/expiry rules are risky and not visible in a journey. | Keep as table-driven cases in the calendar integration file (the T3 exception). | Low |
| 3 | whole | naming | Two modules named `reminder-deletions.ts` (`browser/` and `runtime/`). | Report to the renderer reviewers (D11 misleading names). | Low |

## Proposed end state
- Five cases in the calendar integration file.
