# android/app/src/main/java/ai/alphacompute/alphaphone/DeletionWorker.java
- Lines: 10 | Role: WorkManager worker that reconciles the native deletion coordinator after its delay. | Verdict: KEEP
- Importers: `NativeDeletionCoordinator` enqueues it. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/deletion-platform.mjs`; `test/native-deletion-admission.test.mjs`, `test/shared-deletion-window.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | B1 | `catch(Exception unavailable){return Result.retry();}` - documented retry policy. | Keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Unchanged. Estimated lines after: 10.

## Verification
Deletion window androidTests.
