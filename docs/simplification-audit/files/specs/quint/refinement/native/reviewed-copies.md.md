# specs/quint/refinement/native/reviewed-copies.md
- Lines: 32 | Kind: harness narrative doc | Verdict: MERGE into `specs/quint/refinement/native/README.md` (trim)
- Covers: Explains the `ReviewedCopies` attachment-cache model and harness: executed sources (`ReviewedCopies.java`, `AlphaMailFileProvider.java`, pinned `ReviewedFileHandoff.java`), scenarios and remaining obligations. Duplicates: the directory has six such `.md` files plus `README.md`. Callers/importers: none (`git grep reviewed-copies.md` finds no link).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-20 | A8 | "The previous source allowed…" narrates the bug history. | Delete; keep the current contract sentence. | None |
| 2 | 22 | — | Points at `test/quint-reviewed-copies-refinement.test.mjs`, which the test cleanup may fold into an aggregate refinement test. | Update or drop the run line. | None |
| 3 | whole | C5 | Per-harness doc files nobody links. | One section in `README.md`. | None |

## Proposed end state
A ~12-line section in the directory README: model boundary table and external obligations.
