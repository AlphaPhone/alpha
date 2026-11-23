# android/app/src/main/java/ai/alphacompute/alphaphone/GoogleWorkspaceReturn.java
- Lines: 99 | Role: Pure contract for the Google Workspace App Link return: callback URL, binding, pending state, callback parsing and admission. | Verdict: KEEP
- Importers: `AlphaConnectionPlugin`, `AlphaCredentialStore`, `GoogleWorkspaceReturnFlow`, `LegacyCloudRecovery`; `product.gradle` and manifest pin `PATH`. Text/path pins: `android/app/product.gradle`; `AndroidManifest.xml` (App Link path); `specs/quint/refinement/{native/credential-coordinator,services/credentials}.mjs`; `test/google-workspace-return-flow.test.mjs`, `test/google-workspace-return-native.test.mjs`, `test/workspace-return-fallback.test.mjs`, `test/legacy-cloud-recovery.test.mjs` + `test/fixtures/legacy-cloud-recovery/StoreIntegrationTest.java`, `test/power-cold-native-pin.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-28 | C3 | UUID regex (one of 4+ copies: AlphaLocalAgentPlugin:1127, NativeNotificationSession:51, PairedAgentCredential:23). | Shared `Ids.UUID` pattern. | none |
| 2 | 34-37 | C6 | Nonce regex `[A-Za-z0-9_-]{43}` also in `GoogleWorkspaceReturnFlow.java:112`. | Make `nonce(...)` package-visible (`isNonce`) and reuse. | none |
| 3 | 23-24 | D8 | Two blank lines. | Trim. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Binding/Pending/Callback | classes | 39-71 | - | stay |
| uuid/opaque/nonce | helpers | 25-37 | Ids util; GoogleWorkspaceReturnFlow:112 | Ids / stay |

## Proposed end state
Unchanged; ~96 lines. Estimated lines after: 96.

## Verification
`test/google-workspace-return-*.test.mjs`.
