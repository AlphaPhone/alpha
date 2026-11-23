# apps/app/src/runtime/development-cloud-agents.ts
- Lines: 149 | Role: test-mocks-only subclass of `CloudProtocol` that talks to hosted Eliza Cloud agents (agent list, runtime conversations, phone device-action route, personal onboarding). | Verdict: DELETE (with the hosted/paired/personal path in `connection-ui.tsx`, owner sign-off)
- Importers: 1 product (`runtime/connection-ui.tsx`, constructed only when `testMocksEnabled`). Text/path pins: `scripts/test-cloud-personal-flow.ts`, `scripts/test-cloud-protocol.ts`, `scripts/test-connection-history.ts`, `test/automations-transport.test.mjs`, `test/browser/connection-preference-storage.spec.ts`, `specs/quint/application/manifest.json`, `test/support/feature-parity.mjs`; `scripts/audit-production-bundle.ts` denies its markers.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-149 | A3 | Header: "DEVELOPMENT INFRASTRUCTURE ONLY. Not a product path … kept only as development fixtures for ELIZA_DEV_ALLOW_TEST_MOCKS=1 builds". PRD: no hosted-agent pairing. | Delete the file together with `connectionController.pair/cloudList/cloudPersonal*`, `cloud-personal-*.ts(x)` and the `'remote'|'local'|'cloud'` kinds (research a–m P4). | Medium: owner must accept that test-mocks builds stop demonstrating hosted agents; delete the scripts/tests listed above. |
| 2 | 11 | A8 | "owner directive 2026-10-13; issues #406 and #415" changelog comment. | Goes with the file. | — |
| 3 | 72-73, 84, 141 | D8 | 300-char conditions. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `CloudPhoneTarget` | interface | 19-22 | used by `connection-ui.tsx` only | deleted |
| `DevelopmentCloudAgentProtocol` | class | 23-149 | — | deleted |

## Proposed end state
File removed; `connection-ui.tsx` loses its import and the `testMocksEnabled` hosted branch.

## Verification
`npm run verify` (bundle audit marker list must drop this module's markers), `test/automations-transport.test.mjs` (rewrite against `LocalAgentProtocol` or delete), Quint application manifest entry removal.
