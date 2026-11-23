# android/app/src/main/java/ai/alphacompute/alphaphone/ResetRecoveryActivity.java
- Lines: 18 | Role: installed recovery activity (own `:reset_recovery` process) binding the shared `DataResetRecoveryActivity` to Alpha's reset and copy | Verdict: KEEP
- Importers: manifest, `AlphaDataReset` (2). Text/path pins: `test/reset-startup.test.mjs`, `test/reset-wiring.test.mjs`, `specs/quint/native/manifest.json`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | A8 | "(issue #409)" reference. | Drop. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PROCESS_SUFFIX` | const | 15 | manifest `android:process` | here |

## Proposed end state
Unchanged.

## Verification
`test/reset-wiring.test.mjs`, reset recovery instrumentation.
