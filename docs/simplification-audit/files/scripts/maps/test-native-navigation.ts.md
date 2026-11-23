# scripts/maps/test-native-navigation.ts
- Lines: 54 | Kind: emulator end-to-end campaign runner (installs APKs, drives `am instrument` for `MapsRegionalInstrumentedTest#foregroundNavigationUsesRealGpsAndReleasesNativeWatches` and `MapsBackgroundNavigationInstrumentedTest#screenOffGuidanceContinuesAndNotificationStopEndsOnce`, feeds `emu geo fix` by a phase-file handshake, needs a running regional gateway) | Verdict: MERGE with `test-native-recovery.ts` into `test/android/maps-regional-campaign.ts` (modes `navigation|permission|outage`)
- Covers: foreground guidance, off-route, arrival, watch cleanup and screen-off guidance with one notification Stop on an emulator using real Android location. Duplicates: shares adb `run`, APK digest/evidence record, permission snapshot/restore, phase polling loop and result writing with `test-native-recovery.ts` (~60 % of lines). Callers/importers: none executes it. Listed in `scripts/android-instrumentation.ts:313` `CAMPAIGN_RUNNERS` (only so the instrumentation reachability test counts those classes as reachable); named in a comment of `MapsBackgroundNavigationInstrumentedTest.java:16`. Not in any workflow or package.json script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A test in `scripts/`; never run by CI; its existence keeps two instrumentation classes "reachable". | Move to `test/android/` and merge with the recovery runner; document in README as a manual emulator campaign, or (owner) wire into an emulator workflow. | Low. |
| 2 | 10-13, 23-26, 48-52 | C5 | adb helpers, digest, evidence type, permission snapshot/restore duplicated with `test-native-recovery.ts`. | One runner with a mode table `{classes, permissions, phases, onPhase}`. | Low. |
| 3 | 12-13, 51 | B5 | APK sha256 and `result.json` evidence file nothing reads. | Drop; exit code and instrumentation log suffice. | None. |
| 4 | 35-43 | T8 | 700 ms fixed-interval phase polling with a 300 s deadline. Inherent to the file-handshake design; keep but share. | Share with recovery runner. | n/a |
| 5 | 26 | B3 | Permission state read by regex over `dumpsys` - less strict than the recovery runner's line parse (which also refuses fixed/one-time permissions). | Use the recovery runner's parser for both. | Low. |

## Proposed end state
One `test/android/maps-regional-campaign.ts` (~80 lines) with modes `navigation`, `permission`, `outage`; shared adb,
permission snapshot/restore and phase loop; no evidence hashing. `CAMPAIGN_RUNNERS` points at the new path. It remains an
emulator campaign: it does not prove device or AOSP-image behaviour (AGENTS.md).
