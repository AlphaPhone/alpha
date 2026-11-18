# specs/quint/refinement/application/canonical-calendar-draft.md
- Lines: 25 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CanonicalCalendarDraft`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B5 | "121 checkpoints in 17 schedules" (harness actually lists 17 cases; checkpoint count drifts). | Drop counts. | L |
| 2 | 15-16 | — | "cannot resume or export it": export is part of the deleted backup/export feature (D3) only if the recovery export path is removed; check `openDomainRecovery` scope. | Reword after D3 lands. | L |

## Proposed end state
Short prose without counts.
