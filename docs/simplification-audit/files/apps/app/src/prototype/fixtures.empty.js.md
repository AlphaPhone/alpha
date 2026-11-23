# apps/app/src/prototype/fixtures.empty.js
- Lines: 77 | Role: Production stand-in for `fixtures.js`: the same 53 export names with empty arrays/objects/null; `vite.config.ts:22` resolves every import of `./fixtures.js` to it unless `ELIZA_DEV_ALLOW_TEST_MOCKS=1`. | Verdict: SIMPLIFY + MOVE (with `fixtures.js` to `apps/app/src/dev/fixtures/`)
- Importers: none directly; reached through the Vite swap (`vite.config.ts:22`). Text/path pins: `test/browser/fixtures-empty-runtime.spec.ts:3,15`, `test/browser/shaw-ui-fixtures.spec.ts:73` (route rewrite to this path), `test/support/feature-parity.mjs:370`, `apps/app/src/prototype/README.md:18-25`, `mock-attention.ts` and `model.js` comments.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | A8 | "Export names must match ./fixtures.js exactly (test/fixtures-parity.test.mjs)" — that test does not exist (`ls test/fixtures-parity.test.mjs` fails; `git grep fixtures-parity` → this file and README only). Parity is enforced by Rollup failing on a missing named import in the production build | Reword: "The production build fails if a name is missing." Fix README.md:24-25 the same way (it also cites the missing `test/fixtures-swap.test.mjs`) | None |
| 2 | 69, 72 | A7 / A5 | `LOCK_SUM` (unused) and `HEADS` (dead heads-up) | Delete with `fixtures.js` #1/#2 | None |
| 3 | 51-54 | A3 | `WAL_*` | Delete with the Wallet decision | Owner decision |
| 4 | 1-77 | D6 / C5 | Hand-mirrored twin of `fixtures.js` | If `model.js` stops importing fixtures (fixture-only views and seeds move to a dev installer, research Q1), this file disappears entirely: production would import nothing from fixtures. Until then keep the mirror | Medium (depends on Q1) |

## Local types and helpers
None (53 constant exports, no helpers).

## Proposed end state
~70 lines (minus `LOCK_SUM`, `HEADS`; minus 4 `WAL_*` with the Wallet decision), corrected header, at `apps/app/src/dev/fixtures/fixtures.empty.js`. Deleted entirely if fixture seeding moves out of `model.js`.

## Verification
Production build without `ELIZA_DEV_ALLOW_TEST_MOCKS` (named-import parity), `scripts/audit-production-bundle.ts`, `test/browser/fixtures-empty-runtime.spec.ts`, `test/browser/shaw-ui-fixtures.spec.ts`.
