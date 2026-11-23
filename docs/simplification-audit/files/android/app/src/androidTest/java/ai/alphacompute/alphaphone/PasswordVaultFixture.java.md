# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PasswordVaultFixture.java
- Lines: 101 | Role: owned-emulator fixture that sets/clears a synthetic screen-lock PIN and answers Android's device-credential prompt; shell and logcat helpers | Verdict: KEEP (minor)
- Importers: 2 — `PasswordVaultFillInstrumentedTest`, `PasswordVaultSettingsInstrumentedTest`.
  Text/path pins (T1): `test/android-instrumentation-runner.test.mjs:574-582` reads this file by path and asserts `set = true;[\s\S]*catch \(Throwable failed\) \{ close\(\); throw failed; \}` (l.43-46), `systemui:id\/lockPassword` (l.27), `isFocused\(\)[\s\S]*field\.setText\(PIN\)` (l.80-86), no `input text " + PIN`, no `By.pkg(BuildConfig.APPLICATION_ID).depth(0)`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | A7 | `import androidx.test.uiautomator.Until;` unused (0 uses of `Until.` in the file). | Delete the import. | None. |
| 2 | 32-36 | C3 | `shell()` (unbounded) twin of `PasswordBrowserFillInstrumentedTest.shell` (bounded, l.62-68) and 3 more. | Shared `DeviceShell.run`. | None. |
| 3 | 55-64 | C3 | `credentialPromptShown` / `credentialPromptGone` are the same poll with inverted predicate. | One `waitFor(boolean present, long timeout)`. Keep the public name `credentialPromptShown` (pinned by the runner test). | None. |
| 4 | 93-96 | KEEP | `logcatSince` comment says "app process only" but the command has no `--pid` filter (it reads all of logcat). | Fix the comment (wider scan is stricter, which is fine). | None. |
| 5 | 80, 84, 87 | KEEP | `StaleObjectException` catches implement the documented re-find/retry; specified behaviour. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PIN` | const | 22 | none | keep |
| `PROMPT_PACKAGES`, `CREDENTIAL_FIELD`, `FOCUSED_PROMPT_FIELD` | const | 23-29 | none | keep |
| `shell` | helper | 32-36 | PasswordBrowserFill:62-68, AccessibilityViews, Accessibility, AppInfo | `DeviceShell` |
| `device` | helper | 48 | inline `UiDevice.getInstance(...)` in many files | keep |

## Proposed end state
Same fixture minus the unused import and duplicated prompt poll; `shell` delegates to the shared helper.
~95 lines. Pinned regexes must keep matching until the runner test's T1 block is removed.

## Verification
`--classes PasswordVaultSettings` and `--classes PasswordVaultFill` on an owned emulator; host runner test.
