# specs/quint/legacy/core/migration-report.md
- Lines: 411 | Kind: formal-spec documentation (historical conversion plan/inventory) | Verdict: DELETE
- Covers: the plan and inventory for translating 16 upstream TLA+ modules / 31 TLC configs (upstream revision `4787d51…`) into `Core*.qnt`, with per-module state, definitions, constants, invariants and SHA-256s; plus "parallel implementation plan" and a checkpoint note.
- Duplicates: hashes and profile data duplicated in `legacy/core/source-inventory.json` and `legacy/manifest.json`. Callers/importers: linked only from `specs/quint/legacy/core/README.md:3`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A8 | Cites an archive at `/tmp/alpha-core-tla-4787` that does not exist in the repo. | Delete. | None |
| 2 | 368-379 | A8 | A work plan ("parallel implementation plan", "no conversion has been claimed complete") — changelog/tombstone, not a description of current code. | Delete. | None |
| 3 | all | P6 | Entire document describes historical upstream specifications that upstream itself has retired. | Delete with legacy tree. | None |

## Proposed end state
Deleted; git history keeps it.
