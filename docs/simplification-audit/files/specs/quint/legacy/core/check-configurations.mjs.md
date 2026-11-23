# specs/quint/legacy/core/check-configurations.mjs
- Lines: 217 | Kind: script (standalone Quint/TLC runner for historical configurations) | Verdict: DELETE
- Covers: typecheck/test/simulate/symbolic/temporal runs of the 16 legacy Core models per original TLC profile, after re-hashing upstream TLA+ from Git objects at the historical revision. Duplicates: `scripts/check-quint.ts` / `scripts/quint-lib.ts` already typecheck, test and simulate every manifest model including the legacy family. Callers/importers: none. `git grep check-configurations` hits only `legacy/core/README.md:21-23,56` (confirms research §2.10). Its `--metadata` inputs `interaction-metadata.json` and `lifecycle-metadata.json` are referenced by nothing else.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A7, T9 | No package.json script, workflow or test invokes it. | Delete, with `interaction-metadata.json`, `lifecycle-metadata.json`. | None. |
| 2 | 14-28 | C3 | Hand-rolled arg parser (14th twin), `sha256`/`hash`/`json` helpers duplicated across scripts. | Gone with the file. | None. |
| 3 | 96-110, 154-163, 205-212 | B5 | Hash inputs before and after, receipt JSON, `stable()` re-checks: evidence ceremony around a tool exit code. | Gone. | None. |
| 4 | 119-152 | — | Own process-group spawn/timeout/kill machinery, duplicated in `scripts/quint-lib.ts`. | Gone. | None. |

## Proposed end state
Deleted. `check-interactive-task-refinement.mjs` (which needs this runner's temporal receipt) is deleted with it.
