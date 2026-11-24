# scripts/ci/read-required-checks.ts
- Lines: 183 | Kind: owner tool (read-only GitHub ruleset read-back) | Verdict: MOVE to `scripts/owner/read-required-checks.ts`, SIMPLIFY
- Covers: reads the default branch's active rules, rulesets and classic protection with `gh api --method GET` and diffs the enforced required checks against `scripts/ci/required-checks-ruleset.json`; prints the command for the owner to install it. Duplicates: ruleset types also in `scripts/owner/read-branch-integrity.ts:25` (research C3 table). Callers/importers: no workflow, no package.json script; only `test/ci-ruleset-readback.test.mjs` (first test is T1 source-regex of this file and `owner/gh-readonly.ts`; the rest are unit tests of `compareRequiredChecks`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Owner tool in the CI folder; CI never runs it, so editing it today triggers the full `scripts/**` CI selection. | Move to `scripts/owner/` with the ruleset JSON. | Low. |
| 2 | 24-27 | D4 | `ghGet` wrapper re-exports `owner/gh-readonly.ghGet` with fixed options, exported only so the test can inject a fake `gh`. | Call `readGitHub` directly with the options. | None. |
| 3 | 46-71 | C1 | Local `Ruleset`/`Rule` interfaces duplicate `owner/read-branch-integrity.ts`. | Export once from `owner/gh-readonly.ts` (or a `github-types.ts`). | None. |
| 4 | 181 | D9 | `named(result)` detects "installed" by string-matching a problem message. | Return `installed: boolean` from `compareRequiredChecks`. | None. |
| 5 | test | T1 / T3 / T5 | `test/ci-ruleset-readback.test.mjs` checks source text and unit-tests an owner tool that gates no release. | Delete the test (see that file's report). | Low. |

## Proposed end state
`scripts/owner/read-required-checks.ts` (~150 lines) beside `required-checks-ruleset.json`, run by hand; no test pins its text.
