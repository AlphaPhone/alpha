# android/app/src/main/java/ai/alphacompute/alphaphone/LegacyCloudRecovery.java
- Lines: 82 | Role: explicit restore of a pre-namespace `cloud:production` sign-in slot into the namespaced deployment slot | Verdict: DELETE (owner decision P5/A1)
- Importers: `AlphaCredentialStore` (`legacyRecovery()` :135, snapshot :203, comment :79) and `ResetBeforeDispatch` (`LEGACY_NAMESPACE` :45). Text/path pins: `test/legacy-cloud-recovery.test.mjs`, `test/fixtures/legacy-cloud-recovery/{LegacyCloudRecoveryTest,RendererRecoverySlotsTest,StoreIntegrationTest}.java`, `test/power-cold-native-pin.test.mjs`, `test/reset-cloud-revocation.test.mjs`, `test/reset-wiring.test.mjs`, `scripts/cloud-deployment.ts:96` (error text names `LegacyCloudRecovery`), `specs/quint/refinement/native/credential-coordinator.mjs`, `saved-sign-in-recovery.mjs`, `specs/quint/refinement/services/credentials.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-82 | A1 | Reads `CLOUD="cloud:production"` un-namespaced, written only by builds before deployment namespacing. The package was renamed to `ai.alphacompute.alphaphone` on 2026-11-10 and starts with empty private data (`docs/prd.md:55-58`, `README.md:76-80`), so no install of this package can hold that slot. | Delete the file with `AlphaCredentialStore` legacy branches (:79-80, 105, 135, 180, 196-216, 239), `AlphaCloudSignInPlugin.savedSignInRecoveryStatus/restoreSavedSignIn` (:74-125) and their renderer callers, `ResetBeforeDispatch` legacy step, the tests listed above, and the `LegacyCloudRecovery` mention in `scripts/cloud-deployment.ts:96`. | Medium: a pilot phone that sideloaded a pre-namespace build of the *new* package would lose its saved sign-in (re-sign-in, no data loss). Verify against the pilot inventory first. |
| 2 | 9, 24 | C6 | Hard-codes the namespace fingerprint already generated into `CloudDeployment.STORAGE_NAMESPACE` (identical value today, so `compatible()` is always true). | Goes with the delete. | — |
| 3 | 10-12 | C6 | Re-declares `"cloud:production"` and `"local-agent-provider:v1"`. | Goes with the delete. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Snapshot` | class | 54-58 | — | deleted |
| `LEGACY_NAMESPACE` | const | 9 | `CloudDeployment.STORAGE_NAMESPACE` (same string) | deleted |
| `JOURNAL` | const (persisted slot name `cloud-signin:legacy-recovery:v1`) | 10 | — | deleted |

## Proposed end state
File removed (0 lines). `AlphaCredentialStore` loses its recovery API; the Cloud sign-in screen loses "restore saved sign-in".

## Verification
After delete: `npm run verify` (drops the legacy tests), `CloudSignInCallbackInstrumentedTest`, `ConnectionInstrumentedTest`, Quint credential-coordinator refinement with the recovery actions removed from the model.
