# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CloudDeploymentStorageInstrumentedTest.java
- Lines: 54 | Role: real Keystore slot format: `AlphaCredentialStore` reads only the current-deployment namespaced slot (`CloudDeployment.storageSlot`), ignores un-namespaced and foreign-deployment slots, compare-exchange semantics, ciphertext does not contain plaintext. | Verdict: SIMPLIFY (rename legacy wording; decide with P5)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:191` (`CloudDeploymentStorage: {}`); research lists it among the upgrade/legacy suites (android.md P5).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28, 46 | A1 | Seeds a pre-namespace raw slot `raw.write("cloud:production","{\"token\":\"synthetic-legacy\"}")` and asserts it stays untouched and unread. This is the negative half of `LegacyCloudRecovery`/`readLegacySlotBeforeAttach` (`ResetBeforeDispatch.java:46`) | If the owner deletes the P5 legacy recovery: keep the assertion that an un-namespaced slot is never read (it is the namespace isolation rule), rename the fixture value `synthetic-unnamespaced`; if not, no change | Low |
| 2 | 24 | C6 | Hard-codes the store's file name and key alias `"connection-credentials"`, `"alpha.connection.aes.v1"` and the 256 KiB cap | Use `AlphaCredentialStore` constants (expose them package-private) so the test fails on intent, not on a duplicated literal | Low |
| 3 | 50-53 | C3 | Recursive `remove(File)` directory delete — same walker in several storage tests | Shared `TestFiles.deleteTree` | None |
| 4 | 25 | C6 | `"cloud:production"` literal (32× in main per research P6) | Use the single slot constant once P6 introduces it | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `ContextWrapper` isolating `getNoBackupFilesDir` | helper | 20-23 | other storage tests construct isolated contexts | `TestContexts.isolated(dir)` if a second user exists, else keep |
| `remove(File)` | helper | 50-53 | storage tests' tree deletes | `TestFiles.deleteTree` |

## Proposed end state
Keep one test (storage namespace isolation is a live rule). Replace literals with store constants and the tree delete
with a shared helper; rename "legacy" wording. Estimated 54 -> ~45 lines.

## Verification
`--classes CloudDeploymentStorage`; re-run after any P5 change to `AlphaCredentialStore`/`LegacyCloudRecovery`.
