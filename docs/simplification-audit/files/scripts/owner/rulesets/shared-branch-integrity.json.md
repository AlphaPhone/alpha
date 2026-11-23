# scripts/owner/rulesets/shared-branch-integrity.json
- Lines: 17 | Kind: data (GitHub repository ruleset draft) | Verdict: KEEP as owner reference, MOVE to `docs/owner/rulesets/`
- Covers: repo-level "Shared branch integrity" (no deletion, no force-push, signed commits) on default and `develop`, active. Duplicates: `alphacompute-org-shared-branch-integrity.json` (same name and rules, org scope, evaluate). Callers/importers: only `test/owner-incident-response.test.mjs:174-180`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C5 | Same ruleset as the org draft at a different scope; once the org ruleset is active (not evaluate) this one is redundant. | Owner question: keep one. | none |
| 2 | — | T1 | Only reader is a constant-asserting test. | Delete the test case. | none |

## Proposed end state
One ruleset draft (or none) under `docs/owner/rulesets/`; no test.
