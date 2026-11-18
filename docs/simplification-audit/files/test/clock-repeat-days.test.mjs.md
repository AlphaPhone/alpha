# test/clock-repeat-days.test.mjs
- Lines: 60 | Kind: unit (imports real `runtime/clock-contract.ts` pure validators) + contract comparison against the upstream module | Verdict: MERGE lines 33-48 into `clock-native-contract`'s surviving contract test; DELETE the rest
- Covers: Alpha's Clock contract accepts 1-7 unique days in any order and sorts them; `[]` is a one-time alarm; review text; outcome receipts reject coerced status arrays; Alpha and upstream agree on every accepted/refused repeat. Duplicates: `test/browser/clock-repeat.production.spec.ts`, `agent-clock-handoff.spec.ts` (chip selection and review copy). Callers/importers: `npm test` glob only; `clock-contract.ts` imported by `daily.ts`, `clock-adapter.ts`, `agent-adapter.ts`, `phone-context.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8, 33 | B2 | Skips when `vendor/eliza` is not checked out; the submodule is required (README). | Remove the skip. | None |
| 2 | 33-48 | A2 | Alpha keeps its own `clock-contract.ts` that must agree with upstream's `validateClockOperation`; the test exists because there are two contracts. | Owner/upstream question: import upstream's validator and normalise days in one place; then this comparison disappears. Until then keep it as the one TS contract case. | Low |
| 3 | 10-32, 50-60 | T3 | Validator tables; review text "repeating weekdays" and one-time alarm are visible in the Clock journey. | Delete; ensure `clock-repeat.production.spec.ts` asserts "repeating weekdays" for unordered chips. | Low |

## Proposed end state
One contract case (Alpha vs upstream) survives until Alpha imports the upstream validator; user-visible repeat
behaviour is in `journeys/reminders.spec.ts`.
