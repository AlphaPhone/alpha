# apps/app/src/runtime/cloud-deployment.generated.ts
- Lines: 5 | Role: generated (by `scripts/cloud-deployment.ts` from `scripts/cloud-deployment-policy.ts`) production/staging Cloud authorities, the storage namespace fingerprint and `cloudStorageSlot()`. | Verdict: MOVE to `apps/app/src/generated/cloud-deployment.ts` (or keep path; content KEEP)
- Importers: `cloud-protocol.ts`, `native-connection.ts` (`cloudStorageSlot`), `connection-ui.tsx`, `browser-cloud-resident.ts`, `google-authorization.ts`, `google-workspace-return.ts`, `managed-service-routes.ts`, `browser/cloud-connection.ts`, `product/native-cloud-runtime.ts`; scripts `browser-cloud-dev-bridge.ts`, `cloud-email-code.ts`, `gmail-agent-read-host.ts`, `native-google-product-host.ts`.
  Text/path pins: written and `--check`ed by `scripts/cloud-deployment.ts:85` (first step of `npm run verify`); `android/app/product.gradle`; `scripts/source-snapshot.ts`; `specs/quint/services/manifest.json`; `specs/quint/refinement/{application/account-sheet.mjs,services/gmail-agent-mailbox-recovery-probe.mjs}`; tests `cloud-deployment.test.mjs`, `cloud-email-deployment.test.mjs`, `browser-cloud-dev-bridge.test.mjs`, `gmail-agent-read-host.test.mjs`, `white-label-copy.test.mjs`, browser specs `browser-cloud-dev`, `browser-credential-cas`, `connection-boundaries.production`; `test/support/feature-parity.mjs:481`, `test/support/managed-google-agent.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | D6 | Generated output checked into the hand-written `runtime/` folder. | Emit to `apps/app/src/generated/cloud-deployment.ts`; update the 13 importers, `scripts/cloud-deployment.ts:85`, `product.gradle`, the manifests/tests listed above. Do it together with other generated files (cross-file). | Low but wide path churn; the file must stay committed (verify `--check`s it). |
| 2 | 2-3 | — | `productionCloud`/`stagingCloud` are the authority source; `cloud-protocol.ts:31 CloudAuthority` re-declares their shape by hand. | Derive `CloudAuthority` from `typeof productionCloud` (change in cloud-protocol.ts). | None. |
| 3 | 5 | — | `cloudStorageSlot` rule (prefixes `cloud:`, `cloud-signin:`, `local-agent-provider:v1`) is a persisted key format. | KEEP byte-for-byte. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `productionCloud`/`stagingCloud` | const | 2-3 | Java `CloudDeployment` (generated twin, intentional), `CloudAuthority` type in `cloud-protocol.ts:31` | stays generated |
| `cloudStorageSlot` | helper | 5 | Java slot namespacing in `CloudDeployment.java` (generated twin) | stays generated |

## Proposed end state
Unchanged content (generator output); optionally relocated to a `generated/` folder. 5 lines.

## Verification
`node scripts/cloud-deployment.ts --check` (verify step 1), `test/cloud-deployment.test.mjs`, `test/browser/browser-credential-cas.spec.ts`, `test/browser/connection-boundaries.production.spec.ts`, Android build (`product.gradle`).
