# android/app/src/main/java/ai/alphacompute/alphaphone/InvocationOwnerCache.java
- Lines: 32 | Role: Versioned in-memory cache of the listener invocation owner with credential-expiry deadline. | Verdict: KEEP
- Importers: `AlphaLocalAgentPlugin:185-194`. Text/path pins: `specs/quint/refinement/native/resident-coordinator.mjs`; `test/invocation-owner-cache.test.mjs`, `test/agent-always-local.test.mjs`, `test/legacy-cloud-recovery.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26 | B1 | `catch(Exception unavailable){return null;}` - documented (failed read returned but not cached). | Keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Owner | class | 13 | - | stay |
| Reader | interface | 14 | - | stay |

## Proposed end state
Unchanged. Estimated lines after: 32.

## Verification
`test/invocation-owner-cache.test.mjs`.
