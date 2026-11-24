# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotificationChannelsInstrumentedTest.java
- Lines: 68 | Role: blocks and re-allows a disposable notification channel in Android Settings, checks Alpha's Settings readback, then posts and taps a real notice in Android's shade | Verdict: SIMPLIFY
- Importers: none. Text/path pins: campaign `scripts/test-native-permissions.ts:61` (`testClass: "NotificationChannelsInstrumentedTest"`, gate `notificationChannels`); registry `scripts/android-instrumentation.ts:293` (campaign entry); `test/android-instrumentation-runner.test.mjs:72` (campaign list); `test/fixtures/isolated-native-campaign.mjs:18`. `test/gesture-zones-single-instance.test.mjs:34-39` scans every androidTest file for `['pointerdown',50]`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-39 | C3 | `toggle(checked,name)` — BFS for a Settings `Switch`, label check via siblings, climb ≤4 ancestors; same algorithm as `NotificationAccessTestDriver.access` (l.36-54). | Shared `SettingsSwitch.set(...)`. | Medium (Settings layout variance). |
| 2 | 48-50, 63, 66 | C3 | Owned `BroadcastReceiver` + `PendingIntent` + `registerReceiver(..., RECEIVER_NOT_EXPORTED)` SDK branch + `AtomicBoolean delivered` — identical block in `NotificationsInstrumentedTest.java:43-46` and `:77-82`. | `SyntheticNotice` helper (`post(channel,title)`, `delivered()`, `close()`) used by both classes. | Low. |
| 3 | 14, 15, 38, 42 | D8 | Diagnostics built inline in one 400-character method and repeated in `fail(...)` strings. | Formatter; one `diagnostic()` call. | None. |
| 4 | 17-18 | C3 | `back()` injects KEYCODE_BACK then waits for Alpha's package; `WebViewTestDriver.pressBack()` (l.49) exists. | Use `WebViewTestDriver.pressBack()` plus a shared foreground wait. | Low. |
| 5 | 62-63 | T8 | Two fixed-iteration `SystemClock.sleep(100)` loops for cancel/delivery, the first with no assertion. | Wait on the condition once, assert. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `nativeDiagnostic` | helper | 14 | none | keep |
| `until` | helper | 15 | ~60 copies | `WebViewTestDriver.until` |
| `click` (by text) | helper | 16 | PairedAsrLive:22 etc. | `WebViewTestDriver.click` |
| `back` | helper | 17-18 | `WebViewTestDriver.pressBack` | delete |
| `toggle` | helper | 19-39 | `NotificationAccessTestDriver.access` | `SettingsSwitch` |
| `channelState` | helper | 40-43 | none | keep |

## Proposed end state
One test using shared `SettingsSwitch`, `SyntheticNotice` and WebView helpers; Settings-specific channel assertions stay.
Estimated 68 → ~50 lines.

## Verification
`node scripts/test-native-permissions.ts channels APP.apk TEST.apk OUTPUT`; host
`node --test test/android-instrumentation-runner.test.mjs test/gesture-zones-single-instance.test.mjs`.
