# specs/quint/refinement/native/google-browser-return-claim.md
- Lines: 26 | Kind: harness documentation (model scope and run command) | Verdict: MERGE into `specs/quint/refinement/native/README.md`
- Covers: describes the `GoogleBrowserReturnClaim` campaign scope and bounds; command `node --test test/quint-google-browser-return-claim.test.mjs` (file exists). Duplicates: the model's manifest entry and the harness assumption strings say the same things. Callers/importers: none (no link from README, manifest or any file; grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | A8 | Hard-coded counts ("121 checkpoints in 23 schedules") drift silently with the harness. | Drop the counts. | None |
| 2 | whole | C7 | Five per-harness `.md` files sit beside a 270-line README in the same folder; this one is unreferenced. | One row in README's model table; delete the file. | None |

## Proposed end state
A README row naming the model, the entry points, what stays external, and the test command.
