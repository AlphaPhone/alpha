# test/locale-time-usage.test.mjs
- Lines: 71 | Kind: source-text (lint over `apps/app/src`, with a self-test of its own regex) | Verdict: DELETE
- Covers: no displayed time bypasses `prototype/locale-time.ts` outside an 11-file "pending" allow-list. Duplicates: none. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-71 | T1 | Walks every renderer file and regex-matches `toLocale*String(` calls; a lint, not behaviour. Any reformat of a call (D9 Prettier) can flip it. | Delete. If the rule is wanted, express it as an ESLint `no-restricted-syntax` rule (MemberExpression `toLocaleTimeString`) in the lint lane. | Low |
| 2 | 50-58 | T5 | Tests the test's own regex helper. | Delete with the file. | None |
| 3 | 14-19 | A7 | Allow-list names files that stage A deletes or shrinks (`runtime/hosted-live-source-ui.tsx`, `browser/simulated-workflows.ts`, `browser/incoming-simulation.ts`); every deletion makes this test fail ("stale"). | Gone with the file. | None |

## Proposed end state
File deleted. Locale/hour-cycle behaviour stays covered by the journey cases proposed in `locale-time.test.mjs.md`.
Optional: an ESLint rule if the owner wants the "always use locale-time" convention enforced.
