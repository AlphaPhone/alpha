# apps/app/src/prototype/README.md
- Lines: 46 | Role: developer documentation for the renderer core (`dc-lite.js`, `model.js`, `template.html`, `prototype.css`), the fixture/empty-fixture swap, and the design-source and image licensing record | Verdict: SIMPLIFY (fix stale references)
- Importers: none (documentation). Referenced by licenses/README.md:115 ("their licensing is recorded in `apps/app/src/prototype/README.md`") — the licensing section must stay here or that pointer must move with it.
- Text/path pins: licenses/README.md:115 only. No test reads it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-26 | A8 | "`test/fixtures-parity.test.mjs` keeps the two export lists identical, and `test/fixtures-swap.test.mjs` builds the swapped bundle" — neither file exists (deleted in commit 8b88486c9 "Keep integration coverage and remove redundant CI work"). The swap is now covered by test/browser/fixtures-empty-runtime.spec.ts and `scripts/audit-production-bundle.ts` | Replace the sentence with the current guards (fixtures-empty-runtime.spec.ts, audit-production-bundle.ts) | None |
| 2 | 33 | A8 | "The supplied references remain under the repository's `design` directory." — no `design/` directory exists (git ls-files: 0 entries) | Delete the sentence, or name where the design HTML now lives if the owner moved it | None |
| 3 | 11-15 | A3, A5 | The fixture inventory lists "wallet cards and passes" (Wallet deferred, AP-13) and "the heads-up banner" (research prototype P8: unreachable) | Update the list when those features are removed | None |
| 4 | 1-7 | D11 | The folder is named `prototype/` but holds the production renderer core; the README calls it "Product presentation" | No README change alone; tracked as the D11 folder rename | — |
| 5 | 28-46 | — | Licensing/provenance of design images and fonts is real compliance information | Keep (or move into licenses/README.md and leave a one-line pointer here) | — |

## Local types and helpers
None (documentation).

## Proposed end state
~40 lines: same sections, stale test names and the `design` directory reference removed, fixture list matching what fixtures.js actually holds.

## Verification
None automated. After editing, confirm licenses/README.md:115 still points at a section that exists.
