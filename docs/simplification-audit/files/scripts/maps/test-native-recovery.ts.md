# scripts/maps/test-native-recovery.ts
- Lines: 77 | Kind: emulator end-to-end campaign runner (`MapsRegionalInstrumentedTest#deniedLocationAllowsManualOriginAndExplicitPermissionRetry` / `#configuredGatewayFailureRecoversOnlyAfterExplicitRetry`; pauses the owned gateway with SIGSTOP/SIGCONT for outage) | Verdict: MERGE into `test/android/maps-regional-campaign.ts` (with `test-native-navigation.ts`)
- Covers: denied location falls back to manual origin with an explicit retry; a gateway outage recovers only after an explicit user retry, on an emulator. Duplicates: see `test-native-navigation.ts` (shared adb/permission/phase/evidence code). Callers/importers: none executes it; listed in `scripts/android-instrumentation.ts:314` `CAMPAIGN_RUNNERS`. Not in any workflow or package.json script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Test in `scripts/`, never run by CI. | Merge + move as above. | Low. |
| 2 | 15-22 | B3 | Outage mode validates the supplied PID via `ps`/`lsof` (uid, listener on 47850, command path, cwd) before sending SIGSTOP. This is a real safety check (it signals a process by PID), keep it, but it makes the runner macOS/Linux-`lsof` specific. | KEEP in the merged runner; alternatively let the runner start its own gateway child and pause that, removing the PID argument and the check. | Low. |
| 3 | 12-13, 74 | B5 | APK digests and `result.json` with no consumer. | Drop. | None. |
| 4 | 21, 47 | D8 | Typos in error strings (`on47850`, `bounded25seconds`). | Fix when merging. | None. |

## Proposed end state
Folded into `test/android/maps-regional-campaign.ts` as the `permission` and `outage` modes; preferably the runner owns
the gateway child it pauses. Manual emulator campaign, documented.
