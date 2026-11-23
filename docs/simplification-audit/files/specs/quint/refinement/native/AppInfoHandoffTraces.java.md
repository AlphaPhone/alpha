# specs/quint/refinement/native/AppInfoHandoffTraces.java
- Lines: 168 | Kind: Quint refinement driver (host-JVM; compiles the real `AlphaSystemPlugin` with closed Android/launcher ports) | Verdict: KEEP
- Covers: `openAppInfo` for personal and work-profile apps: disabled/removed packages, paused/locked/removed profiles, malformed arguments refused before lookup, `SecurityException` and dispatch refusals, no cross-profile fallback, NEW_TASK flag. Duplicates: projection logic duplicated in `AppInfoHandoffProbe.java`. Callers: `native/app-info-handoff.mjs:15`; tests `test/quint-native-app-info-handoff.test.mjs`, and indirectly the composition campaign.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-65 | T1-lite | Classifies replies by exact user-facing strings ("Choose an installed app", "This profile is no longer on the phone."). It does so on the real call result, so copy changes break the trace, which is intended (copy is part of the reply contract). | Keep; if copy churns, compare codes only. | Low |
| 2 | — | C5 | See `AppInfoHandoffProbe.java.md`: absorb the probe as a second `main` mode. | Merge. | Low |
| 3 | 144-167 | — | Clear scenario list; single JVM for all scenarios (state is per instance, not static). | Keep. | — |

## Proposed end state
Unchanged campaign plus an optional `probe` mode replacing `AppInfoHandoffProbe.java`.
