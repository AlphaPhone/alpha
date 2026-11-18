# scripts/ci/run-browser.ts
- Lines: 19 | Kind: CI script (run selected Playwright specs) | Verdict: KEEP, SIMPLIFY (or MERGE into `affected.ts` as a subcommand)
- Covers: reads `ALPHA_CI_BROWSER_SPECS` (JSON list from `affected.ts`), validates each path, escapes it into an anchored Playwright file regex and runs `npm run test:browser -- <selectors> <extra>` without a shell. Duplicates: none. Callers/importers: `.github/workflows/browser.yml:176` only (no test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | B3 | Re-validates a list that `affected.ts` produced in the same workflow (shape regex, `..`, `existsSync`). The escaping/anchoring (11) is the necessary part (Playwright treats file args as regexes). | Keep the escaping; reduce validation to `Array.isArray` + string check, or have `affected.ts` emit the anchored selectors directly and delete this file. | Low. |
| 2 | all | P1 | When CI becomes journey-spec lanes (~35 specs), selection may be per-area project rather than per file. | Revisit with the browser lane redesign. | — |

## Proposed end state
Either a 10-line runner or a `node scripts/ci/affected.ts run-browser` subcommand; same selectors.
