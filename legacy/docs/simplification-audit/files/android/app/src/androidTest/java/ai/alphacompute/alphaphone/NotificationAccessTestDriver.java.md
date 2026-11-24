# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotificationAccessTestDriver.java
- Lines: 57 | Role: shared steps for the cross-app notification tests (AlphaNotifications bridge call, Android notification-access Settings toggle, fixture-app witness, feed lookups) | Verdict: KEEP (SIMPLIFY helpers into shared drivers)
- Importers: 2 — `CrossAppNotificationsInstrumentedTest.java`, `CrossAppNotificationsRestartInstrumentedTest.java`. Text/path pins: none found (grep of `test/`, `scripts/`, `specs/` for the class name: 0 hits). Depends on `android/notification-fixture` package ids `ai.alphacompute.notificationfixture.selected/excluded` (l.14) built by `scripts/build-notification-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | C3 | `waitFor(Callable<Boolean>,label)` — research P20 counts 13 private `waitFor(` copies in androidTest. | Move to one `TestWait.until(Callable, timeout, label)` and delete copies. | None. |
| 2 | 18-23 | C3 | `bridge(method,data)` = `Capacitor.nativePromise(...)` into a window global then poll; same mechanism as `NotificationsInstrumentedTest.call` (l.96-100), `PhotoEditInstrumentedTest.call` (l.20), `PhotoLibraryInstrumentedTest.call` (l.28-32), `PhotosBatchInstrumentedTest.nativeCall` (l.31-34), `PhotosForeignLibraryInstrumentedTest.call` (l.19-27), `PairedAsr/PairedVoice.call` (l.21-24), `NotesSecureFixture.call`. | One `WebViewTestDriver.nativeCall(plugin, method, JSONObject)` returning `{ok,value|error}`; delete the eight copies. | Low; each copy differs only in the global name and which fields it deletes (`image`, `path`) — keep that as an optional redaction list. |
| 3 | 36-54 | C3 / D8 | `access(grant)` BFS over the Settings window for one checkable `Switch` and climbs to a clickable ancestor (<8 children). `NotificationChannelsInstrumentedTest.toggle` (l.19-39) is the same algorithm with a label filter. | Extract `SettingsSwitch.set(boolean checked, String rowLabel /*nullable*/)` in androidTest and use it in both. | Medium: Settings layouts differ per API level; keep both label rules. |
| 4 | 27-30 | C3 | `foreground()` — "relaunch MainActivity and wait for root package" pattern; also in `NotificationChannelsInstrumentedTest.back()` (l.17-18). | Shared `AppForeground.await()`. | Low. |
| 5 | 50 | D8 | One 380-character loop with nested for/if. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SELECTED`/`EXCLUDED` | const | 14 | `android/notification-fixture` applicationIdSuffix config | keep |
| `context`/`ui` | helper | 15-16 | inline everywhere | keep |
| `waitFor` | helper | 17 | 13 copies (research P20) | `TestWait` |
| `bridge`/`value` | helper | 18-23 | 8 copies (finding 2) | `WebViewTestDriver.nativeCall` |
| `access` | helper | 36-54 | `NotificationChannelsInstrumentedTest.toggle` | `SettingsSwitch` |
| `external`/`foreignCount` | helper | 55-56 | none | keep |

## Proposed end state
A ~35-line driver: the cross-app-specific steps (`witness`, `policy`, `feed`, `external`, `foreignCount`, `access` calling
a shared `SettingsSwitch`) remain; generic wait/bridge/foreground helpers move to the shared WebView/test drivers.
Kept only if the cross-app notification campaign (`scripts/test-cross-app-notifications.ts`, manual, no CI) is kept.

## Verification
`node scripts/test-cross-app-notifications.ts` (manual campaign; builds `android/notification-fixture`).
