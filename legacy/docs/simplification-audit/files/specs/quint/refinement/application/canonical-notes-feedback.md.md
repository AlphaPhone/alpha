# specs/quint/refinement/application/canonical-notes-feedback.md
- Lines: 38 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CanonicalNotesFeedback`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21 | — | Source event -> modeled effect table is useful. | Keep. | — |
| 2 | 35-38 | B5 | TLC state counts and "155 checkpoints" are run receipts, not documentation (and the model is checked by Quint/Apalache, not TLC). | Delete the paragraph. | L |

## Proposed end state
Table plus scope sentence.
