# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotificationsInstrumentedTest.java
- Lines: 137 | Role: real Android notices shown and tapped in Android's own shade (Alpha draws none), a cancelled target never dispatching its neighbour, and opaque bounded own-notification identities from `AlphaNotifications.list` | Verdict: SIMPLIFY
- Importers: none. Uses upstream `ai.eliza.plugins.reminders.ReminderTestAccess` (androidTest, upstream package), `AndroidShade`, `AppNavigation`.
  Text/path pins: `scripts/android-instrumentation.ts:214` (`Notifications: { requiresTestMocksBuild: true, … }`); `test/android-instrumentation-runner.test.mjs:143-160` requires the text `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` (requiresTestMocksBuild) and `:647-655` forbids the strings `"Choose folder"`/`"Scan mode"` in every registered class; `test/gesture-zones-single-instance.test.mjs:34-39`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-46, 73-82 | C3 | Both shade tests repeat: grant `POST_NOTIFICATIONS`, `ReminderTestAccess.channel`, receiver + `PendingIntent` + SDK-33 `registerReceiver` branch; same block in `NotificationChannelsInstrumentedTest.java:48-50`. | `SyntheticNotice` helper (finding 2 of NotificationChannels). | Low. |
| 2 | 48, 66, 84 | C3 | `until("document.querySelector('[data-screen]')&&!document.querySelector('.alpha-connection-scrim')")` after `AppNavigation.request("Home")` repeated 3×. | `AppNavigation.open("Home")`. | None. |
| 3 | 96-100 | C3 | `call(expression)` window-global bridge await — 8 copies (see NotificationAccessTestDriver finding 2). | `WebViewTestDriver.nativeCall`. | None. |
| 4 | 104-106, 114-115 | D8 | Fully-qualified `android.app.NotificationManager`, `ai.eliza.plugins.reminders.ReminderTestAccess`, `android.app.Notification` although both are imported (l.2, l.4). | Use the imports. | None. |
| 5 | 39, 72 vs 103 | T4? | Tests 1-2 assume a test-mocks build; test 3 has no assumption but the registry requires a test-mocks build for the class. | Fine as is; no change. | — |
| 6 | 89 | T8 | `SystemClock.sleep(500)` to prove "no dispatch" (negative wait). | Keep (a negative needs a bounded wait); name the constant. | — |
| 7 | 110 | B2-like | Polls `Boolean(window.Capacitor?.Plugins?.AlphaNotifications)` 100×; the plugin is registered by `MainActivity` on every build. | Delete the poll; `AppNavigation.liveMode()` already waits for the bridge. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 25 | ~60 copies | `WebViewTestDriver.until` |
| `present` | helper | 26 | NotificationChannels:62,64 (inline stream) | `SyntheticNotice.posted()` |
| `openShade` | helper | 31-37 | NotificationChannels:58-60 (inline) | `AndroidShade.openFromHome()` |
| `call` | helper | 96-100 | 8 copies | `WebViewTestDriver.nativeCall` |

## Proposed end state
Three tests kept (they are real end-to-end device evidence), sharing `SyntheticNotice`, `AndroidShade.openFromHome`
and the bridge helper. Estimated 137 → ~110 lines.

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes Notifications` (both flavors); host runner tests above.
