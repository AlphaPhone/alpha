# specs/quint/refinement/application/files-filter.md
- Lines: 34 | Kind: prose note for a refinement campaign | Verdict: MERGE into the merged `files-browser.mjs` header, then delete
- Covers: scope of `FilesFilter`. Duplicates: harness `assumptions` (`files-filter.mjs:203-207`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-14 | A8 | Bug history ("A late rejected query previously erased..."). | Drop. | Low |
| 2 | 19, 32-34 | B5 | Schedule counts and run command. | Drop. | – |

## Proposed end state
No `.md`; two lines in the merged harness header.
