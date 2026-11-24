# test/resident-build-output.test.mjs
- Lines: 32 | Kind: tooling of upstream config (runs `tsc --noCheck` over `vendor/eliza/plugins/plugin-knowledge/tsconfig.build.json` in a temp tree) | Verdict: DELETE
- Covers: upstream knowledge plugin declaration emit excludes `*.stories.*` so it does not write into `packages/ui`. Duplicates: none here; belongs to upstream CI. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-32 | T5 | Tests `vendor/eliza` build configuration, not Alpha code; a tsc run per `npm test`. | Delete; list as upstream follow-up (D14). | Low |

## Proposed end state
File deleted; upstream follow-up: "plugin-knowledge tsconfig.build excludes stories" test in `vendor/eliza`.
