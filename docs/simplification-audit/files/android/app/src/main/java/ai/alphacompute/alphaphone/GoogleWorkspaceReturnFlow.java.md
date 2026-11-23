# android/app/src/main/java/ai/alphacompute/alphaphone/GoogleWorkspaceReturnFlow.java
- Lines: 116 | Role: Stateful flow for one pending Workspace return over a CAS store: prepare, capture eligibility, consume, cancel. | Verdict: SIMPLIFY
- Importers: `AlphaConnectionPlugin` (implements `Store` at 63-66; calls `manualReturn` at 95). Text/path pins: `specs/quint/refinement/native/credential-coordinator.mjs`; `test/google-workspace-return-flow.test.mjs`, `test/google-workspace-return-native.test.mjs`, `test/workspace-return-fallback.test.mjs`, `test/legacy-cloud-recovery.test.mjs`, `test/fixtures/legacy-cloud-recovery/StoreIntegrationTest.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-36 | C3 | SHA-256 + manual nibble-to-hex loop (third hex style in the codebase). | `Digests.sha256Hex(canonical)`; output stays lower-case hex (persisted `credentialHash`). | low |
| 2 | 16-20 | C1 | Local `Store` interface (credential/pending/comparePending) with one production implementation. | Keep (it is a CAS store, not the plain slot store); fine. | none |
| 3 | 112 | C6 | Nonce regex duplicate of `GoogleWorkspaceReturn.nonce`. | Reuse. | none |
| 4 | 70 | B1 | `pending(...)` returns null on any parse failure. | Specified (corrupt pending = no pending); keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Store | interface | 16-20 | HostedInbox.Store, HostedResultNotices.Storage (plain slot stores; different shape) | stay |
| credentialHash | helper | 26-38 | NativeProviderAdmission.sameCloudCredential tuple (upstream) | stay, hash via Digests |
| object | helper | 53-58 | strict single-JSON parse; similar in NativeProviderAdmission? | stay |

## Proposed end state
Same flow; hash and nonce reused; ~110 lines. Estimated lines after: 110.

## Verification
`test/google-workspace-return-flow.test.mjs`, `test/workspace-return-fallback.test.mjs`.
