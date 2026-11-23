# specs/quint/refinement/application/google-calendar-access-choice.md
- Lines: 23 | Kind: prose note for a refinement campaign | Verdict: MERGE into `google-calendar-access-choice.mjs` header, then delete
- Covers: scope of `GoogleCalendarAccessChoice`. Duplicates: harness `assumptions` (lines 205-208). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | B5 | "118 checkpoints across 17 schedules". | Drop counts. | – |
| 2 | 21-23 | – | Run command. | Drop. | – |

## Proposed end state
No `.md`; two header lines in the harness.
