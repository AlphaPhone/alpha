# apps/app/src/browser/development-cloud.ts
- Lines: 42 | Role: fake Cloud personal-agent protocol (quotes, activation, adoption, jobs, cut-over) over a per-account development setup document. | Verdict: SIMPLIFY (absorbs `development-cloud-document.ts`); DELETE with the personal-Cloud path if D5 removes it
- Importers: 3 (`development-cloud-ui.tsx`, `development-identity.ts:2`, `runtime/connection-ui.tsx:38` for `developmentCloudKey`). Text/path pins: `test/browser/agent-conversation-migration.spec.ts`, `cloud-account-migration.spec.ts`, `cloud-setup-migration.spec.ts`, `execution-storage-migration.spec.ts` (all A1), `dev-cloud-identity.spec.ts`, `dev-cloud-scenarios.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 20 | C3 | Same "account changed" check written twice (`readDevelopmentCloudAccount` + compare account/session). | One `checkAccount(account,signal)`. | None |
| 2 | 5, 7 | D4 | Re-exports `development-account-document`'s API so callers import from here. | Import directly from the account document; delete the re-exports. | Low |
| 3 | 26, 35 | C6 | `'f'.repeat(64)` (changed-quote marker) five times. | `const CHANGED_QUOTE`. | None |
| 4 | 12 | C6 | Scenario list literal (see cloud-document report). | Shared const. | None |
| 5 | 17 | B4 | `if(!devSurfacesEnabled)throw…` inside a dev-only module. | Delete once behind the dev boundary. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `status(state)` | helper | 21 | none | keep |
| `ok(data,status)` | helper | 22 | envelope builders in `development-connection.ts:32` | keep |

## Proposed end state
~42 lines in `dev/` including the merged setup document; no re-exports, one account check.

## Verification
`test/browser/dev-cloud-scenarios.spec.ts`, `dev-cloud-identity.spec.ts`.
