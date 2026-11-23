# test/scripts-typescript.test.mjs
- Lines: 18 | Kind: inventory / lint (git ls-files `scripts`; no `.js/.mjs`; each `.ts` strips on Node; no `@ts-nocheck`) | Verdict: DELETE
- Covers: tooling stays TypeScript and type-strippable. Duplicates: `npm run typecheck:scripts` (`scripts/typecheck-scripts.ts`, `tsconfig.scripts.json`); every script run under `node` fails fast if it cannot strip. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-18 | T1/T5 | Reads every script's text and regex-checks it: a lint rule, not behaviour. | Delete; if the `@ts-nocheck` ban matters, add it to `typecheck-scripts.ts` (one `git grep`). | Low |

## Proposed end state
File deleted; the suppression ban (if kept) lives in `scripts/typecheck-scripts.ts`.
