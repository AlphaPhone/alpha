# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PasswordVaultSettingsInstrumentedTest.java
- Lines: 147 | Role: Settings > Passwords journey on an emulator: unlock via device credential, add typed and generated entries, search, Show (Android surface), Copy, Lock, inactivity lock, lock on leaving; secret never in DOM/storage/logcat | Verdict: KEEP
- Importers: none. Text/path pins (T1): `scripts/android-instrumentation.ts:235` (gate `passwordVault`); `test/android-instrumentation-runner.test.mjs:571` `type\("Add website", website\)` (l.70) and `:572` exactly 2 matches of `\.example\.invalid", (typedSecret|null)\)` (l.93, 95).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-48 | C3 | `eval`, `until`, `control`, `press`, `field`, `type` — the most complete version of the WebView helper set; others re-implement subsets (~60 files). | Promote these to `WebViewTestDriver` (`control(name)` scoped to `[data-screen]`, excluding `[inert]`) and make other files use them. | Low. |
| 2 | 89 | B4 | `assertTrue(..., "true".equals(eval("!!(" + control(...) + ")")))` — `until(control(...))` would read the same. | Use `until`. | None. |
| 3 | 123, 135 | C3 | Back buttons clicked by raw querySelector with `?.click()` (silently no-op if missing) instead of `press(...)`. | `press("Back to Passwords")` / `press("Back to Settings")`. | Low (now asserts the button exists). |
| 4 | 131 | T8 | 90 s wait (`900` tenths) for the inactivity lock. | Keep; the unlock window is product time. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval`/`until`/`control`/`press`/`field`/`type` | helper | 31-48 | ~60 androidTest files (subsets) | `WebViewTestDriver` |
| `assertNotInDom` | helper | 50-52 | none | keep |
| `openPasswordManager`/`unlock`/`addEntry` | helper | 53-75 | none | keep |

## Proposed end state
Same journey; generic helpers move to `WebViewTestDriver` (this file supplies the reference implementation).
~120 lines. Lines 70, 93, 95 must keep their pinned text until the runner test's T1 assertions go.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --avd NAME --classes PasswordVaultSettings`; host runner test.
