# test/quint-files-recent-index.test.mjs
- Lines: 18 | Kind: Quint replay wrapper (`replayFilesRecentIndex`, `specs/quint/refinement/application/files-recent-index.mjs`) + two source-rewrite canaries | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: Files Recent and scan export (`prototype/scan-pdf.ts`, `files-index.ts`) follow FilesRecentIndex on accept/savedPdf/close/tree end (200 traces). Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | T4 (none) | Only execution of this model. | Register in the application index. | Low |
| 2 | 11-18 | T5, T10 | Two canaries rewrite `if(evicted!==filesIndex.open())` to `if(true)`/`if(false)`; 180 s each; break under Prettier. | Delete. | Medium |

## Proposed end state
Deleted; FilesRecentIndex runs from the application index.
