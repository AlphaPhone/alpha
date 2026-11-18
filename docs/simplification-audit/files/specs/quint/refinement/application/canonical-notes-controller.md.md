# specs/quint/refinement/application/canonical-notes-controller.md
- Lines: 54 | Kind: model/harness prose | Verdict: KEEP (trim to ~15 lines)
- Covers: describes `CanonicalNotesController` and its source projection table. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-20 | — | The projection table is useful (model field -> source observation). | Keep. | — |
| 2 | 27-32, 44-54 | B5 | Counts ("Fourteen schedules", "seventeen modeled state fields") and long caveat paragraphs restating the harness `assumptions`. | Drop counts and duplicated caveats. | L |

## Proposed end state
Projection table plus a three-line scope note.
