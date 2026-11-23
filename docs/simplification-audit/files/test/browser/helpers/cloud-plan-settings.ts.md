# test/browser/helpers/cloud-plan-settings.ts
- Lines: 16 | Kind: Playwright UI navigation helper | Verdict: **MERGE** into `harness/nav.ts`
- Covers: opens the Account sheet from Settings; confirms Sign out. Duplicates: none. Callers/importers: 8 specs (`browser-cloud-dev`, `cloud-account-replacement.production`, `connection-boundaries.production`, `journey-core-loops.production`, `native-cloud-subscription`, `own-provider.production`, `production-surface`, `settings-truth.production`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | — | Role-based, visible-UI only. Good. | Move as `nav.openAccount()` / `nav.confirmSignOut()`. | none |

## Proposed end state
Two functions in `harness/nav.ts`; file deleted.
