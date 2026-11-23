# scripts/owner/rulesets/alphacompute-org-shared-branch-integrity.json
- Lines: 29 | Kind: data (GitHub organisation ruleset draft) | Verdict: KEEP as owner reference, MOVE to `docs/owner/rulesets/`
- Covers: org-wide "Shared branch integrity" ruleset (no deletion, no force-push, signed commits) for default/develop/dev/staging/next/enterprise in every repo, `enforcement: "evaluate"`. Duplicates: same name and rules as `shared-branch-integrity.json` (repo scope, active). Callers/importers: only `test/owner-incident-response.test.mjs:174-180` (reads the file and asserts its own constants). No script applies it; `scripts/owner/read-branch-integrity.ts` and `scripts/ci/read-required-checks.ts` read live rulesets from the GitHub API, not this file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Not executable input to any script; it is a paste-in draft for the owner. Living under `scripts/` implies tooling consumes it. | Move the three ruleset drafts to `docs/owner/rulesets/` (or delete if already applied on GitHub). | none |
| 2 | — | T1/T5 | The only reader is a test that asserts the JSON contains the values it contains (rule types, empty bypass list, branch include). | Delete that test case (`ruleset drafts block force-push…`). | none |
| 3 | 4, 13-21 | — | Organisation scope with `evaluate` enforcement and branch names (`dev`, `staging`, `next`, `enterprise`) that do not exist in this repo; it is org policy, not this product's. | Owner question: is it applied? If yes, GitHub is the record and the file can go. | none |

## Proposed end state
Either deleted (GitHub is the source of truth, D12) or kept as documentation under `docs/owner/rulesets/` with no test.
