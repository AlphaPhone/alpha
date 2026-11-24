# test/quint-prepared-workflow-worker.test.mjs
- Lines: 31 | Kind: Quint wrapper (services index) + a tooling integration of `scripts/prepared-workflow-worker.ts` on a temp tree | Verdict: DELETE case 1; MERGE case 2 into `test/tooling/agent-build.test.mjs`
- Covers: prepared worker reuse and interrupted builds refine provenance admission (13 traces); a source tree without the generic workflow producer is refused before the producer runs, and no output is written. Duplicates: services index runs case 1. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 17-31 | — | Real script call on a temp directory, checks the error chain and that no output exists: a useful tooling test. | Move to the agent-build tooling file. | Low |

## Proposed end state
Case 2 lives with the agent-build tooling tests; this file is deleted.
