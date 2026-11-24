# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNavigationService.java
- Lines: 276 | Role: location-type foreground service that keeps an explicitly started Maps navigation session alive with the screen off, owns the session registry (static), and posts the ongoing notification with "End navigation". | Verdict: SIMPLIFY (small)
- Importers: `AlphaMapsTransportPlugin.java` (start/update/stop/declared/locationGranted/activeSession/SESSION_PATTERN/StopListener), `MainActivity.java` (`ACTION_SHOW_MAPS`), `AlphaNotificationsPlugin.java` (`CHANNEL`), `AndroidManifest.xml` (both manifests). Text/path pins: androidTest `MapsBackgroundNavigationInstrumentedTest:86-96` (`snapshot()`), `test/native-plugin-teardown.test.mjs`, `test/support/feature-parity.mjs`, `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/{NavigationServicePorts.java,NavigationServiceTraces.java,navigation-service.mjs,assistant-entry-platform.mjs,main-activity-platform.mjs}`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-71, 94-95, 119-120, 142-143 | D6, P12 | `stopCount`, `lastStopReason`, `lastTitle`, `lastText` and `snapshot()` ("Instrumentation-visible state") exist only for `MapsBackgroundNavigationInstrumentedTest` and `NavigationServiceTraces`; production never reads them. | Delete the four statics, their writes and `snapshot()` (~10 lines); the instrumented test asserts on the posted notification (`NotificationManager.getActiveNotifications`) and `activeSession()` instead; the Quint trace reads `activeSession()`. | Medium: Quint navigation refinement must be updated in the same change. |
| 2 | 77, 202-203 | B4 | `return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || ...` and `if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) startForeground(..., TYPE_LOCATION); else startForeground(...)`. The app minSdk is 29 = Q (`android/app/src/main/AndroidManifest.xml:35` "API 29, minSdk"), so the pre-Q branches are unreachable. | Drop the `< Q` operand and the `else` branch (3 lines). | none |
| 3 | 148-150 | D4 | `notifyStopped` is a null-guard wrapper used 4 times. | Keep (it is the single delivery point); fine. | — |
| 4 | 157-163 | B1 | `catch (RuntimeException backgroundRestricted)` falling back to `stopService` — documented Android restriction. | Keep. | — |
| 5 | 31, 33-36 | C6 | Installed identities (`CHANNEL="alpha.maps.navigation"`, actions). | Keep values; fine as the owner class. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `StopListener` | interface | 40 | none | here |
| `Session` | class | 42-58 | none | here |
| `bounded(String)` | helper | 173-177 | `AlphaMapsTransportPlugin.text` (subset) | here; delete the plugin's copy |
| `SESSION_PATTERN` | const | 37 | none | here |

## Proposed end state
~258 lines: session registry, foreground service, notification; no instrumentation-only statics. Formatting is already readable (one of the few multi-line files).

## Verification
`MapsBackgroundNavigationInstrumentedTest` (rewrite assertions), Quint `navigation-service.mjs` refinement, Android build both flavors, emulator screen-off navigation run (notification Stop and task removal).
