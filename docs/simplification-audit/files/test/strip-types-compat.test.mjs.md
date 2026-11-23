# test/strip-types-compat.test.mjs
- Lines: 31 | Kind: tooling (tests `test/support/strip-types.mjs` itself) | Verdict: DELETE (with the transplant helpers)
- Covers: The test-only TypeScript stripper handles enums, parameter properties and type-only imports on Node 26. Duplicates: none. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-31 | T5 | Tests test machinery; `strip-types.mjs` has ~217 importers today, all source transplants (T2) slated for deletion. | Delete when the last importer of `strip-types.mjs` goes; until then it is harmless but useless. | Low |

## Proposed end state
File deleted together with `test/support/strip-types.mjs` at the end of the transplant cleanup.
