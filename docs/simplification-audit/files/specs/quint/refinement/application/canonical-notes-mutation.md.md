# specs/quint/refinement/application/canonical-notes-mutation.md
- Lines: 45 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CanonicalNotesMutation`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T10 | "The existing editor compiler provides its read-only captured-save observer. No production code changes are needed." refers to the text patch in `canonical-notes-draft.mjs`. | Update when that harness is ported. | L |
| 2 | 9-10 | B5 | "Thirty-seven schedules compare 170 checkpoints." | Drop counts. | L |
| 3 | 24-27 | — | Documents two retained source behaviours (queued save can beat a dirty remove; successful delete closes an edited editor). Worth keeping; these are owner-visible behaviours. | Keep. | — |

## Proposed end state
Scope, the two retained behaviours, out-of-scope list.
