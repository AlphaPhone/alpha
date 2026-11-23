# specs/quint/refinement/application/canonical-calendar-draft-handoff.md
- Lines: 25 | Kind: model/harness prose | Verdict: KEEP (edit)
- Covers: describes `CanonicalCalendarDraftHandoff`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16 | A1 | "and unapproved legacy preservation" describes the legacy calendar preservation path deleted by D1/D4. | Remove the phrase together with the harness schedule and the model's `initWith(false)` test. | L |
| 2 | 10-11 | B5 | Exact counts ("Five source schedules and 44 checkpoints"). | Drop counts. | L |

## Proposed end state
Prose without the legacy-preservation clause or counts.
