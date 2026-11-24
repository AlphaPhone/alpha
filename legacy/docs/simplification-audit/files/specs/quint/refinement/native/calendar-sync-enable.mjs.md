# specs/quint/refinement/native/calendar-sync-enable.mjs
- Lines: 54 | Kind: Quint refinement driver (Node) with a CLI `--observe` mode | Verdict: KEEP (D18); SIMPLIFY
- Covers: model `NativeCalendarSyncEnable`: consent/enable/pause races against the CAS journal read, pause retries/exhaustion, fresh enable after pause. 9 scenarios. Duplicates: `test/quint-native-calendar-sync-enable.test.mjs` (T4); host tests `test/calendar-sync-mutation.test.mjs` cover mutation, not consent. Callers: `index.mjs:66`, that test; `generateCalendarSyncEnableTraces` exported.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46-54 | A7 | CLI entry with `--observe` printing raw traces: a developer convenience; `grep -r "calendar-sync-enable.mjs --observe"` finds no caller. | Delete the CLI block (keep `generateCalendarSyncEnableTraces` export only if another file imports it; grep shows none outside this file). | Low |
| 2 | 25 | B5 | Re-checks staged/pinned hashes computed by the platform. | Shared pin helper. | Low |

## Proposed end state
About 35 lines: scenarios, campaign, `checkTraces`. Retired together with the model if the owner retires Android Calendar sync.
