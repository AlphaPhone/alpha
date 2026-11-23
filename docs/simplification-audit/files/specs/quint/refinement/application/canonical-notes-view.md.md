# specs/quint/refinement/application/canonical-notes-view.md
- Lines: 43 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CanonicalNotesView`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-21 | T10 | Describes "read-only build-time observer calls" injected at source seams and "rejects a changed source seam". | Rewrite after the port (product exposes an observer hook or the harness observes through `paint()`). | L |
| 2 | 6-7 | B5 | Counts ("thirty source schedules and 291 checkpoints"). | Drop. | L |

## Proposed end state
Scope paragraph, what the projection compares, out-of-scope list.
