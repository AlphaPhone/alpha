# android/app/src/main/java/ai/alphacompute/alphaphone/HostedStorageFault.java
- Lines: 3 | Role: Checked exception for encrypted result-storage failures. | Verdict: MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/HostedInbox.java
- Importers: `HostedDelivery`, `HostedInbox`. Text/path pins: `specs/quint/refinement/native/{HostedInboxTraces.java,deletion-coordinator,hosted-inbox,resident-coordinator}.mjs`; `test/native-notification-session.test.mjs`, `test/resident-result-transport.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 | Two-line exception class in its own file. | Nested `HostedInbox.StorageFault`; update Quint harness references. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
File removed. Estimated lines after: 0.

## Verification
Same as HostedInbox.
