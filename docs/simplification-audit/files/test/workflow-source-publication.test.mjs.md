# test/workflow-source-publication.test.mjs
- Lines: 29 | Kind: unit of upstream code (imports `vendor/eliza/plugins/plugin-workflow/src/services/workflow-source-publication.ts` directly and runs it against a temp directory) | Verdict: DELETE
- Covers: upstream Android workflow source publication writes complete bytes under concurrency, keeps the inode, refuses symlinks, permissive files, abandoned or non-private reservations and writable parents. Duplicates: none in this repo; no upstream test file of that name found (`find vendor/eliza -name '*workflow-source-publication*'` returns only the source). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T5 | Re-tests vendor code from the product repo. | Delete; D14 upstream follow-up: add these cases to plugin-workflow's own tests. | Medium |

## Proposed end state
File deleted; listed in `cross-file-actions.md` upstream follow-ups so the coverage lands in `vendor/eliza` before the next pin advance.
