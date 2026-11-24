# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PasswordFillFixtureActivity.java
- Lines: 51 | Role: test-APK-only native sign-in form (separate package/signer) so Android's Autofill Save/Fill can be exercised; status line shows user + SHA-256 of the password | Verdict: KEEP
- Importers: `PasswordVaultFillInstrumentedTest.java` (USERNAME/PASSWORD/SIGN_IN/STATUS/expectedStatus). Text/path pins: declared in `android/app/src/androidTest/AndroidManifest.xml:18-20`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-29 | B1 / C3 | `sha()` catches `Exception` and returns `"unavailable"`; SHA-256 is mandatory on Android, so the fallback is unreachable and would make a fill check pass/fail silently. Also a twin of the ~30 SHA-256-hex copies in androidTest. | Use a shared `TestDigests.sha256Hex` that throws. | None. |
| 2 | 40-44 | KEEP | Anonymous `TextWatcher` with two empty methods — required by the interface. | Keep. | — |
| 3 | 32-47 | D8 | Several statements per line. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `USERNAME`/`PASSWORD`/`SIGN_IN`/`STATUS` | const | 22 | none | keep |
| `sha` | helper | 23-29 | NotesSecureStorage:26, PairedMaps:27, PairedReminder:27, PhotosTestFixture:31, PhotoFilter:32 | `TestDigests.sha256Hex` |
| `expectedStatus` | helper | 50 | none | keep |

## Proposed end state
Unchanged form; `sha` replaced by the shared digest helper. ~45 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes PasswordVaultFill`.
