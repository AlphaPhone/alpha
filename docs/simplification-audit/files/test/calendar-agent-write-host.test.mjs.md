# test/calendar-agent-write-host.test.mjs
- Lines: 47 | Kind: unit of upstream code (imports `vendor/eliza/plugins/plugin-calendar/src/service/managed-calendar-host.ts` directly, stub client) | Verdict: DELETE
- Covers: upstream `calendarAgentWrite` (exact account, idempotency key, ETag delete, readback, retryable refusal classification). Duplicates: `vendor/eliza/plugins/plugin-calendar/test/managed-calendar-host.test.ts` (upstream's own suite exists); refusal-through-broker path in `test/calendar-managed-rejection.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T5 / P5 | Tests upstream code from the vendor checkout; Alpha owns only the `'alpha-google'` namespace argument (line 5). | Delete. Any case missing upstream goes to the upstream follow-up list (D14). | Low: upstream has `managed-calendar-host.test.ts` |
| 2 | 3 | D13 | Imports `vendor/eliza/...` while the product imports the projected `.eliza/client-features` copy, so this may test a different file than ships. | Moot once deleted. | None |
| 3 | 29-47 | - | Refusal classification (`not_accepted`/`precondition_failed` retryable, others unknown) is the one Alpha-relevant contract. | Check that upstream's suite has it; if not, list it as an upstream test to add. | Low |

## Proposed end state
Deleted. Cross-file action: compare these 11 cases with `vendor/eliza/plugins/plugin-calendar/test/managed-calendar-host.test.ts`
and record any gap as an upstream follow-up. Alpha's own boundary (namespace `alpha-google` through the dev broker) stays
covered by `test/calendar-managed-rejection.test.mjs`.
