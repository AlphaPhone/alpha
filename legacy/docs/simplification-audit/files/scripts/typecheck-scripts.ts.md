# scripts/typecheck-scripts.ts
- Lines: 37 | Kind: script (typecheck wrapper that filters diagnostics) | Verdict: SIMPLIFY (KEEP the filter; correct the research "delete")
- Covers: `npm run typecheck:scripts` (run by `npm run typecheck`, `package.json:16,74`; README line 29). Duplicates: none. Callers: `package.json` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19–28 | — | Measured on this worktree (2026-11-11): unfiltered `tsc -p tsconfig.scripts.json` reports 214 errors, **200 of them in `vendor/eliza`** (pulled in because scripts import upstream `.ts`, e.g. `toolchain.ts:2`) and 14 in `scripts/test-*calendar*` files that other agents are editing. The filter is what keeps upstream type errors from failing Alpha's check; it cannot be deleted until upstream is clean under this config or scripts stop importing upstream `.ts`. | Keep the filter; narrow it to "drop `vendor/` and `.eliza/` paths" (explicit) instead of "keep only `scripts/`", so errors in `apps/`/`test/` files imported by scripts are no longer hidden. | Low: `npm run typecheck` already checks `apps/`, so most of those would be duplicates. |
| 2 | 30 | B4 | `compilerFailed` combines status sets and an empty-stdout heuristic. | `result.status !== 0 && result.status !== 2 && …` is not needed: treat any non-zero status with zero kept diagnostics and non-empty stdout as "filtered only"; anything else non-zero fails. Write it as two named booleans. | Low |
| 3 | 7 | — | Resolves `tsc` through `require.resolve`; `npx tsc` / `node_modules/.bin/tsc` is equivalent. | Optional. | None |

## Proposed end state
~20 lines: run tsc, drop diagnostics whose path starts with `vendor/` or `.eliza/` (with a comment naming why: upstream is type-checked upstream), print the rest, exit non-zero on any kept diagnostic or a compiler crash. Owner/upstream follow-up: report the 200 upstream errors so the filter can eventually go.
