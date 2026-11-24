# apps/app/src/runtime/clock-agent-review.ts
- Lines: 6 | Role: creates the one upstream Clock review executor bound to the `AlphaActionJournal` plugin and exports its `retire`/`review` | Verdict: MERGE into `apps/app/src/runtime/clock-contract.ts` (one `clock.ts` binding module with clock-handoff-history)
- Importers: prototype/agent-adapter.ts (`reviewAgentClock`), runtime/connection-ui.tsx (`retireClockReviews`). Text/path pins: `test/browser/agent-clock-handoff.spec.ts:161,168` (in-page import of `/src/runtime/clock-agent-review.ts`), `scripts/ci/pending-recovery-ui.py` (mentions name), feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6 | D4 | Near-shim: three statements around upstream `createClockReviewExecutor` (research P10). | Merge into the Clock binding module. | Low (update the Playwright in-page import path). |
| 2 | 4 | C2 | `registerPlugin<ClockReviewBridge>('AlphaActionJournal')`; the same plugin is typed again at connection-ui.tsx:503 (`ActionJournal`). | One typed `AlphaActionJournal` plugin module. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AlphaActionJournal` plugin handle | const | 4 | connection-ui.tsx:503 | typed plugin module |

## Proposed end state
File removed; 3 lines in `clock.ts`.

## Verification
`test/browser/agent-clock-handoff.spec.ts`, connection-ui retirement on owner change.
