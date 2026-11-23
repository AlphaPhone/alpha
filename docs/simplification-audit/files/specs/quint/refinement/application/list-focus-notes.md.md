# specs/quint/refinement/application/list-focus-notes.md
- Lines: 7 | Kind: harness documentation | Verdict: MERGE first paragraph into the header of `list-focus.mjs`; delete the rest
- Covers: describes the ListFocus campaign and where Alpha binds `createKeyedListFocus` (Notes, Photos). Duplicates: harness `assumptions`. Callers/importers: none (grep finds no reference; name does not match its harness `list-focus.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | A8 | "Historical local Files and launcher components are retained only in Git history" and the Files volume adapter "authenticated shared-source patch" sentence are history/unrelated context. | Delete. | — |
| 2 | 5 | — | The binding list (Notes semantic IDs, Photos media IDs) is useful for knowing what the helper protects. | Keep one line in the header. | — |

## Proposed end state
Two-line header in `list-focus.mjs`; this file deleted.
