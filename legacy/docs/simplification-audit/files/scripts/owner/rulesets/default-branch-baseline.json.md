# scripts/owner/rulesets/default-branch-baseline.json
- Lines: 25 | Kind: data (GitHub repository ruleset draft) | Verdict: KEEP as owner reference, MOVE to `docs/owner/rulesets/`
- Covers: default branch requires a pull request with squash merge and zero required reviews. Duplicates: none. Callers/importers: only `test/owner-incident-response.test.mjs:181-183` (asserts its rule type and merge method).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | No script reads or applies it. | Move with the other drafts to `docs/owner/rulesets/`, or delete if applied (D12: repository settings are the owner's). | none |
| 2 | — | T1 | Its only test asserts constants of this file. | Delete the test case. | none |

## Proposed end state
Documentation-only draft next to the other two, no test.
