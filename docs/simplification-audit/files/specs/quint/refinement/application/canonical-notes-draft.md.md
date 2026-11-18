# specs/quint/refinement/application/canonical-notes-draft.md
- Lines: 39 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CanonicalNotesDraft`. Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-18 | T10 | Documents the build-time observer that patches upstream `notes-editor.ts` at a text marker ("The renderer source remains unchanged"). | Rewrite once the harness reads the captured save through a real export (see the `.mjs` report). | L |
| 2 | 20, 36-39 | B5 | Counts and an appended "final source run also checks..." history paragraph. | Fold into one scope sentence. | L |

## Proposed end state
Scope paragraph and the out-of-scope list; no counts.
