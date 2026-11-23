# scripts/ci/required-checks-ruleset.json
- Lines: 26 | Kind: config (intended GitHub ruleset for `main`) | Verdict: KEEP, MOVE with `read-required-checks.ts` to `scripts/owner/`
- Covers: the three required check names (`Repository verification`, `Browser MVP result`, `Android foundation result`) bound to GitHub Actions (integration 15368), installable with `gh api --method POST repos/<repo>/rulesets --input`. Duplicates: the check names are also the `name:` of jobs in `browser.yml`/`android.yml`. Callers/importers: `scripts/ci/read-required-checks.ts:22`; `test/ci-required-checks.test.mjs`, `test/ci-ruleset-readback.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-21 | P1 / D12 | Any CI restructuring that renames or splits these jobs must keep these three names (the ruleset is the owner's, D12). | When lanes are split, keep each workflow ending in the same aggregate job name via `required-result.ts`. | Medium: a rename blocks every merge. |

## Proposed end state
Unchanged content beside the owner read-back tool.
