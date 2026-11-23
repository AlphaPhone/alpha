# test/cloud-email-deployment.test.mjs
- Lines: 30 | Kind: tooling integration (copies `scripts/cloud-email-code.ts` into a temp tree with generated deployment outputs for a different tenant and imports it) | Verdict: MERGE into the `cloud-deployment` tooling file
- Covers: email-code send and verify bodies carry each configured tenant, S256 PKCE and the product client id. Duplicates: none; `cloud-email-resend.test.mjs` tests another function of the same module. Callers/importers: `npm test` glob only; `cloud-email-code.ts` is used by `scripts/browser-cloud-dev-bridge.ts` (dev bridge) and `scripts/quint-lib.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-30 | - | Small real check that a custom deployment reaches the dev bridge's email sign-in. Dev-only path (D6). | One case in the cloud-deployment suite. | Low |
| 2 | 13-19 | C3 | Temp-tree setup duplicates `cloud-deployment.test.mjs:167-174`. | Share one `withDeployment(config, fn)` helper in that file. | None |

## Proposed end state
Merged as one case of the cloud-deployment tooling suite, sharing its temp-deployment helper.
