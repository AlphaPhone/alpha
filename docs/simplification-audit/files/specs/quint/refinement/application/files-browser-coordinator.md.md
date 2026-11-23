# specs/quint/refinement/application/files-browser-coordinator.md
- Lines: 35 | Kind: prose note for a refinement campaign | Verdict: MERGE into the merged Files harness header (2-3 lines), then delete
- Covers: scope of `FilesBrowserController` (access/volume readback, folder generations, agent share admission). Duplicates: harness `assumptions` (`files-browser-coordinator.mjs:159-162`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-25 | A8 | Narrates a pre-fix bug and "the pinned client patch" (history). | Drop; the model's invariants state the rule. | Low |
| 2 | 1, 3 | D11 | File is named "coordinator", the model is `FilesBrowserController`. | Moot once merged. | – |
| 3 | 10 | B5 | "Thirteen schedules"; the harness has fourteen. Already stale. | Drop counts. | – |

## Proposed end state
No `.md`. A short header in `files-browser.mjs` (see the `files-browser-coordinator.mjs` report) lists what is real and what is a port.
