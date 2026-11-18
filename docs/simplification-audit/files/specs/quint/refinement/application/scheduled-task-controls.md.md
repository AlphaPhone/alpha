# specs/quint/refinement/application/scheduled-task-controls.md
- Lines: 30 | Kind: harness narrative note | Verdict: DELETE (first paragraph → `ScheduledTaskControls.qnt` header)
- Covers: what the Workflows scheduled-task controls do, six failures found at baseline `38c997d5ca`, harness scope. Duplicates: `scheduled-task-controls.mjs:119-125` assumptions. Callers/importers: none outside `docs/`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | A8 | Baseline bug list ("exposed six failures… now uses…"). | Delete. | None |
| 2 | 1-7 | — | Useful one-paragraph behaviour summary. | Move to the `.qnt` header. | None |
| 3 | 19-30 | T4 | Restates assumptions. | Delete. | None |

## Proposed end state
File deleted; behaviour paragraph lives in the model header.
