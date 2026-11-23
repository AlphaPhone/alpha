# test/browser/mvp-workflow-scope.spec.ts
- Lines: 56 | Kind: Playwright journeys in mock mode (dev simulator); project `chromium`, 5 tests | Verdict: **MERGE** into `journeys/workflows.spec.ts` (mock block), trimmed
- Covers: the mock workflow builder hides deferred integrations (Messages, Contacts, Wallet triggers/actions), saves and runs an allowed flow, and the mock assistant rejects deferred workflows while accepting email-trigger and call-note ones. Duplicates: mock digest/fallback scope in `mvp.spec.ts` (T4, partly). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T4 | Light/dark loop doubles a long builder journey; no assertion depends on theme. | One theme. | none |
| 2 | 8-9, 16-23, 33, 37 | A3 / D2 | Most assertions check that deferred fixture entries ("Protect focus", "Add the amount to Wallet", "A message to Maya") are absent. After the Wallet deletion (D2) and simulator cleanup (D19) these fixtures do not exist, so the checks pass by construction (useless test). | Drop absence checks for items no longer in the simulator; keep the positive flow (new automation, Email trigger, save, Run now, run succeeded). | Low |
| 3 | 37-46 | — | Mock assistant rejection of deferred workflows: depends on the simulator's canned language parser. | Keep one rejection case only if the simulator keeps those intents; otherwise delete. | Low |
| 4 | all | D6 | Mock-only behaviour; must not run in the production project. | Lives in the dev-only block. | none |

## Proposed end state
Two tests in the mock block of `journeys/workflows.spec.ts`: "build, save and run an email-triggered workflow" and
"assistant drafts an in-scope workflow". Wallet/Messages absence checks are removed together with the fixtures they referred to.
