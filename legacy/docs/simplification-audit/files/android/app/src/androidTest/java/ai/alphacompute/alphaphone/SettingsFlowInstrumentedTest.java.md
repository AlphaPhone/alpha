# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SettingsFlowInstrumentedTest.java
- Lines: 140 | Role: launcher "Android settings" row opens Android's own Settings and Back returns; About shows the installed version; dark theme survives recreation and (phased) process restart. | Verdict: SIMPLIFY
- Importers: none. Registry `SettingsFlow` (`scripts/android-instrumentation.ts:286`); `scripts/test-native-restart.ts:104-105` (`themeProcessRestartPhase`, arg `themePhase`); `scripts/owner/emulator-campaign-check.ts:41,57`. Text/path pins: `test/android-instrumentation-runner.test.mjs:613` (class, method, `themePhase`, phases), `test/fixtures/isolated-native-campaign.mjs:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-24 | C3 | `shell(command)` (UiAutomation `executeShellCommand` → string) — copied in 25 androidTest files (SettingsRoles:32, SettingsSystemFacts:22, ShareFlowAssertions:41,55, ShellInstrumentedTest:78 …). | `TestShell.run(command)` in androidTest. | None. |
| 2 | 81-83 | C3 | "is package X the top resumed activity" via `dumpsys activity activities` + `topResumedActivity` — same scan in 11 files (ShareFlowAssertions:43,57; ShellInstrumentedTest:89-97; SettingsRoles:89). | `TestShell.topResumed()` returning the component. | Low (different files match slightly different lines; unify on `topResumedActivity`). |
| 3 | 25-33, 91-94 | C3 | Local `until`, `click(label)` (aria-label only) and `press(name)` (aria-label-or-text, visible, enabled, not inert) — two click helpers in one file. | Keep one: `press` semantics moved to `WebViewTestDriver.clickButton`; delete `click`. | Low. |
| 4 | 34-50 | — | `tapBack` injects a real touch at the Back button centre after a hit-test. | Keep (real input path; distinct from JS click). Could move to driver as `tap(selector)` for reuse. | — |
| 5 | 5 | NEW (dead import) | `import android.os.Build;` unused. | Delete. | None. |
| 6 | 73 | — | Asserts eight removed Settings rows are absent ("Wi-Fi", "Battery", "Models", …) — PRD-shape guard. | Keep; also asserted by browser specs? (owner may drop one side; T4 candidate, low value). | — |
| 7 | 105, 121 | C6 | `'alpha.appearance.v1'` storage key literal (renderer owns it). | Keep in test (it is the persisted format being asserted); reference in a comment where the renderer constant lives. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `shell` | helper | 22-24 | 25 androidTest files | `TestShell` |
| `until`, `click`, `press` | helper | 25-33, 91-94 | ~70 pollers; click variants in SettingsNative/Roles/CrashLog/SelectedDocument | `WebViewTestDriver` |
| `tapBack` | helper | 34-50 | none (touch injection) | keep or `WebViewTestDriver.tap` |
| `BG` | const | 95 | none | keep |

## Proposed end state
~105 lines: three tests on shared shell/driver helpers; restart phase names and `alpha.appearance.v1` assertions unchanged.

## Verification
`node scripts/android-instrumentation.ts --classes SettingsFlow` (both variants); `node scripts/test-native-restart.ts theme …`;
`node --test test/android-instrumentation-runner.test.mjs`.
