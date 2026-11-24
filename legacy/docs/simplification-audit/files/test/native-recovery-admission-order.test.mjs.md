# test/native-recovery-admission-order.test.mjs
- Lines: 87 | Kind: transplant (seven marker slices of `apps/app/src/runtime/connection-ui.tsx`, compiled with esbuild into a React harness under JSDOM, with ~40 stub bindings) | Verdict: DELETE (with U-A8, legacy Cloud sign-in restore removal, D1)
- Covers: the "Restore saved sign-in" legacy recovery (`restoreSavedSignIn`, `savedSignInRecoveryStatus`, `legacySignInRecovery`) hands off to normal admission once, honours cancel, refusal and recovery-required states. Duplicates: `test/chooser-direct-entry.test.mjs`, `test/auth-copy-native-cutout.test.mjs` mention the same control. Callers/importers: `npm test` glob only. Listed under `cross-file-actions.md` U-A8 "Tests".

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A1 | Covers a feature being deleted: Android `LegacyCloudRecovery` is already gone from `android/app/src/main`; renderer remnants (`cloud-sign-in.ts:49-50`, `connection-ui.tsx:120,2835,3672,3880`) go in U-A8. | Delete together. | None |
| 2 | 7-18 | T2 | Seven slices of the largest renderer file. | Gone. | None |
| 3 | 48, 54-55 | T8 | Polling `until` with 2 ms sleeps and fixed 10-30 ms waits. | Gone. | None |

## Proposed end state
File deleted in the same change as the renderer half of U-A8.
