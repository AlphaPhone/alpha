# test/ci-ruleset-readback.test.mjs
- Lines: 92 | Kind: tooling unit (imports `compareRequiredChecks`, `ghGet`, `repositoryFromRemote` from `scripts/ci/read-required-checks.ts`) + source-text (lines 17-28 regex the script and `scripts/owner/gh-readonly.ts`) + a real subprocess (stalled fake `gh`) | Verdict: KEEP lines 30-92 (move with the script to `test/tooling/owner-tools.test.ts`); DELETE 17-28
- Covers: the owner read-back of required-check rulesets reports missing, renamed, unbound, bypassable and weakened configurations, never treats an unreadable branch as a match, kills a stalled `gh`, and parses the origin remote. Duplicates: `test/owner-incident-response.test.mjs` also exercises `gh-readonly.ts`. Callers/importers: `npm test` glob; the script has no package.json or workflow caller (scripts research: owner tool, move to `scripts/owner/`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-28 | T1 | "Only issues GET requests" proven by regex over source text (`--method (?!GET)`, exact `console.log` line). | Delete; if the guarantee matters, `gh-readonly.ts` takes no method parameter (it already hard-codes GET) and that is visible in its signature. | Low |
| 2 | 30-42 | T8 | Spawns a fake `gh` that sleeps 30 s, with a 300 ms timeout. Fine, but leaves a `sleep` child if the kill fails. | Keep. | - |
| 3 | 44-92 | - | Comparison logic is the tool's whole value. | Keep. | - |
| 4 | 1 | A8 | "MVP-46" ticket reference. | Drop the tag. | None |

## Proposed end state
Moves with `read-required-checks.ts` to the owner-tool folder; the source-text GET check goes.
