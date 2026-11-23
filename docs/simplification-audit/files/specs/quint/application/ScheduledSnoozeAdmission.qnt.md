# specs/quint/application/ScheduledSnoozeAdmission.qnt
- Lines: 66 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Workflow snooze computes one explicit future instant before the exact protocol call; only an exact receipt confirms. Duplicates: ScheduledTaskControls (snooze review verb) at the UI level. Callers/importers: `scheduled-snooze-admission.mjs` (aggregate) <- `test/quint-scheduled-snooze-admission.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-26 | - | `advance(minutes)` only requires `minutes >= 0`; clock is unbounded across steps (simulation is fine, the state space is not finite). | Bound `s.clock` (e.g. `s.clock < 3000`) so symbolic `quint verify` terminates. | L |
| 2 | harness | B5 | Import-based (`buildSync` of `automations-protocol.ts` + `workflow-local-time.ts`), but asserts `.eliza/client-features/.source.json` baseCommit equals `upstream.lock.json` (`:29-30`). | Drop the provenance assert; `prepare-client-features` owns that. | L |

## Proposed end state
- Keep; bound the clock; harness without provenance check.
