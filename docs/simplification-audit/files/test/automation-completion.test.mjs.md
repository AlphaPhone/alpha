# test/automation-completion.test.mjs
- Lines: 21 | Kind: unit (real import of `apps/app/src/runtime/automation-completion.ts` through `test/fixtures/browser-source.mjs`) | Verdict: MERGE into `test/integration/automations.test.mjs`
- Covers: only an applied, durably committed receipt of one of five automation kinds refreshes the unified automations list; tentative, preview, failed, unrelated or unsuccessful results do not. Duplicates: none direct; the refresh it drives is exercised by `automations-unified.test.mjs` "current-session committed events coalesce one refresh". Callers/importers: `npm test`; `browser-source.mjs` has 21 importers.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T3 | A pure predicate tested alone. On its own this is a unit test; the behaviour matters only as "an agent action that creates an automation makes the list refresh". | Carry the two tables (5 accepted kinds, 7 refusals) as one case in `test/integration/automations.test.mjs`, driven through the protocol and the committed event rather than calling the predicate. | Low |
| 2 | 6 | D8 | One 400-character receipt builder. | Reformat when moved. | — |

## Proposed end state
File deleted; one table-driven case in `test/integration/automations.test.mjs`: a chat result with an applied durable receipt triggers exactly one list refresh, and the seven non-qualifying shapes trigger none.
