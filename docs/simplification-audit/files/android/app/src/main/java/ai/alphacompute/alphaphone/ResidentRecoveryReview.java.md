# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentRecoveryReview.java
- Lines: 13 | Role: single-use review token bound to lifecycle and credential-intent epochs for the resident record recovery flow | Verdict: KEEP (move with `ResidentLifecycle` split)
- Importers: `AlphaLocalAgentPlugin:131` (8 uses, all under `lifecycleLock`). Text/path pins: `test/resident-recovery-review.test.mjs` (javac + slices `AlphaLocalAgentPlugin`), `specs/quint/native/manifest.json`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-13 | C4 | One of ~30 epoch/staleness fences (token + two epochs). Clear, small, correct. | Keep; nest in `ResidentLifecycle` when it is extracted. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ResidentRecoveryReview` | class | 4-13 | `NavigationOpenRequest`, `NativeVoiceBinding` (same "captured epoch" shape) | `ResidentLifecycle` (nested) |

## Proposed end state
Unchanged.

## Verification
`test/resident-recovery-review.test.mjs`, recovery review instrumentation.
