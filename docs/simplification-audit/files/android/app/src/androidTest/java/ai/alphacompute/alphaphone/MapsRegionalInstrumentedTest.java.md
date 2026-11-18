# android/app/src/androidTest/java/ai/alphacompute/alphaphone/MapsRegionalInstrumentedTest.java
- Lines: 154 | Role: Maps against a configured regional (Monaco) gateway: transport capabilities/tile probe, tiles/search/routes/outside-coverage, foreground navigation with simulator GPS, denied-location retry, gateway outage recovery. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/maps/test-native-navigation.ts:32` (runs `#foregroundNavigationUsesRealGpsAndReleasesNativeWatches`, args `mapsRegional`,`mapsNavigation`); `scripts/maps/test-native-recovery.ts:40-42` (runs `#deniedLocationAllowsManualOriginAndExplicitPermissionRetry` / `#configuredGatewayFailureRecoversOnlyAfterExplicitRetry`, args `mapsPermission`/`mapsOutage`); both scripts are `CAMPAIGN_RUNNERS`. Not in `CLASS_REGISTRY`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-58 (+22-25) | T9/A7 | `nativeRegionalTransportCapabilitiesAndTile` and `realRegionalTilesSearchRoutesAndOutsideCoverage` are not selected by either Maps script (both pass `#method`), the class has no registry entry, so `--all` never passes `mapsRegional=1`; they always skip. `capture()` (L22-25) is used only by them; its PNGs are not collected by any script. | Delete both methods and `capture()`, or add a `#method` to `test-native-navigation.ts` if the regional tile/route proof is still wanted (owner). | Medium |
| 2 | 14-21, 59-73 | C3 | `js/waitFor/click/input/navigationPhase/watches` duplicated with `MapsBackgroundNavigationInstrumentedTest.java:24-60`. | `MapsTestDriver`. | Low |
| 3 | 37-47, 81-86, 136-138 | C3 | "Search Casino de Monte Carlo -> Directions -> Starting point 43.7384, 7.4246 -> wait 'no live traffic'" repeated 3x here and once in `MapsBackgroundNavigationInstrumentedTest:81-84`. | `MapsTestDriver.routeToCasino()`. | Low |
| 4 | 104-114 | C3 | Accessibility BFS for a permission button; same BFS in `NotesDocumentInstrumentedTest.nativeSave:77`. | Shared `AccessibilityClick.byIdSuffix/byText`. | Low |
| 5 | 100 | - | Trailing whitespace-only line. | Trim. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `navigationPhase` | helper | 59-65 | `MapsBackgroundNavigationInstrumentedTest.phase` | `MapsTestDriver` |
| `watches(int)` | helper | 66-73 | `MapsBackgroundNavigationInstrumentedTest.watches`, `MapsInstrumentedTest:73` | `MapsTestDriver` |
| `permissionButton` | helper | 104-114 | `NotesDocumentInstrumentedTest.nativeSave` | `AccessibilityClick` |
| `capture` | helper | 22-25 | none | delete |

## Proposed end state
Three campaign-driven methods (foreground navigation, denied location, gateway outage) on `MapsTestDriver`. About 85 lines.

## Verification
`node scripts/maps/test-native-navigation.ts` and `node scripts/maps/test-native-recovery.ts permission|outage` on an owned emulator with the regional gateway fixture.
