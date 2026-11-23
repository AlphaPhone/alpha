# scripts/test-workflow-compiler.ts
- Lines: 44 | Kind: integration (copies the packaged workflow compiler from the verified worker artifact and runs the production checker's compiler program on 12 sources under Bun) | Verdict: KEEP, MOVE to `test/resident/workflow-compiler.test.ts` (keep npm alias), PORT the program extraction
- Covers: the shipped compiler accepts a valid reviewed workflow and rejects unsupported smthrs exports/subpaths, type errors, bad default export, `@ts-nocheck`, dynamic import and `/// <reference>`; drafts are never executed. Duplicates: none in Alpha. Callers/importers: `package.json` `agent:test-workflow-compiler`; `.github/workflows/resident-android.yml:313` (`compiler-flow` phase).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | T10 | Regex-slices the `const COMPILER_PROGRAM = String.raw` template literal out of upstream `workflow-source-check.ts`. | Import the constant if upstream exports it; otherwise upstream follow-up (D14) to export it, then import. | Low |
| 2 | 41-43 | B5 | Prints per-case "passed" and an artifact summary JSON. | `test()` per case; drop the summary. | None |

## Proposed end state
~35 lines in `test/resident/`, one `test()` per case, compiler program imported, same CI phase.
