# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LauncherHomeInstrumentedTest.java
- Lines: 273 | Role: launcher variant held as HOME: All-apps drawer search/launch, HOME returns, Settings and default-Home chooser reachable, relaunch keeps one instance, stock dialer in two taps, renderer kill recovery. | Verdict: SIMPLIFY
- Importers: none (calls `ChatContinuityInstrumentedTest.alphaIsHome`, `RendererRecoveryInstrumentedTest.killHostRenderer/awaitRecovered/finishRecreated`). Text/path pins: `scripts/android-instrumentation.ts:183` (`homeRole: "held"`); `test/android-instrumentation-runner.test.mjs:78-81,215,319-388` (runner HOME-role flow names the class); `scripts/owner/emulator-campaign-check.ts:40`; `test/owner-emulator-campaign-check.test.mjs:45`; mentioned in comments in `RendererRecoveryInstrumentedTest.java:22`, `AlphaDevicePlugin.java`, `test/device-plugin-diagnostics.test.mjs:5`, `test/browser/home-*.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 67-72 | C3 | `pressHome()` duplicates `WebViewTestDriver.pressBack()` (`WebViewTestDriver.java:49-58`) except for the key code; 11 androidTest files inject key events. | `WebViewTestDriver.pressKey(int keyCode)`; `pressBack()` delegates. | Low |
| 2 | 41, 55-66 | C3 | `foreground()` parses `dumpsys activity activities` for the resumed package; 12 androidTest files parse the same dump (`WebViewTestDriver.cancelDocumentPicker`, `NotesDocumentInstrumentedTest.awaitDocumentPicker`, ...). | `AndroidShade`/`WebViewTestDriver.resumedPackage()` shared helper. | Low |
| 3 | 105-108, 134-137, 170-173, 195-198, 239-242, 261-265 | C3 | The same "launch, `AppNavigation.liveMode()`, request Home, wait Home ready and not inert" 4-line prelude six times. | Private `openHome()` helper. | None |
| 4 | 45-48 | D10 | Depends on another test class's static (`ChatContinuityInstrumentedTest.alphaIsHome`). | Move `alphaIsHome` to `AppNavigation` or a `HomeRole` helper. | Low |
| 5 | 50-54 | C3 | Local `eval`/`until` copies. | Shared driver. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `pressHome()` | helper | 67-72 | `WebViewTestDriver.pressBack()` | `WebViewTestDriver.pressKey` |
| `foreground()`/`TOP` | helper/const | 41, 55-61 | `WebViewTestDriver.cancelDocumentPicker:39-41`, `NotesDocumentInstrumentedTest.awaitDocumentPicker:46-49` | shared `resumedPackage()` |
| `assertOneMainActivity` | helper | 83-98 | lifecycle scans in `WebViewTestDriver.withActivity`, `InboxDraftInstrumentedTest.activity` | keep local |
| `alphaIsHome` (external) | helper | 47-48 | `ChatContinuityInstrumentedTest` | `HomeRole` helper |

## Proposed end state
Same six journeys; `openHome()` prelude, shared key/foreground helpers; about 230 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --avd NAME --serial emulator-NNNN --variants launcher --home-role --classes SettingsRoles,LauncherHome` (emulator HOME-role test, not device acceptance); `node --test test/android-instrumentation-runner.test.mjs test/owner-emulator-campaign-check.test.mjs`.
