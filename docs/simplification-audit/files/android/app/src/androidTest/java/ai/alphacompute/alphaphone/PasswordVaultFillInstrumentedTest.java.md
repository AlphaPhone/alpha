# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PasswordVaultFillInstrumentedTest.java
- Lines: 134 | Role: Alpha's vault as the Android Autofill service (AP-10): save via Android's Save prompt, fill only the exact package after the device credential, refuse another package, Cancel fills nothing, re-lock after the unlock window | Verdict: KEEP
- Importers: none. Uses `PasswordVaultFixture`, `PasswordFillFixtureActivity`, `WebViewTestDriver.withActivity`.
  Text/path pins (T1, exact text): `scripts/android-instrumentation.ts:236` (gate `passwordVaultFill`); `test/android-instrumentation-runner.test.mjs:551,569` (registered, gated, not default), `:584-587`: `doesNotMatch(/By\.pkg\(Pattern\.compile\("com\\\.android/)`, **exactly 3** lines matching `^\s+PasswordVaultFixture\.confirmDeviceCredential\(\);$` (l.80, 89, 100), and the literal `asks for the device credential before listing sign-ins", PasswordVaultFixture.credentialPromptShown(10_000)` (l.126). `AndroidManifest.xml:18` comment names the class.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 121 | T8 | `SystemClock.sleep(65_000)` waits out the unlock window. | Keep unless the vault exposes a test-mocks clock; note the 65 s cost in the registry. | — |
| 2 | 102 | T8 | `SystemClock.sleep(1000)` before asserting the form stayed empty. | Keep (negative proof); name the constant. | — |
| 3 | 42 | C6 | `FILL_OFFER = "Fill with a saved password"` duplicates `PasswordBrowserFillInstrumentedTest.OFFER` (l.38). | One shared constant. | None. |
| 4 | 92 | T8 | Fixed 50×100 ms loop then `assertEquals`. | Shared `until`. | None. |
| 5 | 80, 89, 100, 126 | T1 pin | The runner test counts the exact `confirmDeviceCredential();` lines and a literal assertion string. Any refactor (e.g. a `fillWithCredential()` helper) breaks it. | When T1 tests are retired, delete `test/android-instrumentation-runner.test.mjs:571-587`; until then keep these lines verbatim. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SERVICE` | const | 40 | `PasswordBrowserFillInstrumentedTest.java:196` builds the same component string | shared `PasswordUi.SERVICE` |
| `TEST_PACKAGE`, `FILL_OFFER` | const | 41-42 | FILL_OFFER: PasswordBrowserFill:38 | shared |
| `launchForm`/`find`/`status`/`offer` | helper | 45-60 | none | keep |

## Proposed end state
Unchanged journey (it is real device evidence for AP-10); constants shared with PasswordBrowserFill. ~130 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --avd NAME --classes PasswordVaultFill`; host
`node --test test/android-instrumentation-runner.test.mjs`.
