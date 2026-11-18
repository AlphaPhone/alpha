# android/app/src/androidTest/java/ai/alphacompute/alphaphone/MapsBackgroundNavigationInstrumentedTest.java
- Lines: 146 | Role: screen-off navigation through `AlphaNavigationService` with simulator GPS; notification Stop ends the session once, survives a second bridge. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/maps/test-native-navigation.ts:32` (runs `#screenOffGuidanceContinuesAndNotificationStopEndsOnce` with `-e mapsBackground 1`, phase files `maps-navigation-phase.txt`/`maps-navigation-ack.txt`). Production hooks used: `AlphaNavigationService.declared/snapshot/NOTIFICATION_ID` (main source, "Instrumentation-visible state" — android research P12).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49-60 | C3/T6 | `watches()` reads the private `watches` field of upstream plugin `ElizaLocation` by reflection; the same block is copied in `MapsInstrumentedTest.java:73`, `MapsRegionalInstrumentedTest.java:66-73` (4 files). | One `MapsTestDriver.watches()` helper (still reflective — upstream exposes no count). | Low |
| 2 | 38-48 | C3 | `phase(String)` file handshake is a copy of `MapsRegionalInstrumentedTest.navigationPhase` (L59-65). | `MapsTestDriver.phase`. | Low |
| 3 | 24-37 | C3 | `js/waitFor/click/input` copies of `MapsRegionalInstrumentedTest.java:14-21`. | `MapsTestDriver`. | Low |
| 4 | 61-64 | C3 | `shell(command)` drain helper; similar shell readers in `LauncherHomeInstrumentedTest`, `NotesDocumentInstrumentedTest`, `WebViewTestDriver`. | Shared `Shell.run`. | Low |
| 5 | 86, 90, 96 | D6/P12 | Depends on `AlphaNavigationService.snapshot()` (string array positions `[0..3]`) kept in main source for instrumentation. | When P12 moves hooks to testMocks, keep this array contract or switch to a named record. | Medium |
| 6 | 141 | B1 | `catch (Exception ignored) { /* best effort */ }` in cleanup — acceptable in test teardown. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `watches()` | helper | 49-60 | `MapsInstrumentedTest:73`, `MapsRegionalInstrumentedTest:66-73` | `MapsTestDriver` |
| `phase()` | helper | 38-48 | `MapsRegionalInstrumentedTest.navigationPhase:59-65` | `MapsTestDriver` |
| `js/waitFor/click/input` | helper | 24-37 | `MapsRegionalInstrumentedTest:14-21`, `MapsInstrumentedTest:27-30` | `MapsTestDriver` |
| search-and-directions prelude | helper | 79-84 | `MapsRegionalInstrumentedTest:39-47, 81-86, 136-138` | `MapsTestDriver.routeToCasino()` |

## Proposed end state
Same journey on a new androidTest `MapsTestDriver` (UI helpers, GPS phase handshake, native watch count, Casino route prelude). About 115 lines.

## Verification
`node scripts/maps/test-native-navigation.ts` on an owned emulator with simulator GPS (emulator evidence only).
