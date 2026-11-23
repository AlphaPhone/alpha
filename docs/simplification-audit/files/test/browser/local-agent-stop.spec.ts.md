# test/browser/local-agent-stop.spec.ts
- Lines: 115 | Kind: Playwright connection spec, `chromium`, 2 tests (`confirmed`, `incomplete-timeout`); real chooser and controller over a hand-written Capacitor fake plus `resident-agent-plugin.ts`; `page.clock.install()` mid-test | Verdict: MERGE into `journeys/connection-cloud.spec.ts`
- Covers: Restart local agent (P-43) waits for confirmed native shutdown (state stopped, service and socket down) before starting again, and reports "Not confirmed" after 30 s without leaving the agent stopped. Duplicates: `journey-core-loops.production.spec.ts:235` (loop A restart restores the conversation, not the shutdown confirmation). Callers/importers: none; imports `openConnectionDiagnostics`, `installResidentAgentPlugin`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-67 | T7, C3 | Hand-written Capacitor object; `AlphaConnection` slot handling copied from `local-agent-availability.spec.ts`; mis-indented header lines 20-21, 30-31. | Shared resident bridge fixture with a `status` setter. | Low. |
| 2 | 79, 91-105 | T8 | `page.clock.install()` after load, then `runFor` loops up to 40 × 500 ms while the new start's real promises race the fake clock. | Install the clock before `goto`, or give the poll interval to the fixture and wait on the "Restarting" → closed transition. | Medium: the second scenario relies on the 30 s timeout. |
| 3 | 85-95 | - | The three partial-shutdown states (service or socket still up) are the real protection. | Carry. | - |

## Proposed end state
`journeys/connection-cloud.spec.ts` "Restart local agent" test with two steps (partial shutdown keeps waiting then restarts; no confirmation within the limit shows Not confirmed), on the shared resident fixture with one clock policy.
