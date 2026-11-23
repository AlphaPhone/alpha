# test/cloud-membership-ui.test.mjs
- Lines: 48 | Kind: component static render (esbuild CJS bundle of `cloud-membership-ui.tsx`, `renderToStaticMarkup`, regexes over HTML) | Verdict: DELETE; carry 3 cases to `journeys/connection-cloud.spec.ts`
- Covers: account sheet shows balance once and "Not available" (never $0.00) when unknown; plan action is "Plan" or "Choose plan" by verified state; no invented renewal date; busy disables actions; duplicate warnings render once; allowance line; service name is configured, never "Eliza Cloud" hard-coded. Duplicates: `cloud-membership-presentation.test.mjs`; `test/browser/cloud-account-panel.spec.ts`, `resident-failures.production.spec.ts` ("Choose plan"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 23, 25, 27 | T1 | Negative copy regexes (`Have a membership code`, `Your browser may`, `Sign-in valid until`) pin removed copy. | Delete. | None |
| 2 | 5-8 | C3 | Same bundle/shim as the presentation test. | Gone. | None |
| 3 | 12-24, 34-41 | T3 | Visible truth rules: unknown balance is "Not available" not $0.00; inactive plan shows "Choose plan"; one allowance line. | Account-sheet journey with the dev Cloud returning unavailable balance, inactive plan, active plan with allowance. | Low |

## Proposed end state
Deleted; the account-sheet journey covers balance truth, plan action and allowance with dev Cloud states.
