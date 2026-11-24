# test/browser/dev-workflow-concurrency.spec.ts
- Lines: 21 (11 KB) | Kind: Playwright, chromium; local workflow simulator scheduling/locking with fake clock and stub transport | Verdict: DELETE
- Covers: simulator runs queue behind pickup waits, serialize Notes writes and agent generation under dev resource locks (`alpha.dev.workflow-resource.notes|agent`), and keep every run's history. Duplicates: none outside the simulator. Callers: chromium only. Helpers: `app-navigation.ts`, `helpers/legacy-notes.ts`, `cloud-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | P7 | Dev-only executor; in-page speech engine fake built in `addInitScript`. | Delete with the simulator. | Low. |
| 2 | 18-21 | C6, T6 | Holds Web Locks by literal simulator lock names. | Gone. | None. |
| 3 | 14-15 | A1 | Notes results read from the legacy store. | Breaks with A2. | — |
| 4 | 17 | T8 | `expect.poll(...,{timeout:20000})` for 10 queued pickups; one sleep (metrics w1). | Gone. | None. |
| 5 | 15 | D2, P3 | `concurrentApi` grabbed through a `Component.prototype.api` patch. | Gone. | None. |

## Proposed end state
Deleted with the local workflow simulator.
