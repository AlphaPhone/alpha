# specs/quint/application/ScheduledTaskControls.qnt
- Lines: 157 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: One LifeOps scheduled task detail: reviewed exact request, retained intent locks until confirmed, terminal tasks only reopen, failed/partial lists disable or retire controls. Duplicates: ScheduledSnoozeAdmission (snooze instant). services manifest text references this model (`services/manifest.json:5002`). Callers/importers: `scheduled-task-controls.mjs` (aggregate) uses `test/fixtures/scheduled-task-controls.mjs`; also `test/scheduled-task-controls.test.mjs` (56 lines) + aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Fixture builds the real `automations-adapter.ts` + `automations-route-policy.ts` with esbuild (import-based); it also verifies staged `.eliza` bytes equal the pinned source and hashes inputs (B5). | Drop the staged-bytes/hash checks. | L |
| 2 | manifest | T10 | `sources` lists `prototype/template.html` and `vendor/eliza/packages/contracts/src/workflow-intents.ts`; the harness reads neither as text, so they only cause spurious re-runs. | Remove `template.html` from sources unless the fixture renders it. | L |
| 3 | 64,73 | D8 | Cron/day mapping written as single lines of 250+ characters. | Split into `pure def daysFor(cron)`, `timeFor(cron)`, `cronFor(time, days)`. | L |

## Proposed end state
- Keep; readable helpers for the cron mapping; trimmed sources; harness without provenance checks.
