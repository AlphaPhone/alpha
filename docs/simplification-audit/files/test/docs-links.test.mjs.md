# test/docs-links.test.mjs
- Lines: 114 | Kind: tooling/lint (reads `README.md` and `docs/prd.md`, checks every `scripts/...` path exists here or under `vendor/eliza` and every `npm run X` names a package.json script; plus a retired-wording blacklist and two tests of its own helpers) | Verdict: MOVE tests 3-4 to a docs lint (`scripts/check-doc-references.ts`, run by `npm run verify` on doc/package.json/scripts changes); DELETE tests 1, 2, 5
- Covers: README/PRD do not name scripts or npm commands that no longer exist. Duplicates: none. Callers/importers: `npm test`. Research row 719 (source text, delete) undersells it: it reads docs, not product source, and is valuable during this cleanup because many scripts are being deleted.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-67 | T5 | Tests of the file's own exported helpers (`scriptReferences`, `vendorRelativeInContext`). | Delete. | None. |
| 2 | 69-90 | T9 | A docs lint living in the test suite; it is not a behaviour test. Useful while scripts are deleted. | Move to a lint script; run it in the docs/scripts lane of the path matrix. | Low. |
| 3 | 92-114 | A8 | Blacklist of retired wording ("smoke lane", "Cloud-only execution"...): a tombstone list that grows forever. | Delete. | None. |
| 4 | 19-25 | - | `git ls-files` over the whole vendor checkout (large output, 256 MiB buffer) on every run. | Only when a reference is not found locally (already lazy); keep lazy. | None. |
| 5 | 28-51 | D7 | Exports from a test file. | Becomes the lint's own code. | None. |

## Proposed end state
`scripts/check-doc-references.ts` (about 40 lines: extract, resolve, print `file:line` failures, exit 1), invoked by
`npm run verify` when `README.md`, `docs/**`, `package.json` or `scripts/**` change. Test file deleted.
