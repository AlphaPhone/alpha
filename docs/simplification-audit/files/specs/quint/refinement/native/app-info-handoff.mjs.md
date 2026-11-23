# specs/quint/refinement/native/app-info-handoff.mjs
- Lines: 64 | Kind: Quint refinement driver (Node) and shared source-preparation helper `withAppInfoSource` | Verdict: KEEP; SIMPLIFY
- Covers: model `NativeAppInfoHandoff` (live): App info opens for the personal or the exact work profile; disabled packages, paused/locked/unmapped/removed profiles, lookup/dispatch refusals. Duplicates: `test/quint-native-app-info-handoff.test.mjs` re-runs it (T4); `test/quint-app-info-handoff-composition.test.mjs` reuses `withAppInfoSource` for a composition check. Callers: `index.mjs:59`, those two tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 36-42 | B5 | Asserts the `eliza-system` module entry of `android/consumer-host.json`, the patch receipt and lock hashes before running (same block in `crash-journal.mjs`, `assistant-entry.mjs`, `action-recovery.mjs`). | One shared `assertPinnedUpstream` helper; drop the consumer-host deep-equal. | Low |
| 2 | 18-47 | — | `withAppInfoSource` is reused by the composition test; worth keeping as an export. | Keep. | — |
| 3 | 26-33 | B5 | Long hand-maintained receipt source list. | Shared helper. | Low |

## Proposed end state
Driver plus `withAppInfoSource`, about 40 lines after the shared pin/sources helpers; run once from the native aggregate.
