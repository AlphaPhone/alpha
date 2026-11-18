# android/app/src/androidTest/java/ai/alphacompute/alphaphone/MapsInstrumentedTest.java
- Lines: 144 | Role: Maps with no provider: coordinate save/rename/persist/remove with no invented data; explicit Recenter releases the location watch; J04 Calendar-location hand-off returns to the same event and fails closed. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:240` (arg `mapsEventReturn`, note that names `explicitRecenterUsesInjectedNativeLocationAndStopsWatch` as skipped); `test/android-instrumentation-runner.test.mjs:628` (gate name). Literal `'alpha.maps.saved-places.v1'` and user-visible copy (`'Connect a Maps provider'`, the two `NOT_CONNECTED` strings, `'That event was deleted or moved'`) pin renderer copy.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61-80 | T9/A7 | `explicitRecenterUsesInjectedNativeLocationAndStopsWatch` assumes args `mapsLatitude`/`mapsLongitude`; no script or workflow passes them (grep over scripts/.github: 0 hits). Permanently skipped. `MapsRegionalInstrumentedTest.deniedLocationAllowsManualOriginAndExplicitPermissionRetry` already checks Recenter with real GPS and `watches(0)`. | Delete the method and the sentence in the registry note. | Low |
| 2 | 27-30 | C3 | `eval/until/click/input` copies (see Maps driver). | `MapsTestDriver`. | Low |
| 3 | 73 | C3/T6 | Reflective `ElizaLocation.watches` count (goes with finding 1). | - | - |
| 4 | 33 | C6 | `NOT_CONNECTED` pins two renderer strings from `maps-adapter.ts mapStatus`. | Keep (user-visible copy) but source from one constant if a Maps driver is introduced. | Low |
| 5 | 101-108, 140-141 | - | Calendar fixture insert/delete with sync-adapter URI; the same local-calendar fixture appears in `Calendar*InstrumentedTest` and `CalendarUiTestDriver`. | Use `CalendarUiTestDriver` fixture helpers if they cover account creation (check when touched). | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until/click/input` | helper | 27-30 | Maps* tests | `MapsTestDriver` |
| `maps()` | helper | 34 | Maps* tests (`liveMode`+request Maps) | `MapsTestDriver.open()` |
| local calendar fixture | helper | 101-108 | `CalendarUiTestDriver`, `Calendar*InstrumentedTest` | `CalendarUiTestDriver` |

## Proposed end state
Two methods (no-provider save/rename/remove; J04 event return). About 105 lines.

## Verification
`npm run test:android:instrumentation -- --classes Maps` (and with `-e mapsEventReturn 1` via the registry) on both variants; runner registry test.
